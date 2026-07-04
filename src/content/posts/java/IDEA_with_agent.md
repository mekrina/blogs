---
title: 利用idea中的agent插件分析项目以及jdk源码
draft: true
tags:
  - 
description: 
---

## 核心需求
1. agent分析的路径可直接跳转
2. 跳转的文件可以打断点命中
3. 不要当做项目源码编译

## 方案

### copy
copy一份源码副本，并把项目结构中jdk源码指向本项目内部的符号链接

### 符号链接？似乎不行

1. 项目中创建指向源码的符号链接

2. 项目结构中jdk源码指向本项目内部的符号链接

3. 使用agent进行分析，要求路径为相对项目根目录的路径，并使用markdown链接格式

这样就可以让Agent分析项目，并时刻给出可跳转的链接了，并且可以打断点调试。

4. 设置为不可写

```powershell
Get-ChildItem -LiteralPath "/path/to/src" -Recurse -File | ForEach-Object { $_.IsReadOnly = $true }
```