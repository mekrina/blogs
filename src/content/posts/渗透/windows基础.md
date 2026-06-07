---
title: "windows基础"
modDatetime: 2025-01-20T00:00:00.000+08:00
description: "Windows 信息收集、权限判断与基础渗透命令记录"
tags: ["渗透"]
---

## 系统信息收集

systeminfo
echo %processor_architecture%

## 密码位置

SAM数据库中`C:\Windows\System32\config\SAM
域账户密码在域控的`C:\Windows\NTDS\NTDS.dit`

31d6cfe0d16ae931b73c59d7e0c089c0 是NTLM空密码哈希
aad3b435b51404eeaad3b435b51404ee 是LM空密码哈希

## 启用admin账户

```
net user administrator /active:yes
```

## rdp登陆

```
xfreerdp /v:10.49.149.61:3389 /u:Administrator /p:alqfna22 /cert:ignore [/sec:rdp]
```

## powershell监听端口

```
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any,8080)
$listener.Start()
$client = $listener.AcceptTcpClient()
```

## 测试网络连接

```
powershell -Command "test-netconnection 192.168.50.2 -port 4444"
```
