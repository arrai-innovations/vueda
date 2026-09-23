import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/vue";

configure({ testIdAttribute: "data-qa" });

global.window = global.window || {};
// jsdom implements no `matchMedia` at all, so this stub is what every spec gets rather than a
// fallback for an odd environment. It has to answer the whole `MediaQueryList` interface: anything
// built on VueUse's `useMediaQuery` — `useBreakpoints`, and so the layout of any component that
// switches on one — subscribes with `addEventListener`, and a stub carrying only the deprecated
// `addListener` pair fails with "el.addEventListener is not a function" rather than simply
// reporting no match.
//
// `matches` is always false, so every query reads as unmatched and a breakpoint-driven component
// renders its narrow layout. A spec that needs the other side should mock `useBreakpoints` (as
// `ObjectsGrid.spec.js` does) or pass a breakpoint that does not consult a media query at all.
window.matchMedia =
    window.matchMedia ||
    function (query) {
        return {
            matches: false,
            media: query,
            onchange: null,
            addEventListener: function () {},
            removeEventListener: function () {},
            dispatchEvent: function () {
                return false;
            },
            // Deprecated, and still called by older libraries.
            addListener: function () {},
            removeListener: function () {},
        };
    };
