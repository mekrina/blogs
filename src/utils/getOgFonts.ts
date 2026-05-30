import { access, readFile } from "node:fs/promises";

const REGULAR_FONT_PATHS = [
  "C:/Windows/Fonts/Deng.ttf",
  "C:/Windows/Fonts/arial.ttf",
  "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
];

const BOLD_FONT_PATHS = [
  "C:/Windows/Fonts/Dengb.ttf",
  "C:/Windows/Fonts/arialbd.ttf",
  "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
];

async function firstExistingPath(paths: string[]) {
  for (const path of paths) {
    try {
      await access(path);
      return path;
    } catch {
      // Try the next OS-specific font path.
    }
  }
  throw new Error("Cannot find a system font for dynamic OG images.");
}

async function readFont(path: string) {
  const buffer = await readFile(path);
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
}

export async function getOgFonts() {
  const [regularPath, boldPath] = await Promise.all([
    firstExistingPath(REGULAR_FONT_PATHS),
    firstExistingPath(BOLD_FONT_PATHS),
  ]);
  const [regularData, boldData] = await Promise.all([
    readFont(regularPath),
    readFont(boldPath),
  ]);

  return [
    {
      name: "AppFont",
      data: regularData,
      weight: 400 as const,
      style: "normal" as const,
    },
    {
      name: "AppFont",
      data: boldData,
      weight: 700 as const,
      style: "normal" as const,
    },
  ];
}
