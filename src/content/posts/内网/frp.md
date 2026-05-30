---
title: "frp"
pubDatetime: 2025-01-20T00:00:00.000+08:00
description: "frp"
tags: ["内网"]
---
[frp原理图解](frp原理.excalidraw.md)

## frps

vps上跑frps，配置如下，监听7000，等待注册客户端连接

```toml
bindPort = 7000
auth.token = "Admin123*"
```

## frpc

内网跑frpc, 连接frps，注册服务

```toml
serverAddr = "178.128.91.191"  # vps
serverPort = 7000
auth.token = "Admin123*"

[[proxies]]
name = "proxy-ssh"
type = "tcp"
localIP = "127.0.0.1"
localPort = 2333
remotePort = 6000

[[proxies]]
name = "internal_network_proxy"
type = "tcp"
remotePort = 10808
[proxies.plugin]
type = "socks5"
```

如上配置，frpc会请求frps监听6000、10808两个端口，当收到请求时，以相应proxy-name发给frpc。frpc收到请求后会根据proxy-name进行转发。

