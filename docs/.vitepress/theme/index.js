import "./brand.css";
import GlossaryTerm from "./components/GlossaryTerm.vue";
import "./showcase.css";
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { setTheme } from "@vueda/use/useTheme.js";
import DefaultTheme from "vitepress/theme";

setTheme(vuedaTailwind);

const theme = {
    ...DefaultTheme,
    enhanceApp(ctx) {
        const { app } = ctx;

        if (DefaultTheme.enhanceApp) {
            DefaultTheme.enhanceApp(ctx);
        }

        app.component("GlossaryTerm", GlossaryTerm);

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
