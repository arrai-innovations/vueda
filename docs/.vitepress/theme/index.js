import Layout from "./Layout.vue";
import "./brand.css";
import DemoCard from "./components/DemoCard.vue";
import ForceState from "./components/ForceState.vue";
import GlossaryTerm from "./components/GlossaryTerm.vue";
import StateLabel from "./components/StateLabel.vue";
import VersionFooter from "./components/VersionFooter.vue";
import VuedaDemo from "./components/VuedaDemo.vue";
import "./showcase-portals.css";
import { config as faConfig } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import {
    faArrowRotateLeft,
    faArrowUpRightFromSquare,
    faCaretDown,
    faCaretUp,
    faCheck,
    faChevronLeft,
    faChevronRight,
    faCircle,
    faCircleCheck,
    faCircleInfo,
    faCircleNotch,
    faCircleQuestion,
    faClock,
    faCopy,
    faDownload,
    faEllipsis,
    faFloppyDisk,
    faFolderOpen,
    faGripVertical,
    faIdCard,
    faLifeRing,
    faMinus,
    faPen,
    faPlus,
    faPrint,
    faShieldHalved,
    faTable,
    faTrash,
    faTriangleExclamation,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
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
    ObjectsGrid: {
        empty: { component: FontAwesomeIcon, props: { icon: faFolderOpen } },
        error: { component: FontAwesomeIcon, props: { icon: faTriangleExclamation } },
        filtered: { component: FontAwesomeIcon, props: { icon: faCircleQuestion } },
    },
    Default: {
        caretDown: { component: FontAwesomeIcon, props: { icon: faCaretDown } },
        caretUp: { component: FontAwesomeIcon, props: { icon: faCaretUp } },
        check: { component: FontAwesomeIcon, props: { icon: faCheck } },
        chevronLeft: { component: FontAwesomeIcon, props: { icon: faChevronLeft } },
        chevronRight: { component: FontAwesomeIcon, props: { icon: faChevronRight } },
        circle: { component: FontAwesomeIcon, props: { icon: faCircle } },
        circleCheck: { component: FontAwesomeIcon, props: { icon: faCircleCheck } },
        clock: { component: FontAwesomeIcon, props: { icon: faClock } },
        close: { component: FontAwesomeIcon, props: { icon: faXmark } },
        copy: { component: FontAwesomeIcon, props: { icon: faCopy } },
        download: { component: FontAwesomeIcon, props: { icon: faDownload } },
        ellipsis: { component: FontAwesomeIcon, props: { icon: faEllipsis } },
        externalLink: { component: FontAwesomeIcon, props: { icon: faArrowUpRightFromSquare } },
        floppyDisk: { component: FontAwesomeIcon, props: { icon: faFloppyDisk } },
        gripVertical: { component: FontAwesomeIcon, props: { icon: faGripVertical } },
        idCard: { component: FontAwesomeIcon, props: { icon: faIdCard } },
        info: { component: FontAwesomeIcon, props: { icon: faCircleInfo } },
        lifeRing: { component: FontAwesomeIcon, props: { icon: faLifeRing } },
        loading: { component: FontAwesomeIcon, props: { icon: faCircleNotch, spin: true } },
        plus: { component: FontAwesomeIcon, props: { icon: faPlus } },
        print: { component: FontAwesomeIcon, props: { icon: faPrint } },
        shieldHalved: { component: FontAwesomeIcon, props: { icon: faShieldHalved } },
        table: { component: FontAwesomeIcon, props: { icon: faTable } },
        triangleExclamation: { component: FontAwesomeIcon, props: { icon: faTriangleExclamation } },
        typeCreated: { component: FontAwesomeIcon, props: { icon: faPlus } },
        typeDeleted: { component: FontAwesomeIcon, props: { icon: faTrash } },
        typeRestored: { component: FontAwesomeIcon, props: { icon: faArrowRotateLeft } },
        typeUpdated: { component: FontAwesomeIcon, props: { icon: faPen } },
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

        app.component("DemoCard", DemoCard);
        app.component("GlossaryTerm", GlossaryTerm);
        app.component("ForceState", ForceState);
        app.component("StateLabel", StateLabel);
        app.component("VuedaDemo", VuedaDemo);
    },
};

export default theme;
