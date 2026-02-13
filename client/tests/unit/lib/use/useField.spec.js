import { del } from "@arrai-innovations/reactive-helpers";
import { expectReadOnlyWarning, mockLifecycle, mockProvideInject, scopedIt } from "@tests/unit/utils.js";
import { FieldContextSymbol, FormContextSymbol } from "@vueda/utils/symbols.js";
import flushPromises from "flush-promises";
import capitalize from "lodash-es/capitalize.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import set from "lodash-es/set.js";

const { provideStore, mockedProvide, mockedInject } = mockProvideInject(vi);
const { clearUnmounted, unmountedFunctions, mockedOnUnmounted } = mockLifecycle(vi);
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

const getDefaultProps = (vue, name) => {
    return vue.reactive({
        // *** Identification & Metadata ***
        name,
        formModelName: undefined,
        clearServerErrorDependents: [],
        validationDependencies: [],
        readOnly: false,

        // *** Validation ***
        required: null,
        requiredMessage: "This field is required.",
        shouldRequireFn: null,
        isRequiredViolation: null,
        validate: null,

        // *** Display ***
        label: null,
        help: "",

        // *** Value Handling ***
        modelValue: undefined,

        // *** Form Context Behavior ***
        contextless: false,
    });
};

const getFormContextMock = (vue) => {
    return {
        // *** Form State ***
        state: vue.reactive({
            // *** Values & Initial State ***
            values: {},
            initialValues: {},

            // *** Validation & Errors ***
            messages: {},
            errors: {},
            required: {},
            valid: {},

            // *** Interaction & Focus ***
            touched: {},
            modified: {},
            ignored: {},
            focused: {},

            // *** Dependency Management ***
            dependencyValues: {},
        }),

        // *** Form Reset & State Management ***
        reset: vi.fn(),
        formValues: vi.fn(),
        getFirstErrorField: vi.fn(),

        // *** Value & Initial Value Handling ***
        updateValue: vi.fn(),
        deleteValue: vi.fn(),
        updateInitialValue: vi.fn(),
        deleteInitialValue: vi.fn(),

        // *** Error & Message Handling ***
        clearErrors: vi.fn(),
        updateError: vi.fn(),
        deleteError: vi.fn(),
        clearMessages: vi.fn(),
        updateMessage: vi.fn(),
        deleteMessage: vi.fn(),
        handleServerFormValidationError: vi.fn(),
        clearServerErrors: vi.fn(),

        // *** Touch & Focus Management ***
        setTouched: vi.fn(),
        setAllTouched: vi.fn(),
        clearTouched: vi.fn(),
        clearAllTouched: vi.fn(),
        focus: vi.fn(),
        blur: vi.fn(),

        // *** Ignore State Management ***
        ignore: vi.fn(),
        removeIgnore: vi.fn(),

        // *** Hook Registrations ***
        registerIsModifiedHook: vi.fn(),
        unregisterIsModifiedHook: vi.fn(),
        registerIsRequiredHook: vi.fn(),
        unregisterIsRequiredHook: vi.fn(),
        registerIsValidHook: vi.fn(),
        unregisterIsValidHook: vi.fn(),
        registerDependencyValues: vi.fn(),
        unregisterDependencyValues: vi.fn(),
    };
};

