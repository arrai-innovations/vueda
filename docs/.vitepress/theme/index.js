import "./brand.css";
import DefaultTheme from "vitepress/theme";

const theme = {
    ...DefaultTheme,
    enhanceApp(ctx) {
        if (DefaultTheme.enhanceApp) {
            DefaultTheme.enhanceApp(ctx);
        }

        if (typeof window !== "undefined") {
            const { router } = ctx;
            const renderMermaid = () => {
                const mermaid = window.mermaid;
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
