---
title: "sink点"
modDatetime: 2025-01-20T00:00:00.000+08:00
description: "Java 安全审计中常见 sink 点与参数可控场景记录"
tags: ["java"]
---

## 实例化任意类，参数可控

`TrAXFilter`类，这个类存在于JDK中（已知JDK21仍然是这样）
初始化时，调用传入的`templates`的newTransformer()方法
![](assets/sink点/TrAXFilter.png)
这个函数可以触发字节码加载
![](assets/sink点/TemplatesImpl-newTransformer方法.png)

`newTransformer->getTransletInstance->defineTranslateClass->defineClass(bytecodes)`
或者加载字节码后实例化

![](assets/sink点/getTransletInstance.png)

## abc