describe("lib/use/useField.js", () => {
    let vue, useField, emit;
    beforeEach(async () => {
        emit = vi.fn().mockName("emit");
        vue = await vi.importActual("vue");
        useField = await vi.importActual("@vueda/use/useField.js").then((m) => m.useField);
    });
    afterEach(() => {
        clearUnmounted();
        provideStore.clear();
        vi.clearAllMocks();
    });

    const mountFieldInContext = (contextOverrides = {}, propsOverrides = {}, mockImplementation = {}) => {
        const fc = getFormContextMock(vue);
        Object.assign(fc.state, contextOverrides);
        for (const key in mockImplementation) {
            fc[key] = vi.fn().mockImplementation(mockImplementation[key]);
        }

        mockedProvide(FormContextSymbol, fc);

        const props = getDefaultProps(vue, propsOverrides?.name ?? "testField");
        Object.assign(props, propsOverrides);

        const field = useField(vue.readonly(props), emit);

        return { field, props, fc };
    };

    const mountFieldNoContext = (propsOverrides = {}) => {
        const props = getDefaultProps(vue, propsOverrides?.name ?? "testField");
        Object.assign(props, propsOverrides);

        const field = useField(vue.readonly(props), emit);

        return { field, props };
    };

    describe("props", () => {
        describe("name", () => {
            scopedIt("should populate into state.name, reactively", async () => {
                const { field, props } = mountFieldNoContext({ name: "someName" });

                expect(field.state.name).toEqual("someName");

                props.name = "updatedSomeName";
                await flushPromises();
                expect(field.state.name).toEqual("updatedSomeName");
            });
        });
        describe("formModelName", () => {
            scopedIt("should populate into state.formModelName, reactively", async () => {
                const { field, props } = mountFieldNoContext({ formModelName: "someName" });

                expect(field.state.formModelName).toEqual("someName");

                props.formModelName = "updatedSomeName";
                await flushPromises();
                expect(field.state.formModelName).toEqual("updatedSomeName");
            });
        });
        describe("clearServerErrorDependents", () => {
            scopedIt("should populate into state.clearServerErrorDependents, reactively", async () => {
                const { field, props } = mountFieldNoContext({
                    clearServerErrorDependents: ["someOtherFieldName"],
                });

                expect(field.state.clearServerErrorDependents).toEqual(["someOtherFieldName"]);

                props.clearServerErrorDependents.push("someNewOtherFieldName");
                await flushPromises();
                expect(field.state.clearServerErrorDependents).toEqual(["someOtherFieldName", "someNewOtherFieldName"]);
            });
        });
        describe("validationDependencies", () => {
            scopedIt(
                "should populate state.dependencyValues resolving, based on $parent and non-$parent validationDependencies",
                async () => {
                    const fc = getFormContextMock(vue);
                    mockedProvide(FormContextSymbol, fc);
                    fc.state.initialValues = {
                        field1: "fieldValue1",
                        field2: "fieldValue2",
                        field3: "fieldValue3",
                        fieldSet1: [{ field: "value1" }, { field: "value2" }, { field: "value3" }],
                        fieldSet2: [
                            { otherField: "otherValue1", anotherField: "anotherValue1", thirdField: "thirdValue1" },
                            { otherField: "otherValue2", anotherField: "anotherValue2", thirdField: "thirdValue2" },
                            { otherField: "otherValue3", anotherField: "anotherValue3", thirdField: "thirdValue3" },
                        ],
                    };
                    fc.state.values = cloneDeep(fc.state.initialValues);

                    const props = getDefaultProps(vue, "fieldSet2[1].otherField");
                    props.validationDependencies = ["$parent.anotherField", "field2"];
                    const field = useField(vue.readonly(props), emit);
                    await flushPromises();
                    expect(fc.registerDependencyValues).toHaveBeenCalledTimes(1);
                    expect(fc.registerDependencyValues.mock.calls[0].length).toBe(2);
                    const [fieldRef, depsRef] = fc.registerDependencyValues.mock.calls[0];
                    expect(vue.isRef(fieldRef)).toBe(true);
                    expect(fieldRef.value).toBe("fieldSet2[1].otherField");
                    expect(vue.isRef(depsRef)).toBe(true);
                    expect(depsRef.value).toEqual(["$parent.anotherField", "field2"]);
                    fc.state.dependencyValues["fieldSet2[1].otherField"] = vue.computed(() => ({
                        "$parent.anotherField": fc.state.values.fieldSet2[1].anotherField,
                        field2: fc.state.values.field2,
                    }));

                    // initial state
                    expect(field.state.dependencyValues).toEqual({
                        "$parent.anotherField": "anotherValue2",
                        field2: "fieldValue2",
                    });
                },
            );
        });
        describe("readOnly", () => {
            scopedIt("should populate into state.readOnly, reactively", async () => {
                const { field, props } = mountFieldNoContext({ readOnly: false });

                expect(field.state.readOnly).toBe(false);

                props.readOnly = true;
                await flushPromises();
                expect(field.state.readOnly).toBe(true);
            });
        });
        describe("required", () => {
            scopedIt("should populate into state.required, reactively", async () => {
                const { field, props } = mountFieldNoContext({ required: false });

                expect(field.state.required).toBe(false);

                props.required = true;
                await flushPromises();
                expect(field.state.required).toBe(true);

                props.required = undefined;
                await flushPromises();
                expect(field.state.required).toBe(true);
            });
        });
        describe("requiredMessage", () => {
            scopedIt("should update error message reactively when requiredMessage changes", async () => {
                const props = getDefaultProps(vue, "someName");
                props.required = true;
                props.requiredMessage = "Initial required message.";

                const field = useField(vue.readonly(props), emit);
                await flushPromises();
                expect(field.state.errors).toEqual({});

                // Mark the field as touched to trigger validation
                field.setTouched();
                await flushPromises();
                expect(field.state.errors).toEqual({ required: "Initial required message." });

                // Update requiredMessage to test reactivity
                props.requiredMessage = "Updated required message.";
                await flushPromises();
                expect(field.state.errors).toEqual({ required: "Updated required message." });

                // Reset requiredMessage to null and expect default message
                props.requiredMessage = null;
                await flushPromises();
                expect(field.state.errors).toEqual({ required: "This field is required." });
            });
        });
        describe("shouldRequireFn", () => {
            scopedIt("should affect state.required, reactively on outside refs", async () => {
                const someRef = vue.ref(false);
                const someOtherRef = vue.ref(false);
                const shouldRequireFn = () => {
                    return vue.unref(someRef) || vue.unref(someOtherRef);
                };
                const props = getDefaultProps(vue, "field1");
                props.shouldRequireFn = shouldRequireFn;
                const field = useField(vue.readonly(props), emit);
                await flushPromises();

                // initial state
                expect(field.state.required).toBe(false);

                // make required based on someRef
                someRef.value = true;
                await flushPromises();
                expect(field.state.required).toBe(true);

                // make required based on someOtherRef
                someOtherRef.value = true;
                someRef.value = false;
                await flushPromises();
                expect(field.state.required).toBe(true);

                // clear required
                someOtherRef.value = false;
                await flushPromises();
                expect(field.state.required).toBe(false);
            });
            scopedIt("should affect state.required, reactively based on validationDependencies", async () => {
                const fc = getFormContextMock(vue);
                mockedProvide(FormContextSymbol, fc);
                fc.state.initialValues = {
                    fieldSet1: [{ field: "value1" }, { field: "value2" }, { field: "value3" }],
                    fieldSet2: [
                        { otherField: "otherValue1", anotherField: "anotherValue1", thirdField: "thirdValue1" },
                        { otherField: "otherValue2", anotherField: "anotherValue2", thirdField: "thirdValue2" },
                        { otherField: "otherValue3", anotherField: "anotherValue3", thirdField: "thirdValue3" },
                    ],
                };
                fc.state.values = cloneDeep(fc.state.initialValues);

                const shouldRequireFn = (validationDependencies) => {
                    return !!(
                        validationDependencies["$parent.anotherField"] || validationDependencies["$parent.thirdField"]
                    );
                };
                const props = getDefaultProps(vue, "fieldSet2[1].otherField");
                props.validationDependencies = ["$parent.anotherField", "$parent.thirdField"];
                props.shouldRequireFn = shouldRequireFn;
                const field = useField(vue.readonly(props), emit);
                await flushPromises();
                fc.state.dependencyValues[field.state.name] = vue.computed(() => ({
                    "$parent.anotherField": fc.state.values.fieldSet2[1].anotherField,
                    "$parent.thirdField": fc.state.values.fieldSet2[1].thirdField,
                }));
                // initial state
                expect(field.state.dependencyValues).toEqual({
                    "$parent.anotherField": "anotherValue2",
                    "$parent.thirdField": "thirdValue2",
                });

                // verify is required hook is set up.
                expect(fc.registerIsRequiredHook).toBeCalled();
                expect(fc.registerIsRequiredHook.mock.calls[0][0]).toEqual(field.state.name);
                const hookFn = fc.registerIsRequiredHook.mock.calls[0][1];
                expect(hookFn).toBeTypeOf("function");
                // fake required hook form implementation
                fc.state.required[field.state.name] = vue.computed(() => hookFn());
                await flushPromises();
                expect(field.state.required).toBe(true);

                // change deps so we should no longer be required
                fc.state.values.fieldSet2[1].anotherField = "";
                fc.state.values.fieldSet2[1].thirdField = "";
                await flushPromises();
                expect(field.state.required).toBe(false);

                // reset to required
                fc.state.values.fieldSet2[1].thirdField = "newValue";
                await flushPromises();
                expect(field.state.required).toBe(true);
            });
        });
        describe("isRequiredViolation", () => {
            scopedIt("should use defaultIsRequiredViolation when no custom function is provided", async () => {
                const { field, props } = mountFieldNoContext({
                    modelValue: undefined,
                });
                expect(field.state.valueRequiredViolation).toBe(true);
                props.modelValue = "some value";
                await flushPromises();
                expect(field.state.valueRequiredViolation).toBe(false);
                props.modelValue = false;
                await flushPromises();
                expect(field.state.valueRequiredViolation).toBe(true);
                props.modelValue = "";
                await flushPromises();
                expect(field.state.valueRequiredViolation).toBe(true);
                props.modelValue = 0;
                await flushPromises();
                expect(field.state.valueRequiredViolation).toBe(true);
                props.modelValue = 42;
                await flushPromises();
                expect(field.state.valueRequiredViolation).toBe(false);
            });
            scopedIt(
                "should use a custom isRequiredViolation function when provided, without form context",
                async () => {
                    const customIsRequiredViolation = (value) => value !== "valid";
                    const { field, props } = mountFieldNoContext({
                        isRequiredViolation: customIsRequiredViolation,
                        modelValue: "invalid",
                    });
                    await flushPromises();
                    expect(field.state.valueRequiredViolation).toBe(true);

                    // clear the violation
                    props.modelValue = "valid";
                    await flushPromises();
                    expect(field.state.valueRequiredViolation).toBe(false);
                },
            );
            scopedIt("should use a custom isRequiredViolation function when provided, with form context", async () => {
                const customIsRequiredViolation = (value) => value !== "valid";
                const { field, fc } = mountFieldInContext(
                    {
                        values: {
                            testField: "invalid",
                        },
                    },
                    {
                        isRequiredViolation: customIsRequiredViolation,
                    },
                );

                field.setTouched();
                await flushPromises();

                // verify is required hook is set up.
                expect(fc.registerIsRequiredHook).toBeCalled();
                expect(fc.registerIsRequiredHook.mock.calls[0][0]).toEqual(field.state.name);
                const hookFn = fc.registerIsRequiredHook.mock.calls[0][1];
                expect(hookFn).toBeTypeOf("function");
                // fake required hook form implementation
                fc.state.required[field.state.name] = vue.computed(() => hookFn());

                expect(field.state.required).toBe(true);
                expect(field.state.valueRequiredViolation).toBe(true);

                // clear violation
                fc.state.values.testField = "valid";
                await flushPromises();
                expect(field.state.required).toBe(true);
                expect(field.state.valueRequiredViolation).toBe(false);
            });
        });
        describe("validate", () => {
            // const setupFieldWithValidation = ({
            //     validateFn,
            //     validationDependencies,
            //     fc = null,
            //     initialValues = {},
            //     modelValue,
            //     emit,
            // }) => {
            //     if (fc) {
            //         mockedProvide(FormContextSymbol, fc);
            //         fc.state.values = cloneDeep(initialValues);
            //     }
            //
            //     const props = getDefaultProps(vue, "customField");
            //     props.validate = validateFn;
            //     if (fc) {
            //         if (validationDependencies) {
            //             props.validationDependencies = validationDependencies;
            //         }
            //     } else {
            //         props.modelValue = modelValue;
            //     }
            //
            //     const field = useField(vue.readonly(props), emit);
            //     return { field, props };
            // };
            scopedIt("should validate correctly when not using a form context", async () => {
                const isValid = (value) => {
                    if (value === "invalid") {
                        return "The value is invalid.";
                    }
                    return true;
                };

                const { field, props } = mountFieldNoContext({
                    validate: isValid,
                    modelValue: "valid",
                });
                await flushPromises();

                // initial state
                expect(field.state.value).toEqual("valid");
                expect(field.state.valid).toBe(true);

                // make invalid, but not yet touched
                props.modelValue = "invalid";
                await flushPromises();
                expect(field.state.valid).toBe(true);

                // mark touched to trigger validation
                field.setTouched();
                await flushPromises();
                expect(field.state.value).toEqual("invalid");
                expect(field.state.errors).toEqual({
                    validate: "The value is invalid.",
                });
                expect(field.state.valid).toBe("The value is invalid.");
            });
            scopedIt("should validate correctly when using a form context, with dependency values", async () => {
                const isValid = (value, validationDependencies) => {
                    if (value === "invalid") {
                        return "The value is invalid.";
                    } else if (validationDependencies.siblingField1 === "invalid") {
                        return "Sibling Field 1's value makes this field invalid.";
                    } else if (validationDependencies.siblingField2 === "invalid") {
                        return false;
                    }
                    return true;
                };

                const { field, fc } = mountFieldInContext(
                    {
                        initialValues: {
                            customField: "valid",
                            siblingField1: "valid",
                            siblingField2: "valid",
                        },
                        values: {
                            customField: "valid",
                            siblingField1: "valid",
                            siblingField2: "valid",
                        },
                    },
                    {
                        name: "customField",
                        validate: isValid,
                        modelValue: "valid",
                        validationDependencies: ["siblingField1", "siblingField2"],
                    },
                );
                fc.state.dependencyValues["customField"] = vue.computed(() => ({
                    siblingField1: fc.state.values.siblingField1,
                    siblingField2: fc.state.values.siblingField2,
                }));
                await flushPromises();

                // verify & fake form context hook registration
                expect(fc.registerIsValidHook).toBeCalled();
                expect(fc.registerIsValidHook.mock.calls[0][0]).toEqual(field.state.name);
                const hookFn = fc.registerIsValidHook.mock.calls[0][1]; // hookFn should be the internal amIValid
                expect(hookFn).toBeTypeOf("function");
                expect(field.state.dependencyValues).toEqual({
                    siblingField1: "valid",
                    siblingField2: "valid",
                });
                fc.state.valid[field.state.name] = vue.computed(hookFn);
                await flushPromises();

                // initial state
                expect(field.state.value).toEqual("valid");
                expect(field.state.valid).toBe(true);
                expect(fc.updateError).not.toHaveBeenCalled();
                expect(fc.deleteError).toHaveBeenCalledTimes(2);
                expect(fc.deleteError).toHaveBeenCalledWith(field.state.name, "validate");
                expect(fc.deleteError).toHaveBeenCalledWith(field.state.name, "required");
                expect(field.state.errors).toEqual({});

                // invalidate field's value
                fc.state.values[field.state.name] = "invalid";
                await flushPromises();
                expect(field.state.value).toEqual("invalid");
                expect(field.state.valid).toBe(true);
                expect(fc.updateError).not.toHaveBeenCalled();

                // touch field to trigger validation
                fc.state.touched.customField = true;
                await flushPromises();
                expect(field.state.value).toEqual("invalid");
                expect(field.state.valid).toBe("The value is invalid.");

                // verify & fake updateErrors call
                expect(fc.updateError).toHaveBeenCalledWith(field.state.name, "validate", "The value is invalid.");
                fc.state.errors[field.state.name] = {
                    validate: "The value is invalid.",
                };
                await flushPromises();
                expect(field.state.errors).toEqual({
                    validate: "The value is invalid.",
                });

                // revalidate to get siblingField1's validation error
                fc.state.values[field.state.name] = "valid";
                fc.state.values.siblingField1 = "invalid";
                await flushPromises();
                expect(field.state.dependencyValues).toEqual({
                    siblingField1: "invalid",
                    siblingField2: "valid",
                });
                expect(fc.state.valid[field.state.name]).toBe("Sibling Field 1's value makes this field invalid.");
                expect(field.state.valid).toBe("Sibling Field 1's value makes this field invalid.");

                // verify & fake updateErrors call
                expect(fc.updateError).toHaveBeenCalledWith(
                    field.state.name,
                    "validate",
                    "Sibling Field 1's value makes this field invalid.",
                );
                fc.state.errors[field.state.name]["validate"] = "Sibling Field 1's value makes this field invalid.";
                await flushPromises();
                expect(field.state.errors).toEqual({ validate: "Sibling Field 1's value makes this field invalid." });

                // revalidate to get siblingField2's error (default validation error)
                fc.state.values.siblingField1 = "valid";
                fc.state.values.siblingField2 = "invalid";
                await flushPromises();
                expect(field.state.dependencyValues).toEqual({
                    siblingField1: "valid",
                    siblingField2: "invalid",
                });
                expect(fc.state.valid[field.state.name]).toBe("Validation Failed");
                expect(field.state.valid).toBe("Validation Failed");
                expect(fc.updateError).toHaveBeenCalledWith(field.state.name, "validate", "Validation Failed");

                fc.state.errors[field.state.name]["validate"] = "Validation Failed";
                await flushPromises();
                expect(field.state.errors).toEqual({ validate: "Validation Failed" });

                // reset to valid state
                fc.state.values.siblingField2 = "valid";
                fc.deleteError.mockReset();
                await flushPromises();
                expect(field.state.dependencyValues).toEqual({
                    siblingField1: "valid",
                    siblingField2: "valid",
                });
                expect(fc.state.valid[field.state.name]).toBe(true);

                // verify & fake deleteError call
                expect(fc.deleteError).toHaveBeenCalledTimes(1);
                expect(fc.deleteError).toHaveBeenCalledWith(field.state.name, "validate");
                delete fc.state.errors[field.state.name];
                await flushPromises();
                expect(field.state.errors).toEqual({});
            });
        });
        describe("label", () => {
            scopedIt("should default to the field name when no label is provided", async () => {
                // Create a field with only a name (label is null by default)
                const { field } = mountFieldNoContext({ name: "testField" });
                await flushPromises();

                // When label is null or empty, computed label should fall back to the name
                expect(field.state.label).toEqual("testField");
            });

            scopedIt("should use the provided label when it is set", async () => {
                const { field, props } = mountFieldNoContext({ name: "testField" });

                // Set a custom label
                props.label = "Custom Label";
                await flushPromises();
                expect(field.state.label).toEqual("Custom Label");
            });

            scopedIt("should update reactively when the label prop changes", async () => {
                const { field, props } = mountFieldNoContext({ name: "testField" });

                // Initially set a custom label
                props.label = "Initial Label";
                await flushPromises();
                expect(field.state.label).toEqual("Initial Label");

                // Update the label and check for reactive update
                props.label = "Updated Label";
                await flushPromises();
                expect(field.state.label).toEqual("Updated Label");

                // If label is set to an empty string, it should fall back to the field name
                props.label = "";
                await flushPromises();
                expect(field.state.label).toEqual("testField");
            });
        });
        describe("help", () => {
            scopedIt("should populate into state.help, reactively", async () => {
                const { field, props } = mountFieldNoContext({
                    help: "Some help message.",
                });

                expect(field.state.help).toEqual("Some help message.");

                props.help = "Some updated help message.";
                await flushPromises();
                expect(field.state.help).toEqual("Some updated help message.");
            });
        });
        describe("modelValue", () => {
            scopedIt(
                "should initialize state.value from props.modelValue when no form context is provided",
                async () => {
                    const { field } = mountFieldNoContext({
                        modelValue: "initial value",
                    });
                    await flushPromises();

                    // Without a form context, state.value should be equal to modelValue.
                    expect(field.state.value).toEqual("initial value");
                },
            );

            scopedIt(
                "should update state.value reactively when props.modelValue changes in contextless mode",
                async () => {
                    const { field, props } = mountFieldNoContext({
                        modelValue: "initial value",
                    });
                    await flushPromises();
                    expect(field.state.value).toEqual("initial value");

                    // Changing the modelValue prop should update the computed state.value.
                    props.modelValue = "updated value";
                    await flushPromises();
                    expect(field.state.value).toEqual("updated value");
                },
            );

            scopedIt("should emit update:modelValue when state.value is set in contextless mode", async () => {
                const { field } = mountFieldNoContext({
                    modelValue: "initial value",
                });
                await flushPromises();

                // Setting the computed value should emit the update event.
                field.state.value = "new value";
                await flushPromises();
                expect(emit).toHaveBeenCalledWith("update:modelValue", "new value");
            });

            scopedIt("should not emit update:modelValue if the new value equals the current state.value", async () => {
                const { field } = mountFieldNoContext({
                    modelValue: "same value",
                });
                await flushPromises();

                // Assigning the same value should not trigger an update.
                field.state.value = "same value";
                await flushPromises();
                expect(emit).not.toHaveBeenCalled();
            });

            scopedIt("should delegate value handling to the form context when one is provided", async () => {
                const { field, fc } = mountFieldInContext(
                    {
                        values: {
                            testField: "context value",
                        },
                    },
                    {
                        modelValue: "initial value",
                    },
                );
                await flushPromises();

                // When a form context is present, state.value is derived from the context.
                expect(field.state.value).toEqual("context value");

                // Setting state.value should trigger the form context's update method.
                field.state.value = "new context value";
                await flushPromises();
                expect(fc.updateValue).toHaveBeenCalledWith("testField", "new context value");
            });
        });
        describe("contextless", () => {
            scopedIt("should not use FormContextSymbol when contextless is true", async () => {
                const { field } = mountFieldNoContext({
                    contextless: true,
                });
                await flushPromises();

                expect(mockedInject).toHaveBeenCalledWith(FormContextSymbol, null);
                expect(field.state.value).toBeUndefined(); // No form context, so value is from modelValue
            });

            scopedIt("should use FormContextSymbol when contextless is false", async () => {
                const { field } = mountFieldInContext(
                    {
                        values: {
                            testField: "form context value",
                        },
                    },
                    {
                        contextless: false,
                    },
                );
                await flushPromises();

                expect(mockedInject).toHaveBeenCalledWith(FormContextSymbol, null);
                expect(field.state.value).toEqual("form context value");
            });
        });
    });
    describe("state", () => {
        describe("Identification & Metadata", () => {
            describe("name", () => {
                scopedIt("should not allow updates", async () => {
                    const { field } = mountFieldNoContext({ name: "someName" });
                    expect(field.state.name).toEqual("someName");

                    expectReadOnlyWarning(() => {
                        field.state.name = "updatedSomeName";
                    }, "name");
                });
            });
            describe("formModelName", () => {
                scopedIt("should not allow updates", async () => {
                    const { field } = mountFieldNoContext({ formModelName: "someFormModelName" });
                    expect(field.state.formModelName).toEqual("someFormModelName");

                    expectReadOnlyWarning(() => {
                        field.state.formModelName = "updatedSomeFormModelName";
                    }, "formModelName");
                });
            });
            describe("clearServerErrorDependents", () => {
                scopedIt("should not allow updates", async () => {
                    const { field } = mountFieldNoContext({
                        clearServerErrorDependents: ["someDependentName"],
                    });
                    expect(field.state.clearServerErrorDependents).toEqual(["someDependentName"]);

                    expectReadOnlyWarning(() => {
                        field.state.clearServerErrorDependents = ["someNewDependentName"];
                    }, "clearServerErrorDependents");
                });
            });
            describe("validationDependencies", () => {
                scopedIt("should not allow updates", async () => {
                    const { field } = mountFieldNoContext({
                        validationDependencies: ["someDependencyName"],
                    });
                    expect(field.state.validationDependencies).toEqual(["someDependencyName"]);

                    expectReadOnlyWarning(() => {
                        field.state.validationDependencies = ["someNewDependencyName"];
                    }, "validationDependencies");
                });
            });
            describe("readOnly", () => {
                scopedIt("should not allow updates", async () => {
                    const { field } = mountFieldNoContext({ readOnly: true });
                    expect(field.state.readOnly).toBe(true);

                    expectReadOnlyWarning(() => {
                        field.state.readOnly = false;
                    }, "readOnly");
                });
            });
        });
        describe("Validation", () => {
            describe("required", () => {
                scopedIt("should derive from the form context when available", async () => {
                    const { field, fc } = mountFieldInContext(
                        {},
                        {
                            name: "someName",
                        },
                    );

                    fc.state.required["someName"] = true;
                    await flushPromises();
                    expect(field.state.required).toBe(true);

                    fc.state.required["someName"] = false;
                    await flushPromises();
                    expect(field.state.required).toBe(false);
                });
                scopedIt("should respect explicit boolean values", async () => {
                    const { field, props } = mountFieldNoContext({
                        required: false,
                    });
                    // modelValue as undefined
                    expect(field.state.required).toBe(false);
                    expect(field.state.valueRequiredViolation).toBe(false);

                    props.required = true;
                    await flushPromises();
                    expect(field.state.required).toBe(true);
                    expect(field.state.valueRequiredViolation).toBe(true);

                    props.required = false;
                    await flushPromises();
                    expect(field.state.required).toBe(false);
                    expect(field.state.valueRequiredViolation).toBe(false);
                });
                // todo: check this test, name seems off.
                scopedIt(
                    "should computed as if shouldRequireFn was defaultValidateRequired when props.required and props.shouldRequireFn is null",
                    async () => {
                        const { field, props } = mountFieldNoContext({
                            required: null,
                        });
                        // modelValue as undefined
                        expect(field.state.required).toBe(true);
                        expect(field.state.valueRequiredViolation).toBe(true);

                        props.modelValue = null;
                        await flushPromises();
                        expect(field.state.required).toBe(true);
                        expect(field.state.valueRequiredViolation).toBe(true);

                        props.modelValue = "someValue";
                        await flushPromises();
                        expect(field.state.required).toBe(true);
                        expect(field.state.valueRequiredViolation).toBe(false);
                    },
                );
                scopedIt("should update reactively with ignored or readOnly state changes", async () => {
                    const { field, props } = mountFieldNoContext({
                        required: true,
                    });
                    expect(field.state.required).toBe(true);
                    expect(field.state.valueRequiredViolation).toBe(true);

                    props.readOnly = true;
                    await flushPromises();
                    expect(field.state.required).toBe(false);
                    expect(field.state.valueRequiredViolation).toBe(false);

                    // modelValue change should have no effect
                    props.modelValue = "someValue";
                    await flushPromises();
                    expect(field.state.required).toBe(false);
                    expect(field.state.valueRequiredViolation).toBe(false);

                    props.readOnly = false;
                    field.ignore();
                    await flushPromises();
                    expect(field.state.required).toBe(false);
                    expect(field.state.valueRequiredViolation).toBe(false);

                    field.removeIgnore();
                    await flushPromises();
                    expect(field.state.required).toBe(true);
                    expect(field.state.valueRequiredViolation).toBe(false);

                    props.modelValue = null;
                    await flushPromises();
                    expect(field.state.required).toBe(true);
                    expect(field.state.valueRequiredViolation).toBe(true);
                });
                scopedIt(
                    "should update and clear required errors in form context based on required violation",
                    async () => {
                        const { field, fc } = mountFieldInContext(
                            {
                                required: {
                                    testField: true,
                                },
                            },
                            {
                                name: "testField",
                                required: true,
                                requiredMessage: "Field is required",
                                modelValue: "",
                            },
                        );
                        await flushPromises();
                        expect(fc.state.errors).toEqual({});
                        expect(field.state.required).toBe(true);
                        expect(field.state.valueRequiredViolation).toBe(true);

                        fc.state.touched.testField = true;
                        await flushPromises();
                        expect(fc.updateError).toHaveBeenCalledWith("testField", "required", "Field is required");
                        set(fc.state.errors, "testField.required", "Field is required");
                        expect(fc.state.errors).toEqual({ testField: { required: "Field is required" } });

                        fc.state.values.testField = "new value";
                        await flushPromises();
                        expect(fc.deleteError).toHaveBeenCalledWith("testField", "required");
                        del(fc.state.errors, "testField");
                        expect(field.state.errors).toEqual({});
                    },
                );
            });
            describe("valid", () => {
                scopedIt("should not allow updates", async () => {
                    const { field } = mountFieldNoContext({
                        valid: true,
                    });

                    expectReadOnlyWarning(() => {
                        field.state.valid = false;
                    }, "valid");
                });
                scopedIt(
                    "should clear validation error when valid changes from false to true without form context",
                    async () => {
                        const { field, props } = mountFieldNoContext({
                            modelValue: "invalid",
                            validate: (value) => (value === "valid" ? true : "Invalid value"),
                        });
                        await flushPromises();

                        field.setTouched();
                        await flushPromises();
                        expect(field.state.errors).toEqual({ validate: "Invalid value" });

                        props.modelValue = "valid";
                        await flushPromises();
                        expect(field.state.errors).toEqual({});
                    },
                );
            });
        });
        describe("Display", () => {
            describe("label", () => {
                scopedIt("should not allow updates", async () => {
                    const { field } = mountFieldNoContext({
                        label: "Some Label",
                    });

                    expectReadOnlyWarning(() => {
                        field.state.label = "Some Label";
                    }, "label");
                });
            });
            describe("help", () => {
                scopedIt("should not allow updates", async () => {
                    const { field } = mountFieldNoContext({});

                    expectReadOnlyWarning(() => {
                        field.state.help = "some help";
                    }, "help");
                });
            });
        });
        describe("Value Handling", () => {
            describe("value", () => {
                scopedIt("should call fc deleteValue when setting to undefined", async () => {
                    const { field, fc } = mountFieldInContext(
                        {
                            values: {
                                someName: "some value",
                            },
                        },
                        {
                            name: "someName",
                        },
                    );
                    fc.deleteValue.mockReset();

                    field.state.value = undefined;
                    // delete field.state.value;
                    await flushPromises();
                    expect(fc.deleteValue).toBeCalledTimes(1);
                    expect(fc.deleteValue).toBeCalledWith("someName");
                });
            });
            describe("submittingValue", () => {
                scopedIt("should return the value from fc when provided", async () => {
                    const { field } = mountFieldInContext(
                        {
                            submittingValues: { testField: "context-submitting" },
                        },
                        {
                            name: "testField",
                            modelValue: "ignored-value",
                        },
                    );
                    await flushPromises();
                    expect(field.state.submittingValue).toEqual("context-submitting");
                });

                scopedIt("should return undefined when the entire field is ignored (contextless mode)", async () => {
                    const { field } = mountFieldInContext(
                        {
                            submittingValues: { testField: "context-submitting" },
                        },
                        {
                            name: "testField",
                            modelValue: "value",
                            contextless: true,
                        },
                    );
                    await flushPromises();
                    expect(field.state.submittingValue).toEqual("value");

                    field.ignore();
                    await flushPromises();
                    expect(field.state.submittingValue).toBeUndefined();
                });

                scopedIt("should filter out ignored elements from an array (contextless mode)", async () => {
                    const { field } = mountFieldInContext(
                        {},
                        {
                            modelValue: ["a", "b", "c"],
                            contextless: true,
                        },
                    );
                    await flushPromises();
                    expect(field.state.submittingValue).toEqual(["a", "b", "c"]);

                    // Ignore the element at index 1 by using the key "testField[1]".
                    field.ignore("testField[1]");
                    await flushPromises();

                    // Expected to remove the second element.
                    expect(field.state.submittingValue).toEqual(["a", "c"]);
                });

                scopedIt("should omit ignored keys from an object (contextless mode)", async () => {
                    const { field } = mountFieldInContext(
                        {},
                        {
                            modelValue: { key1: "val1", key2: "val2" },
                            contextless: true,
                        },
                    );
                    await flushPromises();
                    expect(field.state.submittingValue).toEqual({ key1: "val1", key2: "val2" });

                    // Ignore the property "key2".
                    field.ignore("key2");
                    await flushPromises();

                    // Expected to remove key2 from the object.
                    expect(field.state.submittingValue).toEqual({ key1: "val1" });
                });

                scopedIt("should return a primitive value directly (contextless mode)", async () => {
                    const { field } = mountFieldInContext(
                        {},
                        {
                            modelValue: "primitive",
                            contextless: true,
                        },
                    );
                    await flushPromises();

                    expect(field.state.submittingValue).toEqual("primitive");
                });
            });
            describe.skip("initialValue", () => {});
            describe("valueIsInitial", () => {
                scopedIt("should not allow updates", async () => {
                    const { field } = mountFieldInContext();

                    expectReadOnlyWarning(() => {
                        field.state.valueIsInitial = "some value";
                    }, "valueIsInitial");
                });
            });
            describe("initialValueUnset", () => {
                scopedIt("should not allow updates", async () => {
                    const { field } = mountFieldInContext();

                    expectReadOnlyWarning(() => {
                        field.state.initialValueUnset = "some value";
                    }, "initialValueUnset");
                });
            });
            describe("valueUnset", () => {
                scopedIt("should not allow updates", async () => {
                    const { field } = mountFieldInContext();

                    expectReadOnlyWarning(() => {
                        field.state.valueUnset = "some value";
                    }, "valueUnset");
                });
            });
            describe("valueRequiredViolation", () => {
                scopedIt("should not allow updates", async () => {
                    const { field } = mountFieldInContext();

                    expectReadOnlyWarning(() => {
                        field.state.valueRequiredViolation = "some value";
                    }, "valueRequiredViolation");
                });
            });
        });
        describe("Messages & Errors", () => {
            describe("messages", () => {
                scopedIt("should not allow updates", async () => {
                    const { field } = mountFieldInContext();

                    expectReadOnlyWarning(() => {
                        field.state.messages = { code: "some other message" };
                    }, "messages");
                    field.state.messages.code = "some error";
                    expect(field.state.messages).toEqual({});
                });
            });
            describe("errors", () => {
                scopedIt("should not allow updates", async () => {
                    const { field } = mountFieldInContext();

                    expectReadOnlyWarning(() => {
                        field.state.errors = { code: "some other error" };
                    }, "errors");
                    field.state.errors.code = "some error";
                    expect(field.state.errors).toEqual({});
                });
                scopedIt(
                    "handles the case where fc.state.errors[props.name] is not undefined when checking existingRequired",
                    async () => {
                        const { fc, props } = mountFieldInContext(
                            {
                                errors: {
                                    testField: {
                                        required: "Test is required",
                                    },
                                },
                                touched: {},
                                values: { testField: "non-violation value" },
                            },
                            {
                                name: "testField",
                                required: true,
                                requiredMessage: "Test is required",
                            },
                        );
                        fc.state.required.testField = true; // this would be a computed
                        expect(fc.state.errors.testField).toEqual({
                            required: "Test is required",
                        });

                        props.requiredMessage = "Test is super required";
                        fc.state.values.testField = ""; // now a violation
                        fc.state.touched.testField = true;
                        await flushPromises();
                        expect(fc.updateError).toHaveBeenCalledWith("testField", "required", "Test is super required");
                    },
                );
            });
        });
        describe("Interaction & State Tracking", () => {
            describe("touched", () => {
                scopedIt(
                    "should update touched state when setTouched and clearTouched are called, contextless",
                    async () => {
                        const { field } = mountFieldNoContext();

                        // Initially untouched
                        expect(field.state.touched).toBe(false);

                        // Set touched
                        field.setTouched();
                        await flushPromises();
                        expect(field.state.touched).toBe(true);

                        // Clear touched
                        field.clearTouched();
                        await flushPromises();
                        expect(field.state.touched).toBe(false);
                    },
                );
                scopedIt(
                    "should update touched state when setTouched and clearTouched are called, in form context",
                    async () => {
                        const { field, fc } = mountFieldInContext();

                        // Initially untouched
                        expect(field.state.touched).toBe(false);

                        // Set touched
                        field.setTouched();
                        await flushPromises();
                        expect(fc.setTouched).toBeCalledWith(field.state.name);
                        fc.state.touched[field.state.name] = true;
                        await flushPromises();
                        expect(field.state.touched).toBe(true);

                        // Clear touched
                        field.clearTouched();
                        await flushPromises();
                        expect(fc.clearTouched).toBeCalledWith(field.state.name);
                        delete fc.state.touched[field.state.name];
                        expect(field.state.touched).toBe(false);
                    },
                );
            });
            describe("modified", () => {
                scopedIt("should update modified state when the field's value changes, contextless", async () => {
                    const { field, props } = mountFieldInContext(
                        {},
                        {
                            modelValue: "initial",
                            contextless: true,
                        },
                    );

                    // Initially not modified
                    expect(field.state.modified).toBe(false);

                    // Change the value (in contextless mode, this should trigger an emit)
                    field.state.value = "changed";
                    await flushPromises();
                    expect(emit).toHaveBeenCalledWith("update:modelValue", "changed");

                    props.modelValue = "changed";
                    await flushPromises();
                    expect(field.state.modified).toBe(true);
                });
                scopedIt("should update modified state when the field's value changes, in form context", async () => {
                    const { field, fc } = mountFieldInContext(
                        {
                            initialValues: {
                                testField: "initial",
                            },
                            values: {
                                testField: "initial",
                            },
                            submittingValues: {
                                testField: "initial",
                            },
                        },
                        {
                            name: "testField",
                            modelValue: "initial",
                        },
                    );
                    // Initially not modified
                    expect(field.state.modified).toBe(false);
                    await flushPromises();

                    // verify is modified hook is set up.
                    expect(fc.registerIsModifiedHook).toBeCalled();
                    expect(fc.registerIsModifiedHook.mock.calls[0][0]).toEqual(field.state.name);
                    const hookFn = fc.registerIsModifiedHook.mock.calls[0][1];
                    expect(hookFn).toBeTypeOf("function");
                    expect(field.state.valueIsInitial).toBe(true);
                    expect(hookFn()).toBe(false);
                    // fake modified hook form implementation
                    fc.state.modified[field.state.name] = vue.computed(() => hookFn());
                    await flushPromises();
                    expect(field.state.modified).toBe(false);

                    // Change the value
                    fc.state.values.testField = "changed";
                    // fake form updates to submittingValues
                    fc.state.submittingValues.testField = "changed";
                    await flushPromises();
                    expect(field.state.modified).toBe(true);
                });
                scopedIt("should be modified when value becomes unset while initial value remains set", async () => {
                    const { field, props } = mountFieldNoContext({
                        modelValue: "initial value",
                    });
                    await flushPromises();
                    expect(field.state.valueIsInitial).toBe(true);
                    expect(field.state.ignored).toBe(false);
                    expect(field.state.initialValueUnset).toBe(false);
                    expect(field.state.valueUnset).toBe(false);
                    expect(field.state.modified).toBe(false);

                    // now 'unset' the value, and ensure we are now modified.
                    props.modelValue = "";
                    await flushPromises();
                    expect(field.state.valueIsInitial).toBe(false);
                    expect(field.state.ignored).toBe(false);
                    expect(field.state.initialValueUnset).toBe(false);
                    expect(field.state.valueUnset).toBe(true);
                    expect(field.state.modified).toBe(true);
                });
                scopedIt("should not be modified when both initialValueUnset and valueUnset are true", async () => {
                    const { field, props } = mountFieldNoContext({
                        modelValue: "",
                    });
                    expect(field.state.valueIsInitial).toBe(true);
                    expect(field.state.ignored).toBe(false);
                    expect(field.state.initialValueUnset).toBe(true);
                    expect(field.state.valueUnset).toBe(true);
                    expect(field.state.modified).toBe(false);
                    await flushPromises();
                    props.modelValue = null;
                    expect(field.state.valueIsInitial).toBe(false);
                    expect(field.state.ignored).toBe(false);
                    expect(field.state.initialValueUnset).toBe(true);
                    expect(field.state.valueUnset).toBe(true);
                    expect(field.state.modified).toBe(false);
                });
            });

            describe("ignored", () => {
                scopedIt(
                    "should update ignored state when ignore and removeIgnore are called, contextless",
                    async () => {
                        const { field } = mountFieldNoContext({});

                        // Initially not ignored
                        expect(field.state.ignored).toBe(false);

                        // Mark as ignored
                        field.ignore();
                        await flushPromises();
                        expect(field.state.ignored).toBe(true);

                        // Remove ignored status
                        field.removeIgnore();
                        await flushPromises();
                        expect(field.state.ignored).toBe(false);
                    },
                );
                scopedIt("should contribute to modified when valueIsInitial is false", async () => {
                    const { field, props } = mountFieldNoContext({});

                    // in order to reach ignored in amIModified, valueIsInitial must be false.
                    props.modelValue = "value";
                    expect(field.state.valueIsInitial).toBe(false);

                    // Initially not ignored
                    expect(field.state.ignored).toBe(false);
                    expect(field.state.modified).toBe(true);

                    // Mark as ignored
                    field.ignore();
                    await flushPromises();
                    expect(field.state.ignored).toBe(true);
                    expect(field.state.modified).toBe(false);

                    // Remove ignored status
                    field.removeIgnore();
                    await flushPromises();
                    expect(field.state.ignored).toBe(false);
                    expect(field.state.modified).toBe(true);
                });
            });
            describe("focused", () => {
                scopedIt("should update focused state when focus and blur are called, contextless", async () => {
                    const { field } = mountFieldNoContext({});

                    // Initially not focused
                    expect(field.state.focused).toBe(false);

                    // Set focus
                    field.focus();
                    await flushPromises();
                    expect(field.state.focused).toBe(true);

                    // Remove focus
                    field.blur();
                    await flushPromises();
                    expect(field.state.focused).toBe(false);
                });
            });
        });
        describe("Dependency Management", () => {
            describe("dependencyValues", () => {
                scopedIt("should not allow updates", async () => {
                    const { field } = mountFieldNoContext({
                        validationDependencies: ["some", "thing"],
                    });

                    expectReadOnlyWarning(() => {
                        field.state.dependencyValues = ["some", "values"];
                    }, "dependencyValues");
                });
            });
        });
    });
    describe("methods", () => {
        describe("Value Management", () => {
            describe("updateValue", () => {
                scopedIt("should call fc.updateValue from updateValue()", async () => {
                    const { fc, field } = mountFieldInContext({}, { name: "testField" });
                    field.updateValue("newVal");
                    expect(fc.updateValue).toHaveBeenCalledWith("testField", "newVal");
                });
                scopedIt("should emit when called without a context", async () => {
                    const { field } = mountFieldNoContext({
                        modelValue: "something",
                    });
                    await flushPromises();

                    field.updateValue("newVal");
                    expect(emit).toHaveBeenCalledTimes(1);
                    expect(emit).toHaveBeenCalledWith("update:modelValue", "newVal");
                });
            });
            describe("deleteValue", () => {
                scopedIt("should call the fc's method with args", async () => {
                    const { fc, field } = mountFieldInContext({}, { name: "testField" });
                    field.deleteValue();
                    expect(fc.deleteValue).toHaveBeenCalledTimes(1);
                    expect(fc.deleteValue).toHaveBeenCalledWith("testField");
                });
                scopedIt("should emit when called without a context", async () => {
                    const { field } = mountFieldNoContext({
                        modelValue: "something",
                    });
                    await flushPromises();

                    field.deleteValue();
                    expect(emit).toHaveBeenCalledTimes(1);
                    expect(emit).toHaveBeenCalledWith("update:modelValue", undefined);
                });
            });
            describe("updateInitialValue", () => {
                scopedIt("should call fc.updateInitialValue from updateInitialValue()", async () => {
                    const { fc, field } = mountFieldInContext({}, { name: "testField" });
                    field.updateInitialValue("newVal");
                    expect(fc.updateInitialValue).toHaveBeenCalledTimes(1);
                    expect(fc.updateInitialValue).toHaveBeenCalledWith("testField", "newVal");
                });
                scopedIt("should work when called without a context", async () => {
                    const { field } = mountFieldNoContext({
                        modelValue: "something",
                    });
                    await flushPromises();
                    expect(field.state.initialValue).toEqual("something");

                    field.updateInitialValue("newVal");
                    expect(field.state.initialValue).toEqual("newVal");
                });
            });
            describe("deleteInitialValue", () => {
                scopedIt("should call the fc's method with args", async () => {
                    const { fc, field } = mountFieldInContext({}, { name: "testField" });
                    field.deleteInitialValue();
                    expect(fc.deleteInitialValue).toHaveBeenCalledTimes(1);
                    expect(fc.deleteInitialValue).toHaveBeenCalledWith("testField");
                });
                scopedIt("should emit when called without a context", async () => {
                    const { field } = mountFieldNoContext({
                        modelValue: "something",
                    });
                    await flushPromises();
                    expect(field.state.initialValue).toEqual("something");

                    field.deleteInitialValue();
                    expect(field.state.initialValue).toBeUndefined();
                });
            });
        });
        describe.each([
            {
                label: "Error Handling",
                updateMethod: "updateError",
                deleteMethod: "deleteError",
                clearMethod: "clearErrors",
                stateKey: "errors",
            },
            {
                label: "Message Handling",
                updateMethod: "updateMessage",
                deleteMethod: "deleteMessage",
                clearMethod: "clearMessages",
                stateKey: "messages",
            },
        ])("$label", ({ label, updateMethod, deleteMethod, clearMethod, stateKey }) => {
            const labelLower = label.toLowerCase();
            describe(`${clearMethod}`, () => {
                scopedIt("should call the fc's method with args, in context", async () => {
                    const { fc, field } = mountFieldInContext({}, { name: "testField" });
                    field[clearMethod](99);
                    expect(fc[clearMethod]).toHaveBeenCalledTimes(1);
                    expect(fc[clearMethod]).toHaveBeenCalledWith("testField", 99);
                });
                scopedIt("should call the fc's method with args, contextless", async () => {
                    const { fc, field } = mountFieldInContext(
                        {},
                        {
                            name: "testField",
                            [`test${capitalize(stateKey)}`]: {
                                required: "Some error",
                            },
                            contextless: true,
                        },
                    );
                    field[clearMethod](99);
                    expect(fc[clearMethod]).toHaveBeenCalledTimes(0);
                    expect(field.state[stateKey]).toEqual({}); // should clear the state
                });
                scopedIt("should call the fc's method with args, no context", async () => {
                    const { field } = mountFieldNoContext({
                        name: "testField",
                        [`test${capitalize(stateKey)}`]: {
                            required: "Some error",
                        },
                    });
                    field[clearMethod](99);
                    expect(field.state[stateKey]).toEqual({}); // should clear the state
                });
            });
            describe(`${updateMethod}`, () => {
                scopedIt("should call the fc's method with args", async () => {
                    const { fc, field } = mountFieldInContext({}, { name: "testField" });
                    field[updateMethod]("someCode", "someMessage");
                    expect(fc[updateMethod]).toHaveBeenCalledTimes(1);
                    expect(fc[updateMethod]).toHaveBeenCalledWith("testField", "someCode", "someMessage");
                });
                scopedIt(`should set a new ${labelLower} if one did not exist before`, async () => {
                    const { field } = mountFieldNoContext();
                    await flushPromises();

                    const expectedMessage = `Initial ${labelLower}`;
                    field[updateMethod]("info", expectedMessage);
                    await flushPromises();
                    expect(field.state[stateKey]).toEqual({ info: expectedMessage });
                });

                scopedIt(`should do nothing if the ${labelLower} is already the same`, async () => {
                    const { field } = mountFieldNoContext();
                    await flushPromises();

                    const expectedMessage = `Same ${labelLower}`;
                    field[updateMethod]("info", expectedMessage);
                    await flushPromises();
                    const before = field.state[stateKey];

                    field[updateMethod]("info", expectedMessage); // this should be a noop
                    await flushPromises();

                    expect(field.state[stateKey]).toBe(before); // object reference should be the same
                });

                scopedIt(`should update the ${labelLower} if the ${labelLower} changes`, async () => {
                    const { field } = mountFieldNoContext();
                    await flushPromises();

                    const before = `Old ${labelLower}`;
                    const after = `New ${labelLower}`;
                    field[updateMethod]("info", before);
                    await flushPromises();
                    field[updateMethod]("info", after);
                    await flushPromises();

                    expect(field.state[stateKey]).toEqual({ info: after });
                });

                scopedIt(`should remove the ${labelLower} if passed undefined`, async () => {
                    const { field } = mountFieldNoContext();
                    await flushPromises();

                    field[updateMethod]("info", "Will be deleted");
                    await flushPromises();
                    field[updateMethod]("info", undefined);
                    await flushPromises();

                    expect(field.state[stateKey]).toEqual({});
                });
            });
            describe(`${deleteMethod}`, () => {
                scopedIt("should call the fc's method with args", async () => {
                    const { fc, field } = mountFieldInContext({}, { name: "testField" });
                    field[deleteMethod]("someCode");
                    expect(fc[deleteMethod]).toHaveBeenCalledTimes(deleteMethod === "deleteError" ? 2 : 1);
                    expect(fc[deleteMethod]).toHaveBeenCalledWith("testField", "someCode");
                });
                scopedIt(`should delete ${labelLower} without form context`, async () => {
                    const { field } = mountFieldNoContext();
                    await flushPromises();

                    const expectedMessage = `Some ${labelLower}`;
                    field[updateMethod]("testCode", expectedMessage);
                    await flushPromises();
                    expect(field.state[stateKey]).toEqual({ testCode: expectedMessage });

                    field[deleteMethod]("testCode");
                    await flushPromises();

                    expect(field.state[stateKey]).toEqual({});
                });
            });
        });
        describe("Field Interactions", () => {
            describe("setTouched", () => {
                scopedIt("should call the fc's method with args", async () => {
                    const { fc, field } = mountFieldInContext({}, { name: "testField" });
                    field.setTouched();
                    expect(fc.setTouched).toHaveBeenCalledTimes(1);
                    expect(fc.setTouched).toHaveBeenCalledWith("testField");
                });
            });
            describe("clearTouched", () => {
                scopedIt("should call the fc's method with args", async () => {
                    const { field, fc } = mountFieldInContext({}, { name: "testField" });
                    field.clearTouched();
                    expect(fc.clearTouched).toHaveBeenCalledTimes(1);
                    expect(fc.clearTouched).toHaveBeenCalledWith("testField");
                });
            });
            describe("focus", () => {
                scopedIt("should call the fc's method with args", async () => {
                    const { fc, field } = mountFieldInContext({}, { name: "testField" });
                    field.focus();
                    expect(fc.focus).toHaveBeenCalledTimes(1);
                    expect(fc.focus).toHaveBeenCalledWith("testField");
                });
            });
            describe("blur", () => {
                scopedIt("should remove focus when in a form context, and clear server errors", async () => {
                    const { fc, field } = mountFieldInContext({}, { name: "testField" });
                    // Initially no focus
                    expect(field.state.focused).toBe(false);
                    await flushPromises();

                    field.focus();
                    await flushPromises();
                    expect(fc.focus).toBeCalledTimes(1);
                    expect(fc.focus).toBeCalledWith(field.state.name);
                    fc.state.focused = field.state.name;
                    expect(field.state.focused).toBe(true);

                    // Change the value
                    field.blur();
                    await flushPromises();
                    expect(fc.blur).toBeCalledTimes(1);
                    expect(fc.blur).toBeCalledWith(field.state.name);
                    expect(fc.clearServerErrors).toBeCalledTimes(1);
                    expect(fc.clearServerErrors).toBeCalledWith(field.state.name, []);
                    delete fc.state.focused;
                    expect(field.state.focused).toBe(false);
                });
                scopedIt(
                    "should remove focus when in a form context, clear server errors for the field and it's clearServerErrorDependents",
                    async () => {
                        const { fc, field } = mountFieldInContext(
                            {
                                values: {
                                    testField: "initial",
                                    otherField: "initial",
                                },
                            },
                            {
                                name: "testField",
                                clearServerErrorDependents: ["otherField"],
                            },
                        );
                        // Initially no focus
                        expect(field.state.focused).toBe(false);
                        await flushPromises();

                        field.focus();
                        await flushPromises();
                        expect(fc.focus).toBeCalledTimes(1);
                        expect(fc.focus).toBeCalledWith(field.state.name);
                        fc.state.focused = field.state.name;
                        expect(field.state.focused).toBe(true);

                        // Change the value
                        field.blur();
                        await flushPromises();
                        expect(fc.blur).toBeCalledTimes(1);
                        expect(fc.blur).toBeCalledWith(field.state.name);
                        expect(fc.clearServerErrors).toBeCalledTimes(1);
                        expect(fc.clearServerErrors).toBeCalledWith(field.state.name, ["otherField"]);
                        delete fc.state.focused;
                        expect(field.state.focused).toBe(false);
                    },
                );
            });
        });
        describe("Field Ignoring", () => {
            describe("ignore", () => {
                scopedIt("should call the fc's method with args", async () => {
                    const { fc, field } = mountFieldInContext({}, { name: "testField" });
                    field.ignore();
                    expect(fc.ignore).toHaveBeenCalledTimes(1);
                    expect(fc.ignore).toHaveBeenCalledWith("testField");
                });
            });
            describe("removeIgnore", () => {
                scopedIt("should call the fc's method with args", async () => {
                    const { fc, field } = mountFieldInContext({}, { name: "testField" });
                    field.removeIgnore();
                    expect(fc.removeIgnore).toHaveBeenCalledTimes(1);
                    expect(fc.removeIgnore).toHaveBeenCalledWith("testField");
                });
            });
        });
        describe("Hook Registration", () => {
            describe("registerIsModifiedHook", () => {
                scopedIt("should call the fc's method with args", async () => {
                    const { fc, field } = mountFieldInContext({}, { name: "testField" });
                    field.registerIsModifiedHook();
                    expect(fc.registerIsModifiedHook).toHaveBeenCalledTimes(2);
                    expect(fc.registerIsModifiedHook).toHaveBeenCalledWith("testField", expect.any(Function));
                });
            });
            describe("unregisterIsModifiedHook", () => {
                scopedIt("should call the fc's method with args", async () => {
                    const { fc, field } = mountFieldInContext({}, { name: "testField" });
                    field.unregisterIsModifiedHook();
                    expect(fc.unregisterIsModifiedHook).toHaveBeenCalledTimes(1);
                    expect(fc.unregisterIsModifiedHook).toHaveBeenCalledWith(undefined);
                });
            });
            describe("registerIsRequiredHook", () => {
                scopedIt("should call the fc's method with args", async () => {
                    const { fc, field } = mountFieldInContext({}, { name: "testField" });
                    field.registerIsRequiredHook();
                    expect(fc.registerIsRequiredHook).toHaveBeenCalledTimes(2);
                    expect(fc.registerIsRequiredHook).toHaveBeenCalledWith("testField", expect.any(Function));
                });
            });
            describe("unregisterIsRequiredHook", () => {
                scopedIt("should call the fc's method with args", async () => {
                    const { fc, field } = mountFieldInContext({}, { name: "testField" });
                    field.unregisterIsRequiredHook();
                    expect(fc.unregisterIsRequiredHook).toHaveBeenCalledTimes(1);
                    expect(fc.unregisterIsRequiredHook).toHaveBeenCalledWith(undefined);
                });
            });
            describe("registerIsValidHook", () => {
                scopedIt("should call the fc's method with args", async () => {
                    const { fc, field } = mountFieldInContext({}, { name: "testField" });
                    field.registerIsValidHook();
                    expect(fc.registerIsValidHook).toHaveBeenCalledTimes(2);
                    expect(fc.registerIsValidHook).toHaveBeenCalledWith("testField", expect.any(Function));
                });
            });
            describe("unregisterIsValidHook", () => {
                scopedIt("should call the fc's method with args", async () => {
                    const { fc, field } = mountFieldInContext({}, { name: "testField" });
                    field.unregisterIsValidHook();
                    expect(fc.unregisterIsValidHook).toHaveBeenCalledTimes(1);
                    expect(fc.unregisterIsValidHook).toHaveBeenCalledWith(undefined);
                });
            });
        });
    });
    describe("integration", () => {
        describe("FieldContextSymbol", () => {
            scopedIt("should provide the field context to the form context", async () => {
                const { field } = mountFieldInContext();

                expect(mockedProvide).toHaveBeenCalledWith(FieldContextSymbol, field);
            });
        });
    });
    describe("lifecycle", () => {
        describe("onUnmounted", () => {
            scopedIt("should let form know it wants to unregister hooks", async () => {
                const { fc, props } = mountFieldInContext(
                    {
                        initialValues: {
                            testField: "initial",
                            otherField: "initial",
                        },
                        values: {
                            testField: "initial",
                            otherField: "initial",
                        },
                    },
                    {
                        name: "testField",
                    },
                    {
                        registerIsModifiedHook: () => "-1000",
                        registerIsRequiredHook: () => "-2000",
                        registerIsValidHook: () => "-3000",
                    },
                );
                await flushPromises();

                expect(fc.registerIsModifiedHook).toHaveBeenCalledWith(props.name, expect.any(Function));
                expect(fc.registerIsRequiredHook).toHaveBeenCalledWith(props.name, expect.any(Function));
                expect(fc.registerIsValidHook).toHaveBeenCalledWith(props.name, expect.any(Function));

                // fake unmount
                for (const unmountFn of unmountedFunctions) {
                    unmountFn();
                }

                expect(fc.unregisterIsModifiedHook).toHaveBeenCalledWith("-1000");
                expect(fc.unregisterIsRequiredHook).toHaveBeenCalledWith("-2000");
                expect(fc.unregisterIsValidHook).toHaveBeenCalledWith("-3000");
            });
        });
    });
});
