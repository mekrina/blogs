---
title: LDAP
draft: true
tags:
  - 
description: 
---

ldap是lightweight directory access protocol，轻量级目录访问服务。和数据库的定位类似，可以存账号数据等信息。

## 架构
### LDAP server
存放数据、维护目录树

```txt
dc=example,dc=com
├── ou=users
│   ├── uid=alice
│   └── uid=bob
└── ou=groups
    └── cn=admin
```

### LDAP Client
请求目录服务的客户端，如 Java程序、ldapsearch 命令

可以对目录服务做如下操作：
```txt
bind      登录 / 认证
search    查询
add       添加 Entry
modify    修改 Entry
delete    删除 Entry
unbind    断开连接
```

### DN
distinguished name, 节点的完整名称, 带路径 `uid=alice,ou=users,dc=example,dc=com`

RDN是节点本身的名字 `uid=alice`

### Entry
一个节点, 比如这个DN=`uid=alice,ou=users,dc=example,dc=com`

### ObjectClass
相当于节点类定义，决定节点可以有哪些属性

```yaml
objectClass: inetOrgPerson
objectClass: organizationalPerson
objectClass: person
```

### Attribute
节点的属性，比如上述节点的属性:

```yaml
uid: alice
cn: Alice Zhang
mail: alice@example.com
userPassword: xxxx
```

## 安全问题

### ldap注入

https://www.anquanke.com/post/id/212186
https://hacktricks.wiki/zh/pentesting-web/ldap-injection.html

类似SQL注入，常见使用：
```java
DirContext ctx = new InitialDirContext(env);  // 连接 + bind
String filter = "(uid=" + username + ")";
ctx.search(baseDN, filter, controls);         // 查询
result.getAttributes();                       // 读取属性
```
这里username直接拼到filter里面，如果用这个search的结果做登录，就可以用关键字比如`*`来绕过认证

### ldap JNDI

ldap可以通过两种方式保存java对象

1. 序列化数据 + 某些属性标记（反序列化利用）
2. Reference（远程or本地类加载）

具体见 [JNDI](./JNDI.md) 这篇 or [wh1t3p1g
大神这篇](https://www.anquanke.com/post/id/201181)