import { mockLifecycle, mockProvideInject, scopedIt, testWatches } from "@tests/unit/utils.js";
import { FieldContextSymbol, WidgetContextSymbol } from "@vueda/utils/symbols.js";
import flushPromises from "flush-promises";

const { provideStore, mockedProvide, mockedInject } = mockProvideInject(vi);
const { clearUnmounted, runUnmountedHooks, mockedOnUnmounted } = mockLifecycle(vi);
vi.mock("vue", async () => {
    const original = await vi.importActual("vue");
    return {
        __esModule: true,
        ...original,
        provide: mockedProvide,
        inject: mockedInject,
        onUnmounted: mockedOnUnmounted,
    };
});

/**
 * Returns a reactive set of default widget props.
 * Use `vue.readonly(...)` to wrap it before passing to useWidget.
 *
 * @param {import("vue")} vue - The Vue module.
 * @returns {import("@vueda/use/useWidget.js").WidgetContextProps}
 */
const getDefaultWidgetProps = (vue) => {
    return vue.reactive({
        // *** Identification & Metadata ***
        name: undefined,

        // *** Display ***
        label: undefined,
        help: undefined,

        // *** Validation ***
        required: undefined,

        // *** Value Handling ***
        modelValue: undefined,

        // *** Disabled Behavior ***
        disabled: false,
        disabledFn: null,

        // *** Field Context Behavior ***
        contextless: false,
    });
};

/**
 * Returns a mocked FieldContext for injection.
 *
 * @param {import("vue")} vue - The Vue module.
 * @returns {import("@vueda/use/useField.js").FieldContext}
 */
const getFieldContextMock = (vue) => {
    return {
        state: vue.reactive({
            name: "fieldNameFromContext",
            formModelName: "formModelFromContext",
            label: "labelFromContext",
            help: "helpFromContext",
            required: true,
            errors: {},
            messages: {},
            focused: false,
            value: "valueFromContext",
            dependencyValues: {},
        }),
        deleteValue: vi.fn(),
        updateError: vi.fn(),
        deleteError: vi.fn(),
        clearErrors: vi.fn(),
        updateMessage: vi.fn(),
        deleteMessage: vi.fn(),
        clearMessages: vi.fn(),
        setTouched: vi.fn(),
        clearTouched: vi.fn(),
        focus: vi.fn(),
        blur: vi.fn(),
        ignore: vi.fn(),
        removeIgnore: vi.fn(),
        registerIsModifiedHook: vi.fn(),
        unregisterIsModifiedHook: vi.fn(),
        registerIsRequiredHook: vi.fn(),
        unregisterIsRequiredHook: vi.fn(),
        registerIsValidHook: vi.fn(),
        unregisterIsValidHook: vi.fn(),
        registerDependencyValues: vi.fn().mockReturnValue("dep-id"),
        unregisterDependencyValues: vi.fn(),
    };
};

