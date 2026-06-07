# Ideas

## Post Date Cache

如果以后 `fetch-depth: 0` 让 GitHub Actions checkout 明显变慢，可以改成生成文章日期缓存文件。

思路：

- 新增缓存文件，例如 `src/content/post-dates.json`。
- 缓存每篇文章的发布时间和最后修改时间。
- 普通构建直接读取缓存，不需要每次拉完整 Git 历史。
- 有完整 Git 历史的本地环境或专门脚本负责更新缓存。
- 新文章没有缓存时，再 fallback 到当前 Git 能查到的时间或文件系统时间。

示例结构：

```json
{
  "redis.md": {
    "pubDatetime": "2025-01-20T12:00:00+08:00",
    "modDatetime": "2026-06-07T10:00:00+08:00"
  }
}
```

优点：

- GitHub Actions 可以恢复 shallow checkout，构建更快。
- Markdown frontmatter 不需要写时间。
- 时间集中管理，和文章正文解耦。
- 构建结果不依赖每次 checkout 的 Git 历史完整度。

缺点：

- 多一个缓存更新步骤。
- 如果忘记更新缓存，新文章时间会暂时走 fallback。
