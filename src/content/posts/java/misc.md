---
title: Java 杂项笔记
pubDatetime: 2025-01-20T00:00:00.000+08:00
description: Java 基础知识、常见 API 与安全相关杂项记录
tags:
  - java
draft: true
---
## java基础知识

==比较的是对象

"admin" == "admin" => true， 因为都来自常量池

"admin" == new String("admin") => false 不同对象

字符串比较用equals
