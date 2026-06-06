---
title: "jwt伪造"
pubDatetime: 2025-01-20T21:06:41.000+08:00
description: "JWT 结构、签名绕过与伪造方式记录"
tags: ["jwt"]
---
## jwt的构成

xxx.xxx.xxx
第一部分标示算法等，第二部分是信息，二者均用base64编码
第三部分是签名（用第一部分的算法和私钥）

## 攻击手法

1. 未签名

所有的jwt都合法，任意修改数据

2. 允许使用none进行签名

把第一部分的算法改成`none`, 再丢弃最后的签名，随意篡改第二部分的信息

3. 弱密钥

`python jwt_tool.py "<JWT>" -C -d jwt-common.txt` 
其中`jwt-common.txt`是密钥字典

