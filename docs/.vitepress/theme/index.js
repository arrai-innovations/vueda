import "./brand.css";
import GlossaryTerm from "./components/GlossaryTerm.vue";
import "./showcase.css";
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { setTheme } from "@vueda/use/useTheme.js";
import throttle from "lodash-es/throttle.js";
import { useData } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { defineComponent, h, watch } from "vue";

setTheme(vuedaTailwind);

const DarkModeTransitionGuard = defineComponent({
    setup() {
        if (typeof window === "undefined") return () => null;
        const { isDark } = useData();
        const clear = () => document.documentElement.classList.remove("no-transition");
        const throttledClear = throttle(clear, 150, { leading: false, trailing: true });
        watch(
            isDark,
            () => {
                document.documentElement.classList.add("no-transition");
                throttledClear();
            },
            { flush: "sync" },
        );
        return () => null;
    },
});

const theme = {
    ...DefaultTheme,
    Layout() {
        return h(DefaultTheme.Layout, null, {
            "layout-top": () => h(DarkModeTransitionGuard),
        });
    },
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