describe("lib/use/useWidget.js", () => {
    let vue, useWidget;
    const emit = vi.fn();

    beforeEach(async () => {
        vue = await vi.importActual("vue");
        useWidget = await vi.importActual("@vueda/use/useWidget.js").then((m) => m.useWidget);
    });

    afterEach(() => {
        provideStore.clear();
        clearUnmounted();
        vi.clearAllMocks();
    });

    const mountWidgetInContext = (contextOverrides = {}, widgetProps = {}) => {
        const fc = getFieldContextMock(vue);
        Object.assign(fc.state, contextOverrides);
        mockedProvide(FieldContextSymbol, fc);

        const props = getDefaultWidgetProps(vue);
        Object.assign(props, widgetProps);

        const widget = useWidget(vue.readonly(props), emit);
        return { widget, props, fc };
    };

    const mountWidgetNoContext = (widgetProps = {}) => {
        const props = getDefaultWidgetProps(vue);
        Object.assign(props, widgetProps);
        const widget = useWidget(vue.readonly(props), emit);
        return { widget, props };
    };

    const testComputedFromContextOrProps = ({
        widgetComputedProperty,
        propName = widgetComputedProperty,
        contextName = propName,
        contextValue,
        propValue,
        newContextValue = "newContextValue",
        newPropValue = "newPropValue",
        ignoredContextValue = "ignoredContextValue",
    }) => {
        scopedIt(`uses ${propName} from context (${contextName}) if available and not contextless`, async () => {
            const { widget, fc } = mountWidgetInContext(
                { [contextName]: contextValue },
                { [propName]: propValue, contextless: false },
            );

            expect(widget.state[widgetComputedProperty]).toBe(contextValue);
            const [stop, watchSpy] = testWatches(vue, widget.state, widgetComputedProperty);
            try {
                fc.state[contextName] = newContextValue;
                await flushPromises();
                expect(widget.state[widgetComputedProperty]).toBe(newContextValue);
                expect(watchSpy).toHaveBeenCalledWith(newContextValue, contextValue, expect.any(Function));
            } finally {
                stop();
            }
        });

        scopedIt(`uses ${propName} from props when no context is available`, async () => {
            const { widget, props } = mountWidgetNoContext({ [propName]: propValue });
            expect(widget.state[widgetComputedProperty]).toBe(propValue);
            const [stop, watchSpy] = testWatches(vue, widget.state, widgetComputedProperty);
            try {
                props[propName] = newPropValue;
                await flushPromises();
                expect(widget.state[widgetComputedProperty]).toBe(newPropValue);
                expect(watchSpy).toHaveBeenCalledWith(newPropValue, propValue, expect.any(Function));
            } finally {
                stop();
            }
        });

        scopedIt(`uses ${propName} from props when contextless=true`, async () => {
            const { widget, props, fc } = mountWidgetInContext(
                { [contextName]: contextValue },
                { [propName]: propValue, contextless: true },
            );

            expect(widget.state[widgetComputedProperty]).toBe(propValue);
            const [stop, watchSpy] = testWatches(vue, widget.state, widgetComputedProperty);
            try {
                props[propName] = newPropValue;
                await flushPromises();
                expect(widget.state[widgetComputedProperty]).toBe(newPropValue);

                fc.state[contextName] = ignoredContextValue;
                await flushPromises();
                expect(widget.state[widgetComputedProperty]).toBe(newPropValue); // should still ignore context
                expect(watchSpy).toHaveBeenCalledTimes(1);
            } finally {
                stop();
            }
        });
    };

    describe("props", () => {
        describe("Identification & Metadata", () => {
            describe("name", () => {
                scopedIt("should use name if provided", async () => {
                    const { widget, props } = mountWidgetNoContext({
                        name: "asdf",
                    });
                    expect(widget.state.combinedName).toBe("asdf");
                    const [stop, watchSpy] = testWatches(vue, widget.state, "combinedName");
                    try {
                        props.name = "zxcv";
                        expect(widget.state.combinedName).toBe("zxcv");
                        await flushPromises();
                        expect(watchSpy).toHaveBeenCalledTimes(1);
                        expect(watchSpy).toHaveBeenCalledWith("zxcv", "asdf", expect.any(Function));
                    } finally {
                        stop();
                    }
                });
            });
        });
        describe.skip("Display", () => {
            describe.skip("label", () => {});
            describe.skip("help", () => {});
        });

        describe.skip("Validation", () => {
            describe.skip("required", () => {});
        });

        describe.skip("Value Handling", () => {
            describe.skip("modelValue", () => {});
        });

        describe.skip("Disabled Behavior", () => {
            describe.skip("disabled", () => {});
        });

        describe.skip("Field Context Behavior", () => {
            describe.skip("contextless", () => {});
        });
    });

    describe("state", () => {
        describe("Identification & Metadata", () => {
            describe("combinedName", () => {
                testComputedFromContextOrProps({
                    widgetComputedProperty: "combinedName",
                    propName: "name",
                    contextValue: "nameFromContext",
                    propValue: "nameFromProps",
                });
            });
            describe("formModelName", () => {
                scopedIt("should use fieldContext.name if context provided", async () => {
                    const { widget, fc } = mountWidgetInContext(
                        {
                            formModelName: "fcName",
                        },
                        {
                            formModelName: undefined,
                        },
                    );
                    expect(widget.state.formModelName).toBe("fcName");
                    const [stop, watchSpy] = testWatches(vue, widget.state, "formModelName");
                    try {
                        fc.state.formModelName = "fcName2";
                        expect(widget.state.formModelName).toBe("fcName2");
                        await flushPromises();
                        expect(watchSpy).toHaveBeenCalledTimes(1);
                        expect(watchSpy).toHaveBeenCalledWith("fcName2", "fcName", expect.any(Function));
                        fc.state.formModelName = "fcName3";
                        await flushPromises();
                        expect(watchSpy).toHaveBeenCalledTimes(2);
                        expect(watchSpy).toHaveBeenCalledWith("fcName3", "fcName2", expect.any(Function));
                        fc.state.formModelName = "";
                        await flushPromises();
                        expect(watchSpy).toHaveBeenCalledTimes(3);
                        expect(watchSpy).toHaveBeenCalledWith("", "fcName3", expect.any(Function));
                    } finally {
                        stop();
                    }
                });
            });
        });

        describe("Display", () => {
            describe("combinedLabel", () => {
                testComputedFromContextOrProps({
                    widgetComputedProperty: "combinedLabel",
                    propName: "label",
                    contextValue: "labelFromContext",
                    propValue: "labelFromProps",
                });
            });
            describe("help", () => {
                testComputedFromContextOrProps({
                    widgetComputedProperty: "help",
                    contextValue: "helpFromContext",
                    propValue: "helpFromProps",
                });
            });
        });

        describe("Validation", () => {
            describe("required", () => {
                testComputedFromContextOrProps({
                    widgetComputedProperty: "required",
                    contextValue: true,
                    propValue: false,
                    newContextValue: false,
                    newPropValue: true,
                    ignoredContextValue: false, // this needs to be different from newPropValue
                });
            });
            describe("validationState", () => {
                scopedIt("should return { invalid: false, warning: false } if there is no field context", () => {
                    const { widget } = mountWidgetNoContext();
                    expect(widget.state.validationState).toEqual({
                        invalid: false,
                        warning: false,
                    });
                });

                scopedIt("should return { invalid: false, warning: false } if props.contextless = true", () => {
                    const { widget } = mountWidgetInContext(
                        {
                            errors: { someError: "Error!" },
                            messages: { someMessage: "Warning!" },
                        },
                        {
                            contextless: true,
                        },
                    );
                    expect(widget.state.validationState).toEqual({
                        invalid: false,
                        warning: false,
                    });
                });

                scopedIt(
                    "should return { invalid: false, warning: false } if there are no errors and no messages",
                    async () => {
                        const { widget } = mountWidgetInContext({
                            errors: {},
                            messages: {},
                        });
                        expect(widget.state.validationState).toEqual({
                            invalid: false,
                            warning: false,
                        });
                    },
                );

                scopedIt(
                    "should return { invalid: true, warning: false } if there are errors (regardless of messages)",
                    async () => {
                        const { widget, fc } = mountWidgetInContext({
                            errors: { required: "This field is required" },
                            messages: {},
                        });
                        expect(widget.state.validationState).toEqual({
                            invalid: true,
                            warning: false,
                        });

                        fc.state.messages = { note: "Consider a different value" };
                        expect(widget.state.validationState).toEqual({
                            invalid: true,
                            warning: false,
                        });
                    },
                );

                scopedIt(
                    "should return { invalid: false, warning: true } if there are no errors but there are messages",
                    async () => {
                        const { widget } = mountWidgetInContext({
                            errors: {},
                            messages: { note: "Just a heads-up" },
                        });
                        expect(widget.state.validationState).toEqual({
                            invalid: false,
                            warning: true,
                        });
                    },
                );

                scopedIt(
                    "should reflect changes in fieldContext.errors and fieldContext.messages reactively",
                    async () => {
                        const { widget, fc } = mountWidgetInContext({
                            errors: {},
                            messages: {},
                        });
                        expect(widget.state.validationState).toEqual({
                            invalid: false,
                            warning: false,
                        });

                        fc.state.errors = { required: "Must fill in!" };
                        await vue.nextTick();
                        expect(widget.state.validationState).toEqual({
                            invalid: true,
                            warning: false,
                        });

                        fc.state.errors = {};
                        fc.state.messages = { note: "FYI." };
                        await vue.nextTick();
                        expect(widget.state.validationState).toEqual({
                            invalid: false,
                            warning: true,
                        });
                    },
                );
            });
        });

        describe("Value Handling", () => {
            describe("combinedValue", () => {
                scopedIt("uses fieldContext.state.value if context is present and not contextless", () => {
                    const { widget } = mountWidgetInContext(
                        { value: "contextValue" },
                        { modelValue: undefined, contextless: false },
                    );
                    expect(widget.state.combinedValue).toBe("contextValue");
                });
                scopedIt("uses props.modelValue if context is absent", () => {
                    const { widget } = mountWidgetNoContext({ modelValue: "propValue" });
                    expect(widget.state.combinedValue).toBe("propValue");
                });
                scopedIt("emits update:modelValue when setting combinedValue in contextless mode", () => {
                    const { widget } = mountWidgetNoContext({ modelValue: "init" });
                    widget.state.combinedValue = "newVal";
                    expect(emit).toHaveBeenCalledWith("update:modelValue", "newVal");
                });
                scopedIt("setter with context updates fieldContext.state.value if new value is different", () => {
                    const { widget, fc } = mountWidgetInContext(
                        { value: "originalContextValue" },
                        { contextless: false },
                    );
                    expect(widget.state.combinedValue).toBe("originalContextValue");

                    widget.state.combinedValue = "newContextValue";
                    expect(fc.state.value).toBe("newContextValue");
                });
                scopedIt(
                    "setter with context does not update fieldContext.state.value if new value is equal (isEqual check)",
                    () => {
                        const { widget, fc } = mountWidgetInContext(
                            { value: { deep: "object" } },
                            { contextless: false },
                        );
                        // const spy = vi.spyOn(fc.state, "value", "set");
                        const [stop, watchSpy] = testWatches(vue, fc.state, "value", false, true);
                        try {
                            widget.state.combinedValue = { deep: "object" };
                            expect(watchSpy).not.toHaveBeenCalled();
                        } finally {
                            stop();
                        }
                    },
                );
                scopedIt("setter with context ignores props.modelValue if context is present", () => {
                    const { widget, fc } = mountWidgetInContext(
                        { value: "contextHasPriority" },
                        { modelValue: "propValue", contextless: false },
                    );
                    expect(widget.state.combinedValue).toBe("contextHasPriority");

                    widget.state.combinedValue = "someOtherValue";
                    expect(fc.state.value).toBe("someOtherValue");
                    expect(emit).not.toHaveBeenCalledWith("update:modelValue", expect.anything());
                });
                scopedIt("setter with no context emits update:modelValue on setter", () => {
                    const { widget } = mountWidgetNoContext({ modelValue: "initialPropValue" });
                    widget.state.combinedValue = "newPropValue";
                    expect(emit).toHaveBeenCalledWith("update:modelValue", "newPropValue");
                });
                scopedIt(
                    "setter with no context updates localFieldContext.localValue if modelValue is undefined (no emit)",
                    () => {
                        const { widget } = mountWidgetNoContext({
                            modelValue: undefined,
                        });
                        widget.state.combinedValue = "foo";

                        expect(emit).not.toHaveBeenCalledWith("update:modelValue", "foo");
                        expect(widget.state.combinedValue).toBe("foo");
                    },
                );
            });
        });

        describe.skip("Interaction & State Tracking", () => {
            describe.skip("focused", () => {});
        });

        describe("Disabled Behavior", () => {
            describe("disabled", () => {
                scopedIt("should be false by default if props.disabled is false", () => {
                    const { widget } = mountWidgetNoContext({
                        disabled: false,
                        disabledFn: null,
                    });
                    expect(widget.state.disabled).toBe(false);
                });

                scopedIt("should be true if props.disabled is true and no disabledFn is provided", () => {
                    const { widget } = mountWidgetNoContext({
                        disabled: true,
                        disabledFn: null,
                    });
                    expect(widget.state.disabled).toBe(true);
                });

                scopedIt("should be true if props.disabled is true and disabledFn returns true", () => {
                    const { widget, props } = mountWidgetNoContext({
                        disabled: true,
                        disabledFn: vi.fn(() => true),
                    });
                    expect(widget.state.disabled).toBe(true);
                    expect(props.disabledFn).toHaveBeenCalled();
                });

                scopedIt("should be false if props.disabled is true and disabledFn returns false", () => {
                    const { widget, props } = mountWidgetNoContext({
                        disabled: true,
                        disabledFn: vi.fn(() => false),
                    });
                    expect(widget.state.disabled).toBe(false);
                    expect(props.disabledFn).toHaveBeenCalled();
                });

                scopedIt("should update reactively if disabledFn changes its return value", async () => {
                    const returnValue = vue.ref(true);
                    const { widget } = mountWidgetNoContext({
                        disabled: true,
                        disabledFn: vi.fn(() => returnValue.value),
                    });
                    expect(widget.state.disabled).toBe(true);
                    const [stop, watchSpy] = testWatches(vue, widget.state, "disabled");
                    try {
                        returnValue.value = false;
                        await flushPromises();
                        expect(watchSpy).toHaveBeenCalledTimes(1);
                        expect(watchSpy).toHaveBeenCalledWith(false, true, expect.any(Function));

                        expect(widget.state.disabled).toBe(false);
                    } finally {
                        stop();
                    }
                });
            });
        });

        describe("Dependency Management", () => {
            describe("dependencyValues", () => {
                scopedIt(`uses dependencyValues from context if available`, () => {
                    const { widget } = mountWidgetInContext({ dependencyValues: { dep1: "value1", dep2: "value2" } });
                    expect(widget.state.dependencyValues).toEqual({ dep1: "value1", dep2: "value2" });
                });

                scopedIt(`uses default when context is not available`, () => {
                    const { widget } = mountWidgetNoContext();
                    expect(widget.state.dependencyValues).toEqual({});
                });
            });

            scopedIt("registers and unregisters displayDependencies with field context", () => {
                const { fc } = mountWidgetInContext({}, { displayDependencies: ["depA"] });
                expect(fc.registerDependencyValues).toHaveBeenCalledTimes(1);
                const depsRef = fc.registerDependencyValues.mock.calls[0][0];
                expect(vue.unref(depsRef)).toEqual(["depA"]);
                runUnmountedHooks();
                expect(fc.unregisterDependencyValues).toHaveBeenCalledWith("dep-id");
            });
        });
    });

    describe("methods", () => {
        describe("Field Interactions", () => {
            describe("setTouched", () => {
                scopedIt("calls fc.setTouched if context is present and not contextless", () => {
                    const { widget, fc } = mountWidgetInContext({}, { contextless: false });
                    widget.setTouched();
                    // we don't look at the state because that's handled in the field context
                    expect(fc.setTouched).toHaveBeenCalled();
                });
                scopedIt("sets local fallback if contextless=true", () => {
                    const { widget, fc } = mountWidgetInContext({}, { contextless: true });
                    widget.setTouched();
                    expect(widget.state.touched).toBe(true);
                    expect(fc.setTouched).not.toHaveBeenCalled();
                });
                scopedIt("sets local fallback if no context is present", () => {
                    const { widget } = mountWidgetNoContext();
                    widget.setTouched();
                    expect(widget.state.touched).toBe(true);
                    // no fc, so we skip checking expect().not.toHaveBeenCalled()
                });
            });
            describe("clearTouched", () => {
                scopedIt("calls fc.clearTouched if context is present and not contextless", () => {
                    const { widget, fc } = mountWidgetInContext({}, { contextless: false });
                    widget.clearTouched();
                    // we don't look at the state because that's handled in the field context
                    expect(fc.clearTouched).toHaveBeenCalled();
                });
                scopedIt("sets local fallback if contextless=true", () => {
                    const { widget, fc } = mountWidgetInContext(
                        {},
                        {
                            testTouched: true,
                            contextless: true,
                        },
                    );
                    expect(widget.state.touched).toBe(true);
                    widget.clearTouched();
                    expect(widget.state.touched).toBe(false);
                    expect(fc.clearTouched).not.toHaveBeenCalled();
                });
                scopedIt("sets local fallback if no context is present", () => {
                    const { widget } = mountWidgetNoContext({
                        testTouched: true,
                    });
                    expect(widget.state.touched).toBe(true);
                    widget.clearTouched();
                    expect(widget.state.touched).toBe(false);
                    // no fc, so we skip checking expect().not.toHaveBeenCalled()
                });
            });
            describe("focus", () => {
                scopedIt("calls fc.focus if context is present and not contextless", () => {
                    const { widget, fc } = mountWidgetInContext({}, { contextless: false });
                    widget.focus();
                    // we don't look at the state because that's handled in the field context
                    expect(fc.focus).toHaveBeenCalled();
                });
                scopedIt("sets local fallback if contextless=true", () => {
                    const { widget, fc } = mountWidgetInContext({}, { contextless: true });
                    widget.focus();
                    expect(widget.state.focused).toBe(true);
                    expect(fc.focus).not.toHaveBeenCalled();
                });
                scopedIt("sets local fallback if no context is present", () => {
                    const { widget } = mountWidgetNoContext();
                    widget.focus();
                    expect(widget.state.focused).toBe(true);
                    // no fc, so we skip checking expect().not.toHaveBeenCalled()
                });
            });
            describe("blur", () => {
                scopedIt("calls fc.blur if context is present and not contextless", () => {
                    const { widget, fc } = mountWidgetInContext({}, { contextless: false });
                    widget.blur();
                    // we don't look at the state because that's handled in the field context
                    expect(fc.blur).toHaveBeenCalled();
                });
                scopedIt("sets local fallback if contextless=true", () => {
                    const { widget, fc } = mountWidgetInContext(
                        {},
                        {
                            testFocused: true,
                            contextless: true,
                        },
                    );
                    expect(widget.state.focused).toBe(true);
                    widget.blur();
                    expect(widget.state.focused).toBe(false);
                    expect(fc.blur).not.toHaveBeenCalled();
                });
                scopedIt("sets local fallback if no context is present", () => {
                    const { widget } = mountWidgetNoContext({
                        testFocused: true,
                    });
                    expect(widget.state.focused).toBe(true);
                    widget.blur();
                    expect(widget.state.focused).toBe(false);
                    // no fc, so we skip checking expect().not.toHaveBeenCalled()
                });
            });
        });
    });

    describe("integration", () => {
        describe("WidgetContextSymbol", () => {
            scopedIt("provides WidgetContextSymbol with the returned widget context", () => {
                const { widget } = mountWidgetNoContext();
                expect(mockedProvide).toHaveBeenCalledWith(WidgetContextSymbol, widget);
            });
            scopedIt("provides WidgetContextSymbol when in context with the returned widget context", () => {
                const { widget } = mountWidgetInContext();
                expect(mockedProvide).toHaveBeenCalledWith(WidgetContextSymbol, widget);
            });
        });
    });
});
