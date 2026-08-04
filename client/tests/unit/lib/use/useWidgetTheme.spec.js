import { scopedIt } from "@tests/unit/utils.js";
import { useTheme } from "@vueda/use/useTheme.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import { computed, isReactive, reactive } from "vue";

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: makeUseThemeMock(),
}));

describe("lib/use/useWidgetTheme.js", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    scopedIt("calls useTheme with minimal context and returns its result", () => {
        const mockThemeReturn = vi.fn().mockReturnValue("some-class");
        useTheme.mockReturnValue(mockThemeReturn);

        const props = reactive({ themeOverride: {} });
        const widgetContextState = { required: true };
        const result = useWidgetTheme("Button", props, widgetContextState);

        expect(typeof result).toBe("function");
        expect(result("base")).toBe("some-class");

        expect(useTheme).toHaveBeenCalledWith(
            "Button",
            props,
            expect.any(Object), // themeContext
            undefined,
        );

        const themeContext = useTheme.mock.calls[0][2];
        expect(isReactive(themeContext)).toBe(true);
        expect(themeContext.required).toBe(true);
    });

    scopedIt("uses computed values from widgetContextState", () => {
        const mockThemeReturn = vi.fn();
        useTheme.mockReturnValue(mockThemeReturn);

        const widgetContextState = reactive({
            required: true,
            help: "Need help?",
            validationState: {
                invalid: false,
                warning: true,
            },
        });

        useWidgetTheme("Input", reactive({}), widgetContextState);
        const themeContext = useTheme.mock.calls[0][2];

        expect(themeContext.required).toBe(true);
        expect(themeContext.help).toBe("Need help?");
        expect(themeContext.invalid).toBe(false);
        expect(themeContext.warning).toBe(true);
    });

    scopedIt("merges additionalContext into themeContext", () => {
        const mockThemeReturn = vi.fn();
        useTheme.mockReturnValue(mockThemeReturn);

        const additional = {
            customFlag: computed(() => true),
            dynamicMessage: "hello world",
        };

        useWidgetTheme("Input", reactive({}), {}, additional);

        const themeContext = useTheme.mock.calls[0][2];

        expect(themeContext.customFlag).toBe(true);
        expect(themeContext.dynamicMessage).toBe("hello world");
    });

    scopedIt("passes keyFn through to useTheme", () => {
        const mockThemeReturn = vi.fn();
        useTheme.mockReturnValue(mockThemeReturn);

        const keyFn = vi.fn().mockImplementation((k) => `custom-${k}`);
        useWidgetTheme("Select", reactive({}), {}, {}, keyFn);

        expect(useTheme).toHaveBeenCalledWith("Select", expect.anything(), expect.anything(), keyFn);
    });
});
