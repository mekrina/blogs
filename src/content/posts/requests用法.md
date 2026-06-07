---
title: requests用法
modDatetime: 2025-01-20T00:00:00.000+08:00
description: Python requests 文件上传、请求参数与常用调用方式记录
tags:
  - others
draft: true
---

## 发文件

```python
file = {
    "filename": ("hello.txt", io.BytesIO(b"hello"), "text/plain")
}
r = requests.post(url=url, params=params, files=file)
```
