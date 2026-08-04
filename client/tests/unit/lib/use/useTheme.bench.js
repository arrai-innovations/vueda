/**
 * Microbenchmarks for `useTheme`.
 *
 * Run with:
 *   npx --no-install vitest bench tests/unit/lib/use/useTheme.bench.js --run
 *
 * Two paths exist inside useTheme:
 * - Sync fast path (`computed` + `resolveSlotClassesSync`) when no component in
 *   the composes graph is a function-form loader. The current vueda-tailwind
 *   preset registers plain data, so all benches below exercise the sync path.
 * - Async fallback (`computedAsync` + `resolveSlotClasses`) when a loader is
 *   encountered; not exercised here (would need a loader-registered key).
 */
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { setTheme, useTheme } from "@vueda/use/useTheme.js";
import { bench, describe } from "vitest";
import { effectScope, reactive, toRef } from "vue";

setTheme(vuedaTailwind);

const makeButtonProps = () => reactive({ themeOverride: null, tone: "primary", emphasis: "fill", size: "default" });
const makeButtonContext = (props) =>
    reactive({
        tone: toRef(props, "tone"),
        emphasis: toRef(props, "emphasis"),
        size: toRef(props, "size"),
    });

describe("useTheme: single-instance cost", () => {
    bench("Input.root — bare slot (no composes, no class fn)", () => {
        const scope = effectScope();
        scope.run(() => {
            const props = reactive({ themeOverride: null });
            const theme = useTheme("Input", props);
            theme("root");
        });
        scope.stop();
    });

    bench("Button.root — composes 2 primitives + class fn over (variant, size)", () => {
        const scope = effectScope();
        scope.run(() => {
            const props = makeButtonProps();
            const theme = useTheme("Button", props, makeButtonContext(props));
            theme("root");
        });
        scope.stop();
    });

    bench("CalendarCellTrigger.root — composes 2 primitives, no class fn", () => {
        const scope = effectScope();
        scope.run(() => {
            const props = reactive({ themeOverride: null });
            const theme = useTheme("CalendarCellTrigger", props);
            theme("root");
        });
        scope.stop();
    });
});

describe("useTheme: cached read (computed cache hit)", () => {
    const warmScope = effectScope();
    let inputTheme;
    let buttonTheme;
    warmScope.run(() => {
        const inputProps = reactive({ themeOverride: null });
        inputTheme = useTheme("Input", inputProps);
        inputTheme("root");

        const buttonProps = makeButtonProps();
        buttonTheme = useTheme("Button", buttonProps, makeButtonContext(buttonProps));
        buttonTheme("root");
    });

    bench("Input.root cached — 1000 reads", () => {
        for (let i = 0; i < 1000; i++) inputTheme("root");
    });

    bench("Button.root cached — 1000 reads", () => {
        for (let i = 0; i < 1000; i++) buttonTheme("root");
    });
});

describe("useTheme: at-scale (per-page instance counts)", () => {
    bench("100 Button instances, each reads root once", () => {
        const scope = effectScope();
        scope.run(() => {
            for (let i = 0; i < 100; i++) {
                const props = makeButtonProps();
                const theme = useTheme("Button", props, makeButtonContext(props));
                theme("root");
            }
        });
        scope.stop();
    });

    bench("1000 Input instances, each reads root once (Table-cell scenario)", () => {
        const scope = effectScope();
        scope.run(() => {
            for (let i = 0; i < 1000; i++) {
                const props = reactive({ themeOverride: null });
                const theme = useTheme("Input", props);
                theme("root");
            }
        });
        scope.stop();
    });
});

describe("useTheme: reactive invalidation", () => {
    bench("Button.root re-resolves on tone/emphasis change", () => {
        const scope = effectScope();
        scope.run(() => {
            const props = makeButtonProps();
            const theme = useTheme("Button", props, makeButtonContext(props));
            theme("root");
            props.tone = "neutral";
            props.emphasis = "outline";
            theme("root");
            props.emphasis = "ghost";
            theme("root");
        });
        scope.stop();
    });

    bench("Button.root re-resolves on themeOverride change", () => {
        const scope = effectScope();
        scope.run(() => {
            const props = makeButtonProps();
            const theme = useTheme("Button", props, makeButtonContext(props));
            theme("root");
            props.themeOverride = { Button: { root: { class: "extra-1" } } };
            theme("root");
            props.themeOverride = { Button: { root: { class: "extra-2" } } };
            theme("root");
        });
        scope.stop();
    });
});
