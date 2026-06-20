---
title: CSRF
draft: true
tags:
  - 
description: 
---

## 定义、和XSS的关系

CSRF是在不读到数据的情况下，通过js代码**模拟**已经登陆某个网站（比如`bank.com`）的用户向该网站发送业务请求，从而冒充该用户的身份执行攻击者希望的操作（比如给攻击者转账）。可以通过部署钓鱼网站，等待用户访问网站，还可以通过点击劫持或诱导用户点击表单，也可以通过xss向合法网站A注入js代码，等待用户访问网站A触发js。

所以说，拥有XSS注入js能力是实现CSRF的一种手段。CSRF不一定要XSS

## 防护

### 限制Cookie

Cookie设置`SameSite=Strict`或者`Lax`, 当js跨域访问`bank.com`的时候，POST请求不带Cookie，也就没法冒充

### CSRF_TOKEN

`bank.com`给每个session生成一个随机CSRF_TOKEN，在正常网页表单中隐藏一个表项，值是后端生成的CSRF_TOKEN，正常提交的时候前端发送的token和后端的匹配，允许请求。如果是客户在访问`evil.com`的时候执行了js，由于CORS的存在，该js读不到响应内容，也就不知道对应的CSRF_TOKEN是什么，因此发送表单后会被后端拒绝。

值得注意的是，如果`bank.com`被XSS，那么是可以读到CSRF_TOKEN的，Cookie也是可以带上的，所以这两个防御都失效了。