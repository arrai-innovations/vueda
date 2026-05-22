import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/vue";
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { setTheme } from "@vueda/use/useTheme.js";

configure({ testIdAttribute: "data-qa" });

setTheme(vuedaTailwind);

global.window = global.window || {};
window.matchMedia =
    window.matchMedia ||
    function () {
        return {
            matches: false,
            addListener: function () {},
            removeListener: function () {},
        };
    };
