---
title: XFF IP伪造
modDatetime: 2025-01-20T00:00:00.000+08:00
description: 多层代理下X_Forwarded_For配置错误导致的请求IP地址伪造
tags:
  - others
---

## tcp连接ip无法伪造

因为需要三次握手，伪造了ip无法成功建立连接

## 多层代理下的配置错误

多层代理下需要通过 XFF 头获取用户的真实 IP

在如下架构下：

用户 -> CDN -> 代理1 -> 代理2 -> 后端app

CDN会将用户IP加到XFF后，代理1会将CDN IP加到XFF后..., 理想情况下XFF到达后端时应该是

`用户IP, CDN IP, 代理1 IP`

所以取出最左侧的就是用户IP

但用户如果自己构造了XFF头, 那么最左侧就是用户自定义的IP，从而导致伪造

## 修复方案

### 可信代理ip过滤

从右到左找到第一个不在代理ip范围的ip，就是用户ip。

```
# 1. 定义所有可信的 CDN IP 段（必须准确，防止攻击者绕过 CDN 直连）
set_real_ip_from  1.2.3.4/24;
set_real_ip_from  5.6.7.8/24;

# 2. 告诉 Nginx 从哪个 Header 获取 IP
real_ip_header    X-Forwarded-For;

# 3. 递归排除可信 IP，找到第一个“不可信”的 IP（即真实用户 IP）
real_ip_recursive on;

# 4. 传递给后端时，强制覆盖 XFF，确保后端拿到的就是干净的单个 IP
proxy_set_header X-Forwarded-For $remote_addr;
```

### 使用CDN提供的header

像`CF-Connecting-IP`，CDN会获取访问CDN的用户的IP并放入特定的请求头中。这个就是访问CDN的用户的真实IP

但此时必须禁止所有不来自CDN的流量

```
allow 103.21.244.0/22;
allow 103.22.200.0/22;
```
