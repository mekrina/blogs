import { statSync } from "node:fs";
import { relative } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { glob, type Loader } from "astro/loaders";

type LoaderContext = Parameters<Loader["load"]>[0];
type GlobOptions = Parameters<typeof glob>[0];
type LoaderContextWithEntryTypes = LoaderContext & {
  entryTypes?: Map<string, Record<string, unknown>>;
};
type ContentRender = (entry: { data: Record<string, unknown> }) => unknown;
type EntryTypeWithRender = Record<string, unknown> & {
  getRenderFunction?: (...args: unknown[]) => Promise<ContentRender>;
};

const gitDatesByFile = new Map<string, { modDatetime?: Date }>();

function isDraftData(data: Record<string, unknown>) {
  return data.draft === true;
}

function gitDate(cwd: string, filePath: string, args: string[]) {
  const relativePath = relative(cwd, filePath).replaceAll("\\", "/");

  try {
    return execFileSync("git", [...args, "--", relativePath], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .at(-1);
  } catch {
    return undefined;
  }
}

function toDate(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value !== "string" && typeof value !== "number") return undefined;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function getGitPostFileDates(rootUrl: URL, filePath: string) {
  const cached = gitDatesByFile.get(filePath);
  if (cached) return cached;

  const rootPath = fileURLToPath(rootUrl);
  const lastCommit = gitDate(rootPath, filePath, ["log", "-1", "--format=%cI"]);
  const dates = {
    modDatetime: toDate(lastCommit),
  };

  gitDatesByFile.set(filePath, dates);
  return dates;
}

function getPostFileDates(
  rootUrl: URL,
  filePath: string,
  data: Record<string, unknown>
) {
  const stats = statSync(filePath);
  const gitDates = getGitPostFileDates(rootUrl, filePath);

  return {
    modDatetime:
      toDate(data.modDatetime) ?? gitDates.modDatetime ?? stats.mtime,
  };
}

function getPostTags(data: Record<string, unknown>) {
  if (!Array.isArray(data.tags)) return ["others"];

  const tags = data.tags.filter(
    (tag): tag is string => typeof tag === "string" && tag.trim().length > 0
  );
  return tags.length > 0 ? tags : ["others"];
}

function getPostDescription(data: Record<string, unknown>) {
  return typeof data.description === "string" ? data.description : "";
}

function entryTypesWithoutDraftRendering(
  entryTypes: LoaderContextWithEntryTypes["entryTypes"]
) {
  if (!entryTypes) return entryTypes;

  return new Map(
    Array.from(entryTypes, ([extension, entryType]) => [
      extension,
      {
        ...entryType,
        getRenderFunction:
          typeof entryType.getRenderFunction === "function"
            ? async (...args: unknown[]) => {
                const render = await (
                  entryType as EntryTypeWithRender
                ).getRenderFunction?.(...args);

                return async (entry: { data: Record<string, unknown> }) => {
                  if (isDraftData(entry.data)) return undefined;

                  return render?.(entry);
                };
              }
            : entryType.getRenderFunction,
      },
    ])
  );
}

export function postsContentLoader(options: GlobOptions): Loader {
  const loader = glob(options);

  return {
    ...loader,
    name: "posts-content-loader",
    load: async context => {
      const ctx = context as LoaderContextWithEntryTypes;

      await loader.load({
        ...ctx,
        entryTypes: entryTypesWithoutDraftRendering(ctx.entryTypes),
        parseData: async props => {
          if (isDraftData(props.data)) return props.data;

          const fileDates = props.filePath
            ? getPostFileDates(ctx.config.root, props.filePath, props.data)
            : undefined;

          return ctx.parseData({
            ...props,
            data: {
              ...props.data,
              ...fileDates,
              tags: getPostTags(props.data),
              description: getPostDescription(props.data),
            },
          });
        },
      } as LoaderContext);
    },
  };
}
