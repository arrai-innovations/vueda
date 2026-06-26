import Layout from "./Layout.vue";
import "./brand.css";
import DemoCard from "./components/DemoCard.vue";
import DemoFormModel from "./components/DemoFormModel.vue";
import ForceState from "./components/ForceState.vue";
import GlossaryTerm from "./components/GlossaryTerm.vue";
import StateLabel from "./components/StateLabel.vue";
import VersionFooter from "./components/VersionFooter.vue";
import VuedaDemo from "./components/VuedaDemo.vue";
import { seedShowcaseModels } from "./fixtures/showcaseCustomer.js";
import "./showcase-portals.css";
import { config as faConfig } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import fontAwesomeFreeIcons from "@vueda/theme/vueda-tailwind/icons/fontAwesomeFree.js";
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { setIcons } from "@vueda/use/useIcons.js";
import { setTheme } from "@vueda/use/useTheme.js";
import throttle from "lodash-es/throttle.js";
import { createPinia } from "pinia";
import { useData } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { defineComponent, h, watch } from "vue";

faConfig.autoAddCss = false;

setTheme(vuedaTailwind);
setIcons(fontAwesomeFreeIcons);

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
        return h(Layout, null, {
            "layout-top": () => h(DarkModeTransitionGuard),
            "layout-bottom": () => h(VersionFooter),
        });
    },
    enhanceApp(ctx) {
        const { app } = ctx;

        if (DefaultTheme.enhanceApp) {
            DefaultTheme.enhanceApp(ctx);
        }

        // Pinia backs the model-info/config stores the CRUDL demos render against.
        // Seeding the demo model lets <FormModel> resolve its config offline.
        const pinia = createPinia();
        app.use(pinia);
        seedShowcaseModels(pinia);

        app.component("DemoCard", DemoCard);
        app.component("DemoFormModel", DemoFormModel);
        app.component("GlossaryTerm", GlossaryTerm);
        app.component("ForceState", ForceState);
        app.component("StateLabel", StateLabel);
        app.component("VuedaDemo", VuedaDemo);
    },
};

export default theme;
