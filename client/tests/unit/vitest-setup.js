import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/vue";

configure({ testIdAttribute: "data-qa" });

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
