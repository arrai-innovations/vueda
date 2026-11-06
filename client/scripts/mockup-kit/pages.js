/**
 * Page shells for the mockup kit: the empty page that mockups start from and
 * the gallery that shows every snapshot.
 */

/** Google Fonts stylesheet for the theme's font families, at the weights that it uses. */
export const FONTS_URL =
    "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap";

/** Classes that the page body needs, because base.css styles no element itself. */
export const BODY_CLASSES = "bg-background text-foreground font-sans text-body";

/**
 * @param {object} options
 * @param {string} options.title - The page title.
 * @param {string} options.stylesheet - Path of the kit stylesheet, relative to the page.
 * @param {string} options.body - HTML placed inside `<body>`.
 * @param {string} [options.head] - Extra HTML placed at the end of `<head>`.
 * @returns {string}
 */
function page({ title, stylesheet, body, head = "" }) {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS_URL}">
<link rel="stylesheet" href="${stylesheet}">
${head}
</head>
<body class="${BODY_CLASSES}">
${body}
</body>
</html>
`;
}

/**
 * The empty page that a mockup starts from. Add `class="dark"` to `<html>` for
 * the dark theme.
 *
 * @returns {string}
 */
export function starterPage() {
    return page({
        title: "Mockup",
        stylesheet: "assets/vueda-mockups.css",
        body: `<main class="mx-auto max-w-7xl p-4">
<!-- Paste a view from snapshots/ here. -->
</main>`,
    });
}

/**
 * @typedef {object} GallerySection
 * @property {string} file - The snapshot's file name.
 * @property {string} title - What the snapshot shows.
 * @property {number} width - Viewport width in pixels that the snapshot was rendered for.
 * @property {string} html - The snapshot markup.
 */

/**
 * @param {string} value
 * @returns {string}
 */
function escapeAttribute(value) {
    return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

// Each snapshot shows in its own frame, because the theme's responsive rules
// follow the viewport width, and a snapshot rendered for a narrow viewport only
// looks right in one. The script sizes each frame to its content and applies
// the light / dark toggle inside every frame.
const GALLERY_SCRIPT = `<script>
function fitFrame(frame) {
    frame.style.height = frame.contentDocument.documentElement.scrollHeight + "px";
}
function toggleTheme() {
    const dark = document.documentElement.classList.toggle("dark");
    for (const frame of document.querySelectorAll("iframe")) {
        frame.contentDocument.documentElement.classList.toggle("dark", dark);
    }
}
</script>`;

/**
 * One page that shows every snapshot, for people reviewing the kit.
 *
 * @param {GallerySection[]} sections
 * @returns {string}
 */
export function galleryPage(sections) {
    const body = sections
        .map(({ file, title, width, html }) => {
            const frame = page({
                title,
                stylesheet: "assets/vueda-mockups.css",
                body: `<div class="p-4">\n${html}</div>`,
            });
            return `<section class="flex flex-col gap-2">
<h2 class="text-heading font-semibold">${title} <code class="font-mono text-muted-foreground">snapshots/${file}</code></h2>
<iframe title="${escapeAttribute(title)}" class="hairline hairline-border rounded-vueda-card bg-background" style="width: ${width}px; max-width: 100%; border: 0" onload="fitFrame(this)" srcdoc="${escapeAttribute(frame)}"></iframe>
</section>`;
        })
        .join("\n");
    return page({
        title: "VUEDA mockup kit gallery",
        stylesheet: "assets/vueda-mockups.css",
        head: GALLERY_SCRIPT,
        body: `<main class="flex flex-col gap-10 p-6 bg-muted">
<header class="flex items-center justify-between">
<h1 class="text-heading font-semibold">VUEDA mockup kit</h1>
<button type="button" class="hairline hairline-border rounded-vueda-control px-3 py-1 bg-background" onclick="toggleTheme()">Light / dark</button>
</header>
${body}
</main>`,
    });
}
