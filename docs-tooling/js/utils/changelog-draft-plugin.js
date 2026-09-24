/**
 * markdown-it plugin that shows unreleased changelog fragments on the package
 * changelog pages.
 *
 * Each changelog page holds a towncrier marker above its newest release.
 * Unreleased entries live as fragment files under `changelog.d/` until a
 * release build writes them into the page, so the page source alone would hide
 * them. A core rule replaces the marker with the rendered fragments before
 * markdown-it parses the page.
 */
import { execFileSync } from "node:child_process";

export const TOWNCRIER_MARKER = "<!-- towncrier release notes start -->";

/** Changelog pages by the package config that renders their fragments. */
export const CHANGELOG_PAGES = {
    "reference/changelog/client.md": "client",
    "reference/changelog/server.md": "server",
};

/**
 * Render a package's unreleased fragments as a release section headed
 * "Unreleased". Returns an empty string when the package has no fragments.
 *
 * @param {string} pkg - `client` or `server`.
 * @param {string} repoRoot - Repository root, where `changelog.d/` lives.
 * @returns {string} Markdown for the unreleased section.
 */
export const renderUnreleased = (pkg, repoRoot) => {
    const draft = execFileSync(
        "uv",
        [
            "run",
            "--no-sync",
            "towncrier",
            "build",
            "--config",
            `changelog.d/${pkg}.toml`,
            "--version",
            "unreleased",
            "--date",
            "unreleased",
            "--draft",
        ],
        { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const [, ...body] = draft.trimEnd().split("\n");
    if (!body.some((line) => line.startsWith("### "))) {
        return "";
    }
    return ["## Unreleased", ...body, ""].join("\n");
};

/**
 * @param {import('markdown-it')} md - The markdown-it instance.
 * @param {{render: (pkg: string) => string}} options - `render` returns the
 *   unreleased section for a package.
 */
export const changelogDraftPlugin = (md, { render }) => {
    md.core.ruler.before("normalize", "changelog_draft", (state) => {
        const pkg = CHANGELOG_PAGES[state.env?.relativePath];
        if (!pkg || !state.src.includes(TOWNCRIER_MARKER)) {
            return;
        }
        const section = render(pkg);
        if (section) {
            state.src = state.src.replace(TOWNCRIER_MARKER, `${TOWNCRIER_MARKER}\n\n${section}`);
        }
    });
};
