---
title: "flask session伪造"
pubDatetime: 2025-01-20T21:06:41.000+08:00
description: "flask session伪造"
tags: ["flask"]
---
flask框架中的session由三部分组成
```
# session示例
eyJhZG1pbiI6MH0.Z4TvGQ.6pZj4EsHiALdBjTc_STIl9XRU5Q
```
**第一部分**是base64编码的结果, 这里解码后就是
```
{"admin":0}
```
**第二部分** 时间戳，说明session时间长会过期
**第三部分** 
对数据和时间戳hmac

session工作流程
1. 用户访问，服务端给标示（如{"admin":0}）、uid，对这些数据进行认证，附加到session字符串中
2. 用户带着session字符串访问服务端，服务器对session进行认证，与原有mac进行比较。相同则认证成功。

解题流程
```shell
flask-unsign -d -c COOKIE
flask-unsign -s -c COOKIE --secret SECRET
```

或者用[GUI版](https://github.com/mekrina/flask-unsign-gui.git)
