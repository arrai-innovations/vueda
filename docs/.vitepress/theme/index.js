import "./brand.css";
import ForceState from "./components/ForceState.vue";
import GlossaryTerm from "./components/GlossaryTerm.vue";
import "./showcase.css";
import { config as faConfig } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { faCheck, faMinus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { setIcons } from "@vueda/use/useIcons.js";
import { setTheme } from "@vueda/use/useTheme.js";
import throttle from "lodash-es/throttle.js";
import { useData } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { defineComponent, h, watch } from "vue";

faConfig.autoAddCss = false;

setTheme(vuedaTailwind);
setIcons({
    Checkbox: {
        check: { component: FontAwesomeIcon, props: { icon: faCheck } },
        indeterminate: { component: FontAwesomeIcon, props: { icon: faMinus } },
    },
});

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
        app.component("ForceState", ForceState);

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
