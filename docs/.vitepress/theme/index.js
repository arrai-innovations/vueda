import AuthDemo from "./components/AuthDemo.vue";
import DemoCard from "./components/DemoCard.vue";
import DemoFormModel from "./components/DemoFormModel.vue";
import DemoRouterLink from "./components/DemoRouterLink.vue";
import DemoTitleBar from "./components/DemoTitleBar.vue";
import ForceState from "./components/ForceState.vue";
import GlossaryTerm from "./components/GlossaryTerm.vue";
import HomePreview from "./components/HomePreview.vue";
import ModelDemo from "./components/ModelDemo.vue";
import StateLabel from "./components/StateLabel.vue";
import VersionFooter from "./components/VersionFooter.vue";
import VuedaDemo from "./components/VuedaDemo.vue";
import { seedShowcaseModels } from "./fixtures/showcaseCustomer.js";
import { seedShowcaseFieldTypes } from "./fixtures/showcaseFieldTypes.js";
import "./showcase-portals.css";
import { createArraiTheme } from "@arrai-innovations/vitepress-theme";
import { config as faConfig } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import fontAwesomeFreeIcons from "@vueda/theme/vueda-tailwind/icons/fontAwesomeFree.js";
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { setIcons } from "@vueda/use/useIcons.js";
import { setTheme } from "@vueda/use/useTheme.js";
import throttle from "lodash-es/throttle.js";
import { createPinia } from "pinia";
import { useData } from "vitepress";
import { defineComponent, h, watch } from "vue";

faConfig.autoAddCss = false;

setTheme(vuedaTailwind);
setIcons(fontAwesomeFreeIcons);

const DarkModeTransitionGuard = defineComponent({
    setup() {
        if (typeof window === "undefined") {
            return () => null;
        }
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

const theme = createArraiTheme({
    layoutSlots: {
        "home-hero-image": () => h(HomePreview),
        "layout-top": () => h(DarkModeTransitionGuard),
        "layout-bottom": () => h(VersionFooter),
    },
    enhanceApp(ctx) {
        const { app } = ctx;

        // Pinia backs the model-info/config stores the CRUDL demos render against.
        // Seeding the demo model lets <FormModel> resolve its config offline.
        const pinia = createPinia();
        app.use(pinia);
        seedShowcaseModels(pinia);
        seedShowcaseFieldTypes(pinia);

        app.component("AuthDemo", AuthDemo);
        app.component("DemoCard", DemoCard);
        app.component("DemoFormModel", DemoFormModel);
        app.component("DemoTitleBar", DemoTitleBar);
        app.component("ModelDemo", ModelDemo);
        // Components that render <router-link> directly need the name resolvable; VitePress
        // registers no such component. Both spellings, since either can appear in a template.
        app.component("router-link", DemoRouterLink);
        app.component("RouterLink", DemoRouterLink);
        app.component("GlossaryTerm", GlossaryTerm);
        app.component("ForceState", ForceState);
        app.component("StateLabel", StateLabel);
        app.component("VuedaDemo", VuedaDemo);
    },
});

export default theme;
