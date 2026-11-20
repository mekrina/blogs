---
title: DataWave LAX Premium Black5A 评测
tags: 
  - aff
---



前两天入了一台 DataWave 的美西洛杉矶，昨晚十一点多（晚高峰尾巴）随手跑了遍 NodeQuality，数据比预想的能打，发出来给最近想找美西线路机的做个参考。

配置是 1C1G / 19G 盘，`666G / 1000M`，价格 368。

先放直达：`datawave.sh/console?affId=332`（带 AFF，介意可自行去掉后缀）

**线路是核心卖点。**

IPv4 三网回程给得很足：电信全程 CN2 GIA，上海延迟 130ms 左右，北广 155ms 上下；联通和移动回程都走 9929，联通 135~165ms，移动绕一下 160~180ms，但胜在走精品网，晚高峰稳得住不丢包。国际互联也还行，美西本地能跑满千兆。

**硬件没怎么缩水。**

CPU 给的 EPYC 7663，单核 GB5 直接跑了 1083 分，跑个加密转发或者挂个小站轻轻松松。1G 内存看体检没开气球回收和 KSM，宿主机目前没明显超开。硬盘 4K 做了点常规限速防邻居折腾，顺读 479MB/s，日常用完全够。

**缺点也直接说，省得踩坑：**

1. **IPv6 没优化。** 走的是普通 163 / 4837 / CMI，流媒体也基本全挂。到手建议直接禁掉 v6 或者设置 v4 优先，别让流量掉 v6 上。
2. **IP 纯净度一般。** v4 是香港广播到美国的机房 IP，ChatGPT 和 TikTok 是原生解锁，Netflix、YouTube、Disney+ 商家配了 DNS 解锁，看剧用 AI 都没问题；但 IPQS 风险分偏高，而且 Reddit 直接屏蔽。当线路机用完全OK



完整的 NodeQuality 体检报告放这了，自己看图说话：

[https://nodequality.com/r/cUG175tenklMw4sLaBnhuU5l0ehfyPRb](https://nodequality.com/r/cUG175tenklMw4sLaBnhuU5l0ehfyPRb)

最近缺一台美西主力或者中转机的可以考虑，有需要的话走个 AFF 支持一下：`datawave.sh/console?affId=332`