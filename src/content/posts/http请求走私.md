---
title: "http请求走私"
pubDatetime: 2025-01-20T21:06:41.000+08:00
description: "http请求走私"
tags: ["others"]
---
http请求走私产生的原因是
前端服务器将多个报文拼接发送给后端服务器，而前端服务器和后端服务器对请求报文终止线划分不同导致的（content-length和Transfer-Encoding: chunked）

具体见：

## http1.1
https://xz.aliyun.com/news/12672
https://www.freebuf.com/articles/web/243652.html
## http2 
协议降级情况下的请求走私
https://xz.aliyun.com/news/12691

