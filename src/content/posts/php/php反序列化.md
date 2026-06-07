---
title: "php反序列化"
modDatetime: 2025-01-20T21:06:41.000+08:00
description: "PHP 反序列化魔术方法、POP 链与利用技巧记录"
tags: ["php"]
---

知识回顾：
https://www.cnblogs.com/superwinner/p/17260940.html

\_\_construct 函数只有在 new的时候会被调用,反序列化不会自动调用.

protected的变量名前会有null\*null的标志，所以不能直接复制（null不会被复制下来）
![[Pasted image 20250120104527.png]]
private同理，会有null+类名+null前缀
![[Pasted image 20250120104649.png]]
可以先输出到文件里查看

见 [网鼎杯 AreUserializ](https://buuoj.cn/challenges#[%E7%BD%91%E9%BC%8E%E6%9D%AF%202020%20%E9%9D%92%E9%BE%99%E7%BB%84]AreUSerialz)

反序列化逃逸:

1. 数组变量中有`}`会导致序列化->反序列化之后得到的数组改变

绕过：

1. 正则：
   `/^O:[\d]/i`
   可以在object外面套一层array,同样可以触发

`/^[Oa]:[\d]/i` +号绕过,如 `O:+3...`
