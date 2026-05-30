---
title: "nginx"
pubDatetime: 2025-01-20T00:00:00.000+08:00
description: "nginx"
tags: ["others"]
---
## nginx解析漏洞

访问http://wsl.my/test.phar是文本文件

而`http://wsl.my/test.phar/kkkkkkkkkkk/.php`
由于以.php结尾, 识别为php脚本
根据规则`fastcgi_split_path_info ^(.+?\.php)(/.*)$;`
将第一个括号内设置为`$fastcgi_script_name` => `test.phar/kkkkkkkkkkk/.php`
第二个匹配项设置为`$fastcgi_path_info` => `""`

这时**如果没有try_files**, 直接将改脚本传递给php-fpm

如果php-fpm开启了cgi.fix_pathinfo(默认开启)
则php又会识别script_name 为 test.phar, 剩下的是pathinfo

根据security.limit_extensions配置(默认包含.php和.phar, 虽然配置文件中说默认包含的只有.php), 允许执行test.phar文件

从而导致了与nginx配置不一致的行为
```
预期
执行.php结尾的文件

实际
执行了test.phar
```
