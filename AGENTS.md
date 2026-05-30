# Repository Guidelines

## Commands
- Use `pnpm`; CI installs pnpm `11.3.0` and Node `24`, while `package.json` requires Node `>=22.12.0`.
- Install with `pnpm install --frozen-lockfile` when matching CI.
- CI order is `pnpm run lint`, `pnpm run format:check`, then `pnpm run build`.
- `pnpm run build` runs `astro check`, `astro build`, `pagefind --site dist`, then copies `dist/pagefind` to `public/pagefind`.
- There is no test script; use focused verification with `pnpm run lint`, `pnpm run format:check`, `pnpm exec astro check`, or `pnpm run build`.

## Project Shape
- This is a single Astro site/theme, not a multi-package workspace; `pnpm-workspace.yaml` only allows native builds for `esbuild` and `sharp`.
- Main user configuration belongs in `astro-paper.config.ts`; `src/config.ts` only resolves defaults for internal use.
- Astro routes live under `src/pages`; blog content lives in `src/content/posts`; page content lives in `src/content/pages`.
- TypeScript uses `@/*` for `src/*` and `@/astro-paper.config` for the root config.

## Content And Routing
- Post frontmatter is schema-checked in `src/content.config.ts`; required post fields include `pubDatetime`, `title`, and `description`.
- Files or directories prefixed with `_` are excluded by the content loader/path helpers; use them for internal content, not published routes.
- Post URLs include subdirectories from `src/content/posts`, slugified by `src/utils/getPostPaths.ts`.
- `draft: true` posts are always hidden; future `pubDatetime` posts are hidden in production until within `posts.scheduledPostMargin`, but non-draft scheduled posts show in dev.
- Lists and adjacent post navigation sort by `modDatetime` when present, otherwise `pubDatetime`.

## Feature Gotchas
- Pagefind search is generated only during build; `public/pagefind/` is a generated copy from `dist/pagefind` and is ignored by lint.
- Search indexes post bodies marked with `data-pagefind-body` in `src/pages/posts/[...slug]/index.astro`.
- Dynamic per-post OG images are served from `src/pages/posts/[...slug]/index.png.ts`; disabling `features.dynamicOgImage` means the configured static OG asset must exist.
- Social and share link `name` values must match SVG filenames in `src/assets/icons/socials/`.
- i18n currently has only `en`; adding a locale requires updating `astro.config.ts` locales and adding `src/i18n/lang/<locale>.ts`.

## Style
- Tailwind is v4 via `@tailwindcss/vite`; tokens and custom utilities are in `src/styles/theme.css` and `src/styles/global.css`, not a Tailwind config file.
- ESLint errors on `console`; `dist/**`, `.astro/**`, and `public/pagefind/**` are ignored.
- Prettier uses double quotes, semicolons, 2 spaces, LF endings, and the Astro/Tailwind plugins.
