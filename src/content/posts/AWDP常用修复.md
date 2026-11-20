# php
## 模式匹配
```php
if(preg_match("/php/", "test.php") == 1){
    die("waf");
}
```

## strpos
```php
$pos = strpos("phpabc", "php");
if($pos!==false){
    die(0);
}
```

## pathinfo
```php
<?php
$filename = "../../test.php";
$fileinfo = pathinfo($filename);
var_dump($fileinfo);
```

## str_replace
```php
<?php
$aaa = "abc.php\x00.txt";
$aaa = str_replace("\x00", "", $aaa);
```

## xss
```php
htmlspecialchars
```

# java

## 打包
```
jar -xvf app.jar

改依赖
BOOT-INF/classpath.idx

jar -cvfM0 patched.jar .
```

## 反序列化

resolveClass过滤类

黑名单 + 白名单
```java
package com.ctf.util;

import java.io.IOException;
import java.io.InputStream;
import java.io.InvalidClassException;
import java.io.ObjectInputStream;
import java.io.ObjectStreamClass;

/**
 * 强化版安全对象输入流
 * 采用“黑名单过滤关键类” + “白名单限制包名”的双重防御机制
 */
public class SafeObjectInputStream extends ObjectInputStream {
    public SafeObjectInputStream(InputStream in) throws IOException {
        super(in);
    }

    @Override
    protected Class<?> resolveClass(ObjectStreamClass desc) throws IOException, ClassNotFoundException {
        String className = desc.getName();

        // 1. 关键黑名单：拦截已知的 Gadget Chain 关键节点
        for (String deny : new String[]{
                // --- 基础执行与反射 (Transformer/Closure) ---
                "org.apache.commons.collections.functors",
                "org.apache.commons.collections.Transformer",
                "org.apache.commons.collections4.functors",
                "org.apache.commons.collections4.Transformer",
                "org.codehaus.groovy.runtime",
                "org.apache.commons.beanutils.BeanComparator",
                
                // --- 字节码加载与模板渲染 (TemplatesImpl) ---
                "com.sun.org.apache.xalan.internal.xsltc.trax.TemplatesImpl",
                "com.sun.org.apache.xalan.internal.xsltc.trax.TrAXFilter",
                "com.sun.org.apache.xalan.internal.xsltc.trax.TransformerImpl",
                "org.apache.xalan.xsltc.trax.TemplatesImpl",
                
                // --- JNDI 与 数据源 (JDBC/Ldap) ---
                "com.mchange.v2.c3p0",
                "com.zaxxer.hikari.HikariConfig",
                "org.apache.tomcat.dbcp.dbcp2.BasicDataSource",
                "org.apache.commons.dbcp2.BasicDataSource",
                "com.alibaba.druid.pool.DruidDataSource",
                "com.h2database",
                "com.h2",
                
                // --- 异常触发与容器 (Kick-off Gadgets) ---
                "javax.management.BadAttributeValueExpException",
                "org.aspectj.weaver.tools.cache.SimpleCache",
                "com.vaadin.data.util.NestedMethodProperty",
                "org.apache.click.control.Column",
                "org.jboss.interceptor.builder.MethodExpression",
                
                // --- 嵌套/二次反序列化载体 ---
                "java.security.SignedObject",
                "com.alibaba.fastjson.JSONArray",
                "com.alibaba.fastjson.JSONObject",
                "org.python.core.PyBytecode",
                
                // --- 网络与远程调用 ---
                "java.net.InetAddress",
                "java.rmi.server.RemoteObjectInvocationHandler",
                "java.rmi.server.UnicastRemoteObject",
                "javax.management.remote.rmi.RMIConnector",
                
                // --- 文件操作 ---
                "org.apache.commons.fileupload.disk.DiskFileItem",
                "org.apache.wicket.util.upload.DiskFileItem"
        }) {
            if (className.startsWith(deny)) {
                throw new InvalidClassException("Blocked potential malicious class: ", className);
            }
        }

        // 2. 严格白名单：仅允许 com.ctf 包、基本的 java 原生包以及字节数组 [B
        // 注意：白名单应放在黑名单之后，作为最后的兜底
        if (!className.startsWith("com.ctf.") && 
            !className.startsWith("java.lang.") && 
            !className.startsWith("java.util.") && 
            !className.equals("[B")) {
            
            // 如果你的业务需要特定的 java.util 类（如 HashMap, ArrayList），
            // 建议将 java. 限制得更细一些，防止被利用 java.security 等包下的类绕过。
            throw new InvalidClassException("Unauthorized class deserialization: ", className);
        }

        return super.resolveClass(desc);
    }
}
```

