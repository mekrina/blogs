---
title: "Apache Camel CoAP 组件漏洞"
pubDatetime: 2025-01-20T00:00:00.000+08:00
description: "Apache Camel camel-coap 组件 CVE-2026-33453 漏洞记录"
tags: ["CVES"]
---
https://github.com/dinosn/CVE-2026-33453

# camel-coap组件 CVE-2026-33453
## 利用条件
Camel < 4.18.1 || Camel<4.14.6
应用（自己写的）中调用了 to("exec:...") 组件

![](assets/apache-camel/Pasted%20image%2020260509130314.png)

## 原理

没过滤 CamelExecCommandExecutable，CamelExecCommandArgs参数，当调用到to时，会先检查这两个参数，如果存在，会执行这个参数指定的命令，而不是exec中写的命令

DefaultExecBinding#readInput

## 修复
CoAPComponent#createEndpoint中加上filterStrategy，过滤掉这两个参数
CoAPEndpoint改继承于DefaultHeaderFilterStrategyEndpoint
在sink点再加上判断
