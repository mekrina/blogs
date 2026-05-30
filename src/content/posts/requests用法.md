---
title: "requests用法"
pubDatetime: 2025-01-20T00:00:00.000+08:00
description: "requests用法"
tags: ["others"]
---
## 发文件
```python
file = {
    "filename": ("hello.txt", io.BytesIO(b"hello"), "text/plain")
}
r = requests.post(url=url, params=params, files=file)
```
