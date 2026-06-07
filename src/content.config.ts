import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import config from "@/config";
import { postsContentLoader } from "@/loaders/postsContentLoader";

export const BLOG_PATH = "src/content/posts";

const posts = defineCollection({
  loader: postsContentLoader({
    pattern: ["**/[^_]*.{md,mdx}", "!**/*.excalidraw.md"],
    base: `./${BLOG_PATH}`,
  }),
  schema: ({ image }) =>
    z.object({
      author: z.string().optional().default(config.site.author),
      modDatetime: z.date(),
      title: z.string(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: z.preprocess(
        value =>
          Array.isArray(value) && value.length > 0 ? value : ["others"],
        z.array(z.string())
      ),
      ogImage: image().or(z.string()).optional(),
      description: z.string().optional().default(""),
      canonicalURL: z.string().optional(),
      hideEditPost: z.boolean().optional(),
      timezone: z.string().optional(),
    }),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    ogImage: z.string().optional(),
    canonicalURL: z.string().optional(),
  }),
});

export const collections = { posts, pages };
