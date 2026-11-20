---
title: "RATEX学习笔记"
description: "渗透agent RATEX学习笔记与思考"
featured: true
tags: ["渗透", "Agent"]
---

## 架构

单一planner

多worker

planer提出多个下一步，worker并行的领取任务并执行

共享信息



## 与Cairn的不同之处

1. cairn每一个worker拿到的都是图的快照，不能实时共享信息
1. cairn每个intent产出一个fact，所有信息都放在一起，而ratex根据信息点分开。
