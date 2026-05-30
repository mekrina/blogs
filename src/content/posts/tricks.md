---
title: "tricks"
pubDatetime: 2025-01-20T21:06:41.000+08:00
description: "tricks"
tags: ["tricks"]
---
## 参数名url

http，file，gopher协议
文件路径（urllib.open允许通过路径打开文件）
## 四字符rce
[hitcon2017 wp](https://xz.aliyun.com/news/1371)
## mysqldump获取所有数据库所有数据
（猜测账号密码为默认值）
mysqldump -u root -p root --all-databases

## ip伪造

出了X-Forwarded-For，还有client-ip

## 特殊字符
' ı ', 不等于i，但是大写等于大写的I，这在注册时过滤admin后转大写时，可以起到注册admin的作用

```javascript
for (var j = 'A'.charCodeAt(); j <= 'Z'.charCodeAt(); j++){
	var s = String.fromCodePoint(j);
	for (var i = 0; i < 0x10FFFF; i++) {
		var e = String.fromCodePoint(i);
		if (s == e.toUpperCase() && s != e) {
			document.write("char: "+e+"<br/>");
	};
}
};
```
## url编码绕过
当先过滤再url解码时有用
	比如网页有curl功能，访问file:///flag即可得到flag，但是flag被过滤了，这时可以利用url编码，file:///%66%6c%61%67，进行绕过。curl的时候由于可以访问url编码后的网页
浏览器搜索框和burpsuite会自动对url进行解码一次，因此在这二者中需要多编码一次。变成
file:///%2566%256c%2561%2567，即对%进行编码，其实编码第一个%即可，因为这样后端收到的就是 file:///%66lag 了，自然可以绕过。

2025/3/2 edit:

burpsuite和浏览器不会对url进行解码,而是访问php页面,存储到get或者post数组时会解码一次.
而$_SERVER['QUERY_STRING']不会进行解码

python中requests会自动对请求进行url编码(encode)

## python小众命令执行函数

```python
import profile
profile.run("__import__('os').system('calc')")

import distutils.spawn
distutils.spawn.spawn("calc")
```
