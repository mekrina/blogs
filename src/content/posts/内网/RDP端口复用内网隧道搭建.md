---
author: mekrina
pubDatetime: 2026-06-03T13:31:20.000+08:00
modDatetime: 
title: 利用RDP端口复用内网隧道搭建
featured: false
draft: true
tags:
  - 内网, 隧道搭建, RDP
description: 在只能通过rdp连接目标机器，且目标机器不出完的情况下，利用RDP端口复用搭建内网隧道
---

当目标不出网，且入站连接只允许RDP时，可以通过RDP端口复用来进行隧道搭建

使用[rdp2tcp](https://github.com/V-E-O/rdp2tcp.git)

## 编译

make生成如下两个文件
1. client/rdp2tcp
2. server/rdp2tcp.exe

## xfreerdp连接

在kali执行
```bash
xfreerdp /v:10.201.202.91:23178 /u:administrator /p:Simplexue123 /cert:ignore /sec:rdp /rdp2tcp:/root/pentest/window
s/rdp2tcp/client/rdp2tcp
```
这里会用到client/rdp2tcp

然后把server/rdp2tcp.exe传上去

## 添加端口转发或socks隧道

运行tools/rdp2tcp.py
![alt text](../assets/image.png)

```bash
python tools/rdp2tcp.py add forward 127.0.0.1 8888 192.168.1.10 80 # 本地监听8888，转发到内网的80端口

python rdp2tcp.py add socks5 127.0.0.1 2266
```
