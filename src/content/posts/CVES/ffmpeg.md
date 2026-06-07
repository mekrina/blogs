---
author: mekrina
title: ffmpeg任意文件读漏洞
modDatetime: 2026-06-06T14:34:30.000+08:00
featured: false
draft: true
tags:
  -
description: ffmpeg任意文件读漏洞
---

FFmpeg可以处理HLS播放列表的特性，而播放列表可以引用外部文件，FFmpeg没有对后缀进行限制。通过在AVI文件中添加自定义的包含本地文件引用的HLS播放列表，可以触发该漏洞并在该文件播放过程中显示本地文件的内容。

在有上传视频处理功能的app中可能用到

https://github.com/neex/ffmpeg-avi-m3u-xbin
