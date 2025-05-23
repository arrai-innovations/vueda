import { mockProvideInject, scopedIt } from "@tests/unit/utils.js";
import { FieldContextSymbol, WidgetContextSymbol } from "@vueda/utils/symbols.js";

const { mockedInject } = mockProvideInject(vi);
const mockedGetCurrentInstance = vi.fn(() => ({ type: { __name: "TestComponent" } }));

vi.mock("vue", async () => {
    const actual = await vi.importActual("vue");
    return {
        __esModule: true,
        ...actual,
        inject: mockedInject,
        getCurrentInstance: mockedGetCurrentInstance,
    };
});

describe("lib/use/useDevLogger.js", () => {
    let vue, useDevLogger;
    beforeEach(async () => {
        vue = await import("vue");
        useDevLogger = await import("@vueda/use/useDevLogger.js").then((m) => m.useDevLogger);
        mockedGetCurrentInstance.mockReturnValue({ type: { __name: "TestComponent" } });
    });
    afterEach(() => {
        vi.clearAllMocks();
        import.meta.env.PROD = false;
    });

    scopedIt("returns no-op functions in production", () => {
        const originalProd = import.meta.env.PROD;
        import.meta.env.PROD = true;

        const spies = ["log", "warn", "error", "info", "debug"].map((method) =>
            vi.spyOn(console, method).mockImplementation(() => {}),
        );

        const logger = useDevLogger();
        logger.log("a");
        logger.warn("b");
        logger.error("c");
        logger.info("d");
        logger.debug("e");

        spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
        import.meta.env.PROD = originalProd;
    });

    scopedIt("uses injected contexts when none provided", () => {
        const widgetContext = { state: { combinedName: "widget" } };
        const fieldContext = { state: { name: "field" } };
        mockedInject.mockImplementation((key) => {
            if (key === WidgetContextSymbol) {
                return widgetContext;
            }
            if (key === FieldContextSymbol) {
                return fieldContext;
            }
            return null;
        });

        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        const logger = useDevLogger();
        logger.log("hello", vue.ref("x"), vue.reactive({ y: 1 }));

        expect(mockedInject).toHaveBeenCalledWith(WidgetContextSymbol, null);
        expect(mockedInject).toHaveBeenCalledWith(FieldContextSymbol, null);
        expect(logSpy).toHaveBeenCalledWith("[TestComponent] [widget:widget] hello", "x", { y: 1 });
    });

    scopedIt("prefers provided widget context over field context", () => {
        const widgetContext = { state: { combinedName: "providedWidget" } };
        const fieldContext = { state: { name: "providedField" } };
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        const logger = useDevLogger({ fieldContext, widgetContext });
        logger.log("msg");
        expect(logSpy).toHaveBeenCalledWith("[TestComponent] [widget:providedWidget] msg");
    });

    scopedIt("falls back to field context when widget context missing", () => {
        const fieldContext = { state: { name: "fieldOnly" } };
        mockedInject.mockImplementation(() => null);
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        const logger = useDevLogger({ fieldContext });
        logger.log("msg");
        expect(logSpy).toHaveBeenCalledWith("[TestComponent] [field:fieldOnly] msg");
    });
});
