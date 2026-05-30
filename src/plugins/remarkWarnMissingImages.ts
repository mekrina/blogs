import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type MarkdownNode = {
  type?: string;
  url?: string;
  alt?: string | null;
  tagName?: string;
  properties?: {
    src?: unknown;
    alt?: unknown;
  };
  children?: MarkdownNode[];
};

type MarkdownFile = {
  path?: string;
  history?: string[];
};

const externalUrl = /^(?:[a-z][a-z\d+.-]*:|#|\/)/i;

function displayPath(path: string) {
  return path.startsWith("file:") ? fileURLToPath(path) : path;
}

function visit(node: MarkdownNode, callback: (node: MarkdownNode) => void) {
  callback(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) visit(child, callback);
  }
}

function missingImageSvg(originalUrl: string) {
  const escapedUrl = originalUrl
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="28" viewBox="0 0 320 28" role="img" aria-label="缺失图: ${escapedUrl}"><text x="0" y="20" font-family="ui-sans-serif, system-ui, sans-serif" font-size="16" fill="#71717a">缺失图: ${escapedUrl}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function resolveImagePath(filePath: string, pathname: string) {
  const decodedPath = decodeURIComponent(pathname);

  if (decodedPath.startsWith("@/")) {
    return join(process.cwd(), "src", decodedPath.slice(2));
  }

  return join(dirname(filePath), decodedPath);
}

export function remarkWarnMissingImages() {
  return (tree: MarkdownNode, file: MarkdownFile) => {
    const filePath = file.path || file.history?.[0];
    if (!filePath) return;

    visit(tree, node => {
      if (node.type !== "image" || typeof node.url !== "string") return;
      if (externalUrl.test(node.url)) return;

      const [pathname] = node.url.split(/[?#]/);
      const imagePath = resolveImagePath(filePath, pathname);
      if (existsSync(imagePath)) return;

      process.stderr.write(
        `[markdown] Missing image ${node.url} referenced from ${displayPath(filePath)}\n`
      );
      node.alt = node.alt ? `${node.alt} (${node.url})` : node.url;
      node.url = missingImageSvg(node.url);
    });
  };
}

export function rehypeWarnMissingImages() {
  return (tree: MarkdownNode, file: MarkdownFile) => {
    const filePath = file.path || file.history?.[0];
    if (!filePath) return;

    visit(tree, node => {
      if (node.type !== "element" || node.tagName !== "img") return;

      const src = node.properties?.src;
      if (typeof src !== "string" || externalUrl.test(src)) return;

      const [pathname] = src.split(/[?#]/);
      const imagePath = resolveImagePath(filePath, pathname);
      if (existsSync(imagePath)) return;

      process.stderr.write(
        `[markdown] Missing image ${src} referenced from ${displayPath(filePath)}\n`
      );

      const alt = node.properties?.alt;
      node.properties ??= {};
      node.properties.alt =
        typeof alt === "string" && alt.length > 0 ? `${alt} (${src})` : src;
      node.properties.src = missingImageSvg(src);
    });
  };
}
