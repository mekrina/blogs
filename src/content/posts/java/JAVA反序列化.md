---
title: "JAVA反序列化利用链总结"
pubDatetime: 2025-08-05T22:56:50.000+08:00
description: "JAVA反序列化利用链总结"
tags: ["java","反序列化"]
---
## CC

### CC1 TransformedMap链

版本限制：

JDk <= jdk8u65
commons-collections <= 3.2.1

调用栈
```
/**
* ObjectInputStream.readObject()
*           AnnotationInvocationHandler.readObject()
*                 MapEnty.setValue()
*                    TransformedMap.checkSetValue()
*                       ChainedTransformer.transform()
*                          ConstantTransformer.transform()
*                          InvokerTransformer.transform()
*                             Method.invoke()
*                                Class.getMethod()
*                          InvokerTransformer.transform()
*                             Method.invoke()
*                                Runtime.getRuntime()
*                          InvokerTransformer.transform()
*                             Method.invoke()
*                                Runtime.exec()
*
*/
```