可以直接初始化

```java
ObjectInputStream ois = new ObjectInputStream(new ByteArrayInputStream(decode)) {
            @Override
            protected Class<?> resolveClass(ObjectStreamClass desc) throws IOException, ClassNotFoundException {
                String className = desc.getName();

                // 1. 关键黑名单：拦截已知的 Gadget Chain 关键节点
                for (String deny : new String[]{
                        // --- 基础执行与反射 (Transformer/Closure) ---
                        "org.apache.commons.collections.functors",
                        "org.apache.commons.collections.Transformer",
                        "org.apache.commons.collections4.functors",
                        "org.apache.commons.collections4.Transformer",
                        "org.codehaus.groovy.runtime",
                        "org.apache.commons.beanutils.BeanComparator",

                        // --- 字节码加载与模板渲染 (TemplatesImpl) ---
                        "com.sun.org.apache.xalan.internal.xsltc.trax.TemplatesImpl",
                        "com.sun.org.apache.xalan.internal.xsltc.trax.TrAXFilter",
                        "com.sun.org.apache.xalan.internal.xsltc.trax.TransformerImpl",
                        "org.apache.xalan.xsltc.trax.TemplatesImpl",

                        // --- JNDI 与 数据源 (JDBC/Ldap) ---
                        "com.mchange.v2.c3p0",
                        "com.zaxxer.hikari.HikariConfig",
                        "org.apache.tomcat.dbcp.dbcp2.BasicDataSource",
                        "org.apache.commons.dbcp2.BasicDataSource",
                        "com.alibaba.druid.pool.DruidDataSource",
                        "com.h2database",
                        "com.h2",

                        // --- 异常触发与容器 (Kick-off Gadgets) ---
                        "javax.management.BadAttributeValueExpException",
                        "org.aspectj.weaver.tools.cache.SimpleCache",
                        "com.vaadin.data.util.NestedMethodProperty",
                        "org.apache.click.control.Column",
                        "org.jboss.interceptor.builder.MethodExpression",

                        // --- 嵌套/二次反序列化载体 ---
                        "java.security.SignedObject",
                        "com.alibaba.fastjson.JSONArray",
                        "com.alibaba.fastjson.JSONObject",
                        "org.python.core.PyBytecode",

                        // --- 网络与远程调用 ---
                        "java.net.InetAddress",
                        "java.rmi.server.RemoteObjectInvocationHandler",
                        "java.rmi.server.UnicastRemoteObject",
                        "javax.management.remote.rmi.RMIConnector",

                        // --- 文件操作 ---
                        "org.apache.commons.fileupload.disk.DiskFileItem",
                        "org.apache.wicket.util.upload.DiskFileItem"
                }) {
                    if (className.startsWith(deny)) {
                        throw new InvalidClassException("Blocked potential malicious class: ", className);
                    }
                }

                // 2. 严格白名单：仅允许 com.ctf 包、基本的 java 原生包以及字节数组 [B
                // 注意：白名单应放在黑名单之后，作为最后的兜底
                if (!className.startsWith("com.example.demo.User") &&
                        !className.startsWith("java.lang.") &&
                        !className.startsWith("java.util.") &&
                        !className.equals("[B")) {

                    // 如果你的业务需要特定的 java.util 类（如 HashMap, ArrayList），
                    // 建议将 java. 限制得更细一些，防止被利用 java.security 等包下的类绕过。
                    throw new InvalidClassException("Unauthorized class deserialization: ", className);
                }

                return super.resolveClass(desc);
            }
        };
```
