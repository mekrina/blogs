---
title: "neoreg"
pubDatetime: 2025-01-20T00:00:00.000+08:00
description: "neoreg"
tags: ["内网"]
---
```sh
python neoreg.py generate -k 'mekrina'
```

将生成的tunnel放到远程的web目录下，本地连接

```sh
python neoreg.py -u http://192.168.50.2:8001/tunnel.php -k 'mekrina'
```

然后本地的 1080端口就开启了一个socks5代理，通过这个代理的流量会经过webshell转发给内网。内网再转发