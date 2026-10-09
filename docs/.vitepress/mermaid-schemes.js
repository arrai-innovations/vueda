/**
 * Mermaid config for each docs color scheme.
 *
 * Diagrams render to static SVG files that the page shows with `<img>`, so the
 * theme's CSS custom properties cannot reach them. These hex values are the
 * resolved colors of the `--arrai-docs-*` tokens in
 * `@arrai-innovations/vitepress-theme/src/brand.css`. Update them when the
 * brand tokens change.
 *
 * The page's web fonts are not available inside an `<img>` SVG, so the font
 * stack names system fonts only.
 */
const fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";

export const mermaidSchemes = {
    light: {
        theme: "base",
        fontFamily,
        themeVariables: {
            darkMode: false,
            background: "#ffffff",
            // brand 10% over white
            primaryColor: "#e6f1fe",
            // link: brand 76% + navy
            primaryBorderColor: "#0061c7",
            // navy
            primaryTextColor: "#001c30",
            // surface-muted: grey 36% over white
            secondaryColor: "#f6f6f6",
            tertiaryColor: "#ffffff",
            // text-muted: navy 68% over white
            lineColor: "#526572",
            clusterBkg: "#f6f6f6",
            // border: navy 14% over white
            clusterBorder: "#dbdfe2",
            edgeLabelBackground: "#ffffff",
            titleColor: "#001c30",
        },
    },
    dark: {
        theme: "base",
        fontFamily,
        themeVariables: {
            darkMode: true,
            background: "#001c30",
            // brand 16% over navy
            primaryColor: "#002b50",
            // link: brand 80% + white
            primaryBorderColor: "#3392f9",
            // grey
            primaryTextColor: "#e5e5e5",
            // surface-muted: navy 85% + black
            secondaryColor: "#001829",
            tertiaryColor: "#001c30",
            // text-muted: grey 72% + navy
            lineColor: "#a5adb2",
            clusterBkg: "#001829",
            // border: navy 82% + grey
            clusterBorder: "#294051",
            edgeLabelBackground: "#001c30",
            titleColor: "#e5e5e5",
        },
    },
};
