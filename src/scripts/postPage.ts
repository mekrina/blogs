type WindowWithPostPageController = Window & {
  __postPageController?: AbortController;
};

const copyButtonLabel = "Copy";

export function initPostPage() {
  const windowWithPostPage = window as WindowWithPostPageController;
  windowWithPostPage.__postPageController?.abort();

  if (!document.getElementById("article")) return;

  windowWithPostPage.__postPageController = new AbortController();
  const postPageSignal = windowWithPostPage.__postPageController.signal;

  createProgressBar();
  updateScrollProgress(postPageSignal);
  addHeadingLinks();
  attachCopyButtons(postPageSignal);
  resetScrollAfterSwap(postPageSignal);
}

function createProgressBar() {
  if (document.getElementById("myBar")) return;

  const progressContainer = document.createElement("div");
  progressContainer.className =
    "progress-container fixed top-0 z-10 h-1 w-full bg-background";

  const progressBar = document.createElement("div");
  progressBar.className = "progress-bar h-1 w-0 bg-accent";
  progressBar.id = "myBar";

  progressContainer.appendChild(progressBar);
  document.body.appendChild(progressContainer);
}

function updateScrollProgress(signal: AbortSignal) {
  document.addEventListener(
    "scroll",
    () => {
      const winScroll =
        document.body.scrollTop || document.documentElement.scrollTop;
      const height =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      const myBar = document.getElementById("myBar");

      if (myBar) {
        myBar.style.width = scrolled + "%";
      }
    },
    { signal }
  );
}

function addHeadingLinks() {
  const headings = Array.from(
    document.querySelectorAll<HTMLHeadingElement>("h2, h3, h4, h5, h6")
  );

  for (const heading of headings) {
    if (heading.dataset.headingLinkReady) continue;
    heading.dataset.headingLinkReady = "true";

    heading.classList.add("group");
    const link = document.createElement("a");
    link.className =
      "heading-link ms-2 no-underline opacity-75 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100";
    link.href = "#" + heading.id;

    const span = document.createElement("span");
    span.ariaHidden = "true";
    span.innerText = "#";
    link.appendChild(span);
    heading.appendChild(link);
  }
}

function attachCopyButtons(signal: AbortSignal) {
  const codeBlocks = Array.from(
    document.querySelectorAll<HTMLPreElement>("pre")
  );

  if (!("IntersectionObserver" in window)) {
    codeBlocks.forEach(codeBlock => attachCopyButton(codeBlock, signal));
    return;
  }

  const observer = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const codeBlock = entry.target;

        if (codeBlock instanceof HTMLPreElement) {
          attachCopyButton(codeBlock, signal);
          observer.unobserve(codeBlock);
        }
      }
    },
    { rootMargin: "800px 0px" }
  );

  signal.addEventListener("abort", () => observer.disconnect(), {
    once: true,
  });

  for (const codeBlock of codeBlocks) {
    if (isNearViewport(codeBlock)) {
      attachCopyButton(codeBlock, signal);
    } else {
      observer.observe(codeBlock);
    }
  }
}

function attachCopyButton(codeBlock: HTMLPreElement, signal: AbortSignal) {
  if (codeBlock.dataset.copyCodeReady) return;
  codeBlock.dataset.copyCodeReady = "true";

  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";

  const computedStyle = getComputedStyle(codeBlock);
  const hasFileNameOffset =
    computedStyle.getPropertyValue("--file-name-offset").trim() !== "";

  const topClass = hasFileNameOffset ? "top-(--file-name-offset)" : "-top-3";

  const copyButton = document.createElement("button");
  copyButton.className = `copy-code absolute end-3 ${topClass} rounded bg-muted border border-muted px-2 py-1 text-xs leading-4 text-foreground font-medium`;
  copyButton.innerHTML = copyButtonLabel;
  codeBlock.setAttribute("tabindex", "0");
  codeBlock.appendChild(copyButton);

  codeBlock.parentNode?.insertBefore(wrapper, codeBlock);
  wrapper.appendChild(codeBlock);

  copyButton.addEventListener(
    "click",
    async () => {
      await copyCode(codeBlock, copyButton);
    },
    { signal }
  );
}

function isNearViewport(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return rect.top < window.innerHeight + 800 && rect.bottom > -200;
}

async function copyCode(block: HTMLPreElement, button: HTMLButtonElement) {
  const code = block.querySelector("code");
  const text = code?.innerText;

  await navigator.clipboard.writeText(text ?? "");

  button.innerText = "Copied";

  setTimeout(() => {
    button.innerText = copyButtonLabel;
  }, 700);
}

function resetScrollAfterSwap(signal: AbortSignal) {
  document.addEventListener(
    "astro:after-swap",
    () => window.scrollTo({ left: 0, top: 0, behavior: "instant" }),
    { signal }
  );
}
