import "./brand.css";
import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";

const theme: Theme = {
    ...DefaultTheme,
    enhanceApp(ctx) {
        if (DefaultTheme.enhanceApp) {
            DefaultTheme.enhanceApp(ctx);
        }

        if (typeof window !== "undefined") {
            const { router } = ctx;
            const renderMermaid = () => {
                const mermaid = (window as typeof window & { mermaid?: { init: () => void } }).mermaid;
                if (mermaid) {
                    mermaid.init();
                }
            };

            router.onAfterRouteChanged = () => {
                requestAnimationFrame(renderMermaid);
            };

            requestAnimationFrame(renderMermaid);
        }
    },
};

export default theme;
