import { mockLifecycle, mockProvideInject, scopedIt, testWatches } from "@tests/unit/utils.js";
import { NON_FIELD_ERRORS_KEY } from "@vueda/utils/constants.js";
import { ServerFeedbackError } from "@vueda/utils/errors.js";
import { toFlatValuePath } from "@vueda/utils/formValuePath.js";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import flushPromises from "flush-promises";
import cloneDeep from "lodash-es/cloneDeep.js";
import omit from "lodash-es/omit.js";

const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
const { mockedProvide, mockedInject } = mockProvideInject(vi);
const { mockedOnUnmounted } = mockLifecycle(vi);
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

const expectWarn = (name) => [
    `[Vue warn] Set operation on key "${name}" failed: target is readonly.`,
    expect.anything(),
];
const reservedServerCodeMsg =
    'Error code "server" is reserved for server-originated validation and cannot be set from local validation. Use a non-reserved code (e.g. "validate" or custom) for client validation.';

describe("lib/use/useForm.js", () => {
    let vue, useForm;
    beforeEach(async () => {
        vue = await vi.importActual("vue");
        useForm = await vi.importActual("@vueda/use/useForm.js").then((m) => m.useForm);
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    const getForm = (props = {}) => {
        const formProps = vue.reactive(props);
        const formContext = useForm(vue.readonly(formProps));
        return { formProps, formContext };
    };
    describe("props", () => {
        describe("initialValues", () => {
            scopedIt("should put the initial values into values immediately", () => {
                const desiredInitialValues = {
                    someField1: [1, 2, 3, 4, 5],
                    someField2: "some value",
                    someField3: true,
                    someField4: {
                        subField1: [1, 2, 3, 4, 5],
                        subField2: "some value",
                        subField3: true,
                    },
                };
                const { formContext } = getForm({
                    // defensively make sure the test/form doesn't mutate what we passed.
                    //  since that is what we are testing for.
                    initialValues: cloneDeep(desiredInitialValues),
                });
                expect(formContext.state.initialValues).toEqual(desiredInitialValues);
                expect(formContext.state.values).toEqual(desiredInitialValues);
            });
            scopedIt("should reset the form if initialValues changes later", async () => {
                const desiredInitialValues = {
                    someField1: [1, 2, 3, 4, 5],
                    someField2: "some value 1",
                    someField3: true,
                    someField4: {
                        subField1: [1, 2, 3],
                        subField2: "some value 2",
                        subField3: true,
                    },
                };
                const desiredReplacementInitialValues = {
                    otherField1: [5, 4, 3, 2, 1],
                    otherField2: "other value 1",
                    otherField3: false,
                    otherField4: {
                        underField1: [3, 2, 1],
                        underField2: "other value 2",
                        underField3: false,
                    },
                };
                const { formProps, formContext } = getForm({
                    // defensively make sure the test/form doesn't mutate what we passed.
                    //  since that is what we are testing for.
                    initialValues: cloneDeep(desiredInitialValues),
                });
                expect(formContext.state.initialValues).toEqual(desiredInitialValues);
                expect(formContext.state.values).toEqual(desiredInitialValues);
                formProps.initialValues = cloneDeep(desiredReplacementInitialValues);
                await flushPromises();
                expect(formContext.state.initialValues).toEqual(desiredReplacementInitialValues);
                expect(formContext.state.values).toEqual(desiredReplacementInitialValues);
            });
            scopedIt("should reset the form on deep initialValues changes", async () => {
                const desiredInitialValues = {
                    someField1: [1, 2, 3, 4, 5],
                    someField2: "some value 1",
                    someField3: true,
                    someField4: {
                        subField1: [1, 2, 3],
                        subField2: "some value 2",
                        subField3: true,
                    },
                };
                const { formProps, formContext } = getForm({
                    // defensively make sure the test/form doesn't mutate what we passed.
                    //  since that is what we are testing for.
                    initialValues: cloneDeep(desiredInitialValues),
                });
                expect(formContext.state.initialValues).toEqual(desiredInitialValues);
                expect(formContext.state.values).toEqual(desiredInitialValues);
                formProps.initialValues.someField4.subField2 = "some value 3";
                await flushPromises();
                expect(formContext.state.initialValues).toEqual({
                    ...desiredInitialValues,
                    someField4: {
                        ...desiredInitialValues.someField4,
                        subField2: "some value 3",
                    },
                });
                expect(formContext.state.values).toEqual({
                    ...desiredInitialValues,
                    someField4: {
                        ...desiredInitialValues.someField4,
                        subField2: "some value 3",
                    },
                });
            });
        });
    });
    describe("state", () => {
        describe("Values & Initial State", () => {
            describe("values", () => {
                scopedIt("should not allow updates directly or deeply", () => {
                    const expected = {
                        someField2: {
                            a: 1,
                            b: 2,
                            c: 3,
                        },
                    };
                    const { formContext } = getForm({
                        initialValues: cloneDeep(expected),
                    });
                    formContext.state.values = {
                        someField1: [1, 2, 3, 4, 5],
                    };
                    expect(formContext.state.values).toEqual(expected);
                    formContext.state.values.someField2.b = 4;
                    expect(formContext.state.values).toEqual(expected);
                    expect(warnSpy).toHaveBeenCalledTimes(2);
                    expect(warnSpy).toHaveBeenCalledWith(...expectWarn("values"));
                });
            });
            describe("submittingValues", () => {
                scopedIt("should return all values when anyIgnored is false", async () => {
                    const values = {
                        someField1: "some value 1",
                        someField2: 123,
                        someField3: true,
                        someField4: [1, 2, 3],
                    };
                    const { formContext } = getForm({
                        initialValues: cloneDeep(values),
                    });
                    expect(formContext.state.values).toEqual(values);
                    expect(formContext.state.anyIgnored).toEqual(false);
                    expect(formContext.state.submittingValues).toEqual(values);
                });
                scopedIt("should return non-ignored field values when a top-level field is ignored", async () => {
                    const values = {
                        someField1: "some value 1",
                        someField2: 123,
                        someField3: true,
                        someField4: [1, 2, 3],
                    };
                    const { formContext } = getForm({
                        initialValues: cloneDeep(values),
                    });
                    formContext.ignore("someField2");
                    const submittingValues = omit(values, ["someField2"]);
                    expect(formContext.state.values).toEqual(values);
                    expect(formContext.state.anyIgnored).toEqual(true);
                    expect(formContext.state.submittingValues).toEqual(submittingValues);
                });
                scopedIt("should return non-ignored field values when an array item is ignored", async () => {
                    const values = {
                        someField1: "some value 1",
                        someField2: 123,
                        someField3: true,
                        someField4: [1, 2, 3],
                    };
                    const { formContext } = getForm({
                        initialValues: cloneDeep(values),
                    });
                    formContext.ignore("someField4[1]");
                    const submittingValues = {
                        ...values,
                        someField4: [1, 3],
                    };
                    expect(formContext.state.values).toEqual(values);
                    expect(formContext.state.anyIgnored).toEqual(true);
                    expect(formContext.state.submittingValues).toEqual(submittingValues);
                });
            });
            describe("initialValues", () => {
                scopedIt("should not allow updates directly or deeply", () => {
                    const expected = {
                        someField2: {
                            a: 1,
                            b: 2,
                            c: 3,
                        },
                    };
                    const { formContext } = getForm({
                        initialValues: cloneDeep(expected),
                    });
                    formContext.state.initialValues = {
                        someField1: [1, 2, 3, 4, 5],
                    };
                    expect(formContext.state.initialValues).toEqual(expected);
                    formContext.state.initialValues.someField2.b = 4;
                    expect(formContext.state.initialValues).toEqual(expected);
                    expect(warnSpy).toHaveBeenCalledTimes(2);
                    expect(warnSpy).toHaveBeenCalledWith(...expectWarn("initialValues"));
                });
            });
        });
        describe("Validation & Errors", () => {
            describe("errors", () => {
                scopedIt("should not allow updates directly", () => {
                    const { formContext } = getForm({});
                    formContext.state.errors = {
                        someField1: [1, 2, 3, 4, 5],
                    };
                    expect(formContext.state.errors).toEqual({});
                    expect(warnSpy).toHaveBeenCalledTimes(1);
                    expect(warnSpy).toHaveBeenCalledWith(...expectWarn("errors"));
                });
            });
            describe("anyError", () => {
                scopedIt("should not allow updates directly", () => {
                    const { formContext } = getForm({});
                    expect(formContext.state.anyError).toEqual(false);
                    // a [Vue] warning is expected here
                    formContext.state.anyError = true;
                    expect(formContext.state.anyError).toEqual(false);
                });
                scopedIt("should update when adding errors", () => {
                    const { formContext } = getForm({});
                    expect(formContext.state.anyError).toEqual(false);
                    formContext.updateError("someField1", "required", "Required");
                    expect(formContext.state.anyError).toEqual(true);
                });
                scopedIt("should update when removing errors", () => {
                    const { formContext } = getForm({
                        testErrors: {
                            someField1: { required: "Required" },
                        },
                    });
                    expect(formContext.state.anyError).toEqual(true);
                    formContext.deleteError("someField1", "required");
                    expect(formContext.state.anyError).toEqual(false);
                });
            });
            describe("messages", () => {
                scopedIt("should not allow updates directly", () => {
                    const { formContext } = getForm({});
                    formContext.state.messages = {
                        someField1: [1, 2, 3, 4, 5],
                    };
                    expect(formContext.state.messages).toEqual({});
                    expect(warnSpy).toHaveBeenCalledTimes(1);
                    expect(warnSpy).toHaveBeenCalledWith(...expectWarn("messages"));
                });
            });
            describe("anyMessage", () => {
                scopedIt("should not allow updates directly", () => {
                    const { formContext } = getForm({});
                    expect(formContext.state.anyMessage).toEqual(false);
                    // a [Vue] warning is expected here
                    formContext.state.anyMessage = true;
                    expect(formContext.state.anyMessage).toEqual(false);
                });
                scopedIt("should update when adding messages", () => {
                    const { formContext } = getForm({});
                    expect(formContext.state.anyMessage).toEqual(false);
                    formContext.updateMessage("someField1", "required", "Required");
                    expect(formContext.state.anyMessage).toEqual(true);
                });
                scopedIt("should update when removing messages", () => {
                    const { formContext } = getForm({
                        testMessages: {
                            someField1: { required: "Required" },
                        },
                    });
                    expect(formContext.state.anyMessage).toEqual(true);
                    formContext.deleteMessage("someField1", "required");
                    expect(formContext.state.anyMessage).toEqual(false);
                });
            });
        });
        describe("Interaction & Focus", () => {
            describe("touched", () => {
                scopedIt("should not allow updates directly", () => {
                    const { formContext } = getForm({});
                    formContext.state.touched = {
                        someField1: [1, 2, 3, 4, 5],
                    };
                    expect(formContext.state.touched).toEqual({});
                    expect(warnSpy).toHaveBeenCalledTimes(1);
                    expect(warnSpy).toHaveBeenCalledWith(...expectWarn("touched"));
                });
            });
            describe("anyTouched", () => {
                scopedIt("should not allow updates directly", () => {
                    const { formContext } = getForm({});
                    expect(formContext.state.anyTouched).toEqual(false);
                    formContext.state.anyTouched = true;
                    expect(formContext.state.anyTouched).toEqual(false);
                    expect(warnSpy).toHaveBeenCalledTimes(1);
                    expect(warnSpy).toHaveBeenCalledWith(...expectWarn("anyTouched"));
                });
            });
            describe("focused", () => {
                scopedIt("should not allow updates directly", () => {
                    const { formContext } = getForm({});
                    formContext.state.focused = {
                        someField1: [1, 2, 3, 4, 5],
                    };
                    expect(formContext.state.focused).toBeNull();
                    expect(warnSpy).toHaveBeenCalledTimes(1);
                    expect(warnSpy).toHaveBeenCalledWith(...expectWarn("focused"));
                });
            });
        });
        describe("Tracking & Modification", () => {
            describe("modified", () => {
                scopedIt("should not allow updates directly", () => {
                    const { formContext } = getForm({});
                    formContext.state.modified = {
                        someField1: [1, 2, 3, 4, 5],
                    };
                    expect(formContext.state.modified).toEqual({});
                    expect(warnSpy).toHaveBeenCalledTimes(1);
                    expect(warnSpy).toHaveBeenCalledWith(...expectWarn("modified"));
                });
            });
            describe("anyModified", () => {
                scopedIt("should not allow updates directly", () => {
                    const { formContext } = getForm({});
                    expect(formContext.state.anyModified).toEqual(false);
                    formContext.state.anyModified = true;
                    expect(formContext.state.anyModified).toEqual(false);
                    expect(warnSpy).toHaveBeenCalledTimes(1);
                    expect(warnSpy).toHaveBeenCalledWith(...expectWarn("anyModified"));
                });
            });
            describe("required", () => {
                scopedIt("should not allow updates directly", () => {
                    const { formContext } = getForm({});
                    formContext.state.required = {
                        someField1: [1, 2, 3, 4, 5],
                    };
                    expect(formContext.state.required).toEqual({});
                    expect(warnSpy).toHaveBeenCalledTimes(1);
                    expect(warnSpy).toHaveBeenCalledWith(...expectWarn("required"));
                });
            });
            describe("valid", () => {
                scopedIt("should not allow updates directly", () => {
                    const { formContext } = getForm({});
                    formContext.state.valid = {
                        someField1: [1, 2, 3, 4, 5],
                    };
                    expect(formContext.state.valid).toEqual({});
                    expect(warnSpy).toHaveBeenCalledTimes(1);
                    expect(warnSpy).toHaveBeenCalledWith(...expectWarn("valid"));
                });
            });
        });
        describe("Ignored Fields & Reset Behavior", () => {
            describe.todo("ignored");
            describe("anyIgnored", () => {
                scopedIt("should not allow updates directly", () => {
                    const { formContext } = getForm({});
                    expect(formContext.state.anyIgnored).toEqual(false);
                    formContext.state.anyIgnored = true;
                    expect(formContext.state.anyIgnored).toEqual(false);
                    expect(warnSpy).toHaveBeenCalledTimes(1);
                    expect(warnSpy).toHaveBeenCalledWith(...expectWarn("anyIgnored"));
                });
            });
        });
    });
    describe("methods", () => {
        describe("Form Reset & State Management", () => {
            describe("reset", () => {
                scopedIt("should not clear state on first reset (hasInitialized = false)", () => {
                    const { formContext } = getForm({ initialValues: { a: 1, b: 2 } });
                    formContext.reset();
                    expect(formContext.state.values).toEqual({ a: 1, b: 2 });
                    expect(formContext.state.errors).toEqual({}); // untouched
                    expect(formContext.state.messages).toEqual({});
                    expect(formContext.state.touched).toEqual({});
                    expect(formContext.state.focused).toBeNull();
                });
                scopedIt("should clear validation and interaction state after initial reset", () => {
                    const { formContext } = getForm({ initialValues: { a: 1 } });
                    formContext.updateError("a", "required", "Required");
                    formContext.setTouched("a");
                    formContext.focus("a");
                    formContext.reset(); // 1st call: skip clearing
                    formContext.updateError("a", "required", "Required");
                    formContext.setTouched("a");
                    formContext.focus("a");
                    formContext.reset(); // 2nd call: should clear
                    expect(formContext.state.errors).toEqual({});
                    expect(formContext.state.messages).toEqual({});
                    expect(formContext.state.touched).toEqual({});
                    expect(formContext.state.focused).toBeNull();
                    expect(formContext.state.anyTouched).toBe(false);
                    expect(formContext.state.anyError).toBe(false);
                    expect(formContext.state.submitted).toBe(false);
                });
                scopedIt("should clear submitted flag when reset after a submission attempt", () => {
                    const { formContext } = getForm({ initialValues: { a: 1 } });
                    formContext.reset(); // flip hasInitialized
                    formContext.setAllTouched();
                    expect(formContext.state.submitted).toBe(true);
                    formContext.reset();
                    expect(formContext.state.submitted).toBe(false);
                });
                scopedIt("should clone initial values deeply on reset", () => {
                    const original = { nested: { a: 1 } };
                    const { formContext } = getForm({ initialValues: cloneDeep(original) });
                    formContext.reset(); // skip clear, flip hasInitialized
                    formContext.updateValue("nested.a", 999);
                    expect(formContext.state.initialValues).toEqual({ nested: { a: 1 } });
                    expect(formContext.state.values.nested.a).toBe(999);
                    formContext.reset(); // now it should reset
                    expect(formContext.state.values).toEqual({ nested: { a: 1 } });
                });
                scopedIt("should reactively resets values and emits changes", async () => {
                    const { formContext } = getForm({ initialValues: { a: "abc" } });
                    formContext.reset(); // first reset initializes tracking only

                    formContext.updateValue("a", "def");
                    expect(formContext.state.values.a).toBe("def");

                    const [stop, watchSpy] = testWatches(vue, formContext.state.values, "a");

                    try {
                        formContext.reset(); // now this should trigger reactive assignment
                        await flushPromises();
                        expect(formContext.state.values.a).toBe("abc");
                        expect(watchSpy).toHaveBeenCalled();
                    } finally {
                        stop();
                    }
                });
            });
            describe("getFirstErrorField", () => {
                scopedIt("should return direct field error", () => {
                    const { formContext } = getForm({
                        initialValues: {},
                        testErrors: {
                            field1: { required: "Required" },
                        },
                    });

                    const result = formContext.getFirstErrorField(["field1"], []);
                    expect(result).toBe("field1");
                });

                scopedIt("should return NON_FIELD_ERRORS_KEY if present", () => {
                    const { formContext } = getForm({
                        initialValues: {},
                        testErrors: {
                            [NON_FIELD_ERRORS_KEY]: { general: "Something went wrong" },
                        },
                    });

                    const result = formContext.getFirstErrorField(["field1"], []);
                    expect(result).toBe(NON_FIELD_ERRORS_KEY);
                });

                scopedIt("should return array field error like tags[1]", () => {
                    const { formContext } = getForm({
                        initialValues: {},
                        testErrors: {
                            "tags[1]": { required: "Required" },
                        },
                    });

                    const result = formContext.getFirstErrorField(["tags", "tags.label"], ["tags"]);
                    expect(result).toBe("tags[1]");
                });

                scopedIt("should return nested array error like tags[2].label", () => {
                    const { formContext } = getForm({
                        initialValues: {},
                        testErrors: {
                            "tags[2].label": { required: "Required" },
                        },
                    });

                    const result = formContext.getFirstErrorField(["tags", "tags.label"], ["tags"]);
                    expect(result).toBe("tags[2].label");
                });

                scopedIt("should resolve field.child to parent.child in array (e.g., items[0].description)", () => {
                    const { formContext } = getForm({
                        initialValues: {},
                        testErrors: {
                            "items[0].description": { required: "Required" },
                        },
                    });

                    const result = formContext.getFirstErrorField(["items", "items.description"], ["items"]);
                    expect(result).toBe("items[0].description");
                });

                scopedIt(
                    "should not fail on parentless child field.child to parent.child in array (e.g., items[0].description)",
                    () => {
                        const { formContext } = getForm({
                            initialValues: {},
                            testErrors: {
                                "items[0].description": { required: "Required" },
                            },
                        });

                        const result = formContext.getFirstErrorField(["fake.description"], ["fake"]);
                        expect(result).toBeNull();
                    },
                );

                scopedIt("should ignore errors not in displayFields", () => {
                    const { formContext } = getForm({
                        initialValues: {},
                        testErrors: {
                            field1: { required: "Required" },
                        },
                    });

                    const result = formContext.getFirstErrorField(["field2"], []);
                    expect(result).toBeNull();
                });

                scopedIt("should return null when no errors are present", () => {
                    const { formContext } = getForm({
                        initialValues: {},
                        testErrors: {},
                    });

                    const result = formContext.getFirstErrorField(["field1"], []);
                    expect(result).toBeNull();
                });

                scopedIt("should ignore empty error objects", () => {
                    const { formContext } = getForm({
                        initialValues: {},
                        testErrors: {
                            field1: {},
                        },
                    });

                    const result = formContext.getFirstErrorField(["field1"], []);
                    expect(result).toBeNull();
                });
            });
        });
        describe("Value & Initial Value Handling", () => {
            describe("updateValue", () => {
                scopedIt("should require a name", () => {
                    const { formContext } = getForm({});
                    expect(() => formContext.updateValue()).toThrow("No name provided");
                });
                scopedIt("should not nest a dotted filter/expand field name given as a flat value path", () => {
                    // `useFieldRenderer`'s `fieldValuePath` wraps a dotted, non-fieldset field's
                    // identity (a related filter, an expand-flattened display field) in lodash's
                    // bracket-quoted path syntax before handing it here, so a name like
                    // "employee.name" must land as one flat key, not a nested `employee` object.
                    const { formContext } = getForm({});

                    formContext.updateValue(toFlatValuePath("employee.name"), "Bob");

                    expect(formContext.state.values).toEqual({ "employee.name": "Bob" });
                    expect(formContext.state.values.employee).toBeUndefined();
                });
                scopedIt("should update an existing value", async () => {
                    const { formContext } = getForm({
                        initialValues: {
                            field1: "some value",
                            field2: "some value",
                        },
                    });
                    const [stop, watchSpy, watchSpy2] = testWatches(vue, formContext.state.values, "field1", "field2");
                    try {
                        formContext.updateValue("field1", "new value");
                        expect(formContext.state.values).toEqual({
                            field1: "new value",
                            field2: "some value",
                        });
                        await flushPromises();
                        expect(watchSpy).toHaveBeenCalledTimes(1);
                        expect(watchSpy.mock.calls[0]).toEqual(["new value", "some value", expect.any(Function)]);
                        expect(watchSpy2).not.toHaveBeenCalled();
                    } finally {
                        stop();
                    }
                });
                scopedIt("should update an existing value by path", async () => {
                    const { formContext } = getForm({
                        initialValues: {
                            field1: "some value1",
                            field2: "some value2",
                            field3: {
                                field1: "some value3",
                                field2: "some value4",
                                field3: {
                                    field1: "some value5",
                                    field2: "some value6",
                                },
                            },
                        },
                    });
                    const [stop, watchSpy, watchSpy2] = testWatches(
                        vue,
                        formContext.state.values,
                        "field3",
                        "field2",
                        true,
                    );
                    try {
                        formContext.updateValue("field3.field3.field1", "new value");
                        expect(formContext.state.values).toEqual({
                            field1: "some value1",
                            field2: "some value2",
                            field3: {
                                field1: "some value3",
                                field2: "some value4",
                                field3: {
                                    field1: "new value",
                                    field2: "some value6",
                                },
                            },
                        });
                        await flushPromises();
                        expect(watchSpy).toHaveBeenCalledTimes(1);
                        expect(watchSpy.mock.calls[0]).toEqual([
                            {
                                field1: "some value3",
                                field2: "some value4",
                                field3: {
                                    field1: "new value",
                                    field2: "some value6",
                                },
                            },
                            {
                                field1: "some value3",
                                field2: "some value4",
                                field3: {
                                    field1: "some value5",
                                    field2: "some value6",
                                },
                            },
                            expect.any(Function),
                        ]);
                        expect(watchSpy2).not.toHaveBeenCalled();
                    } finally {
                        stop();
                    }
                });
                scopedIt("should allow new values by path", async () => {
                    const { formContext } = getForm({
                        initialValues: {
                            field2: "some value2",
                        },
                    });
                    expect(formContext.state.values).toEqual({
                        field2: "some value2",
                    });
                    const [stop, watchSpy, watchSpy2] = testWatches(
                        vue,
                        formContext.state.values,
                        "field3.field3.field1",
                        "field2",
                        true,
                    );
                    try {
                        formContext.updateValue("field3.field3.field1", "new value");
                        expect(formContext.state.values).toEqual({
                            field2: "some value2",
                            field3: {
                                field3: {
                                    field1: "new value",
                                },
                            },
                        });
                        await flushPromises();
                        expect(watchSpy).toHaveBeenCalledTimes(1);
                        expect(watchSpy.mock.calls[0]).toEqual(["new value", undefined, expect.any(Function)]);
                        expect(watchSpy2).not.toHaveBeenCalled();
                    } finally {
                        stop();
                    }
                });
            });
            describe("removeArrayItem", () => {
                scopedIt("moves nested indexed state and clears flags when the last entry is removed", () => {
                    const { formContext: form } = getForm({
                        initialValues: { rows: [{ email: "a" }, { email: "b" }] },
                    });
                    form.updateError("rows[0].email", "validate", "Removed error");
                    form.updateError("rows[1].email", "validate", "Surviving error");
                    form.updateMessage("rows[1].email", "warning", "Surviving warning");
                    form.setTouched("rows[1].email");
                    form.ignore("rows[1].email");
                    form.focus("rows[1].email");
                    form.removeArrayItem("rows", 0);
                    expect(form.state.values.rows).toEqual([{ email: "b" }]);
                    expect(form.state.initialValues.rows).toEqual([{ email: "a" }, { email: "b" }]);
                    expect(form.state.errors).toEqual({ "rows[0].email": { validate: "Surviving error" } });
                    expect(form.state.messages).toEqual({ "rows[0].email": { warning: "Surviving warning" } });
                    expect(form.state.touched).toEqual({ "rows[0].email": true });
                    expect(form.state.ignored["rows[0].email"]).toBeTruthy();
                    expect(form.state.focused).toBe("rows[0].email");
                    form.removeArrayItem("rows", 0);
                    expect(form.state.values.rows).toEqual([]);
                    expect(form.state.errors).toEqual({});
                    expect(form.state.messages).toEqual({});
                    expect(form.state.touched).toEqual({});
                    expect(form.state.ignored).toEqual({});
                    expect(form.state.focused).toBeNull();
                    expect(form.state.anyError).toBe(false);
                    expect(form.state.anyMessage).toBe(false);
                    expect(form.state.anyTouched).toBe(false);
                    expect(form.state.anyIgnored).toBe(false);
                });

                scopedIt(
                    "does not shift registered labels; each field's own hook stays keyed to its own name",
                    async () => {
                        const { formContext: form } = getForm({
                            initialValues: { rows: [{ email: "a" }, { email: "b" }] },
                        });
                        form.registerLabel("rows[0].email", () => "Row 1 email");
                        form.registerLabel("rows[1].email", () => "Row 2 email");
                        await flushPromises();
                        expect(form.state.labels).toEqual({
                            "rows[0].email": "Row 1 email",
                            "rows[1].email": "Row 2 email",
                        });

                        form.removeArrayItem("rows", 0);
                        await flushPromises();

                        // Labels are keyed by name and driven by each field's own hook (see
                        // registerLabel), not shifted here: a caller that keeps a hook registered
                        // under "rows[1].email" after removal (as this test does, deliberately not
                        // simulating a real field's own re-registration) keeps reporting its own,
                        // unrelated label under that name.
                        expect(form.state.labels).toEqual({
                            "rows[0].email": "Row 1 email",
                            "rows[1].email": "Row 2 email",
                        });
                    },
                );

                scopedIt("ignores invalid indexes and non-array values", () => {
                    const { formContext: form } = getForm({ initialValues: { rows: [1, 2], text: "abc" } });
                    for (const index of [-1, 2, 0.5, NaN]) form.removeArrayItem("rows", index);
                    form.removeArrayItem("text", 0);
                    expect(form.state.values).toEqual({ rows: [1, 2], text: "abc" });
                });
            });
            describe("deleteValue", () => {
                scopedIt("should result in the value being undefined, reactively", async () => {
                    const { formContext } = getForm({
                        initialValues: {
                            field1: "some value1",
                            field2: "some value2",
                            field3: {
                                field1: "some value3",
                                field2: "some value4",
                                field3: {
                                    field1: "some value5",
                                    field2: "some value6",
                                },
                            },
                        },
                    });
                    expect(formContext.state.values).toEqual({
                        field1: "some value1",
                        field2: "some value2",
                        field3: {
                            field1: "some value3",
                            field2: "some value4",
                            field3: {
                                field1: "some value5",
                                field2: "some value6",
                            },
                        },
                    });
                    const [stop, watchSpy, watchSpy2] = testWatches(
                        vue,
                        formContext.state.values,
                        "field2",
                        "field3",
                        true,
                    );
                    try {
                        formContext.deleteValue("field2");
                        expect(formContext.state.values).toEqual({
                            field1: "some value1",
                            field3: {
                                field1: "some value3",
                                field2: "some value4",
                                field3: {
                                    field1: "some value5",
                                    field2: "some value6",
                                },
                            },
                        });
                        await flushPromises();
                        expect(watchSpy).toHaveBeenCalledTimes(1);
                        expect(watchSpy.mock.calls[0]).toEqual([undefined, "some value2", expect.any(Function)]);
                        expect(watchSpy2).not.toHaveBeenCalled();
                    } finally {
                        stop();
                    }
                });
                scopedIt("should result in the value being undefined, for nested paths, reactively", async () => {
                    const { formContext } = getForm({
                        initialValues: {
                            field1: "some value1",
                            field2: "some value2",
                            field3: {
                                field1: "some value3",
                                field2: "some value4",
                                field3: {
                                    field1: "some value5",
                                    field2: "some value6",
                                },
                            },
                        },
                    });
                    expect(formContext.state.values).toEqual({
                        field1: "some value1",
                        field2: "some value2",
                        field3: {
                            field1: "some value3",
                            field2: "some value4",
                            field3: {
                                field1: "some value5",
                                field2: "some value6",
                            },
                        },
                    });
                    const [stop, watchSpy, watchSpy2] = testWatches(
                        vue,
                        formContext.state.values,
                        "field3",
                        "field2",
                        true,
                    );
                    try {
                        formContext.deleteValue("field3.field3.field2");
                        expect(formContext.state.values).toEqual({
                            field1: "some value1",
                            field2: "some value2",
                            field3: {
                                field1: "some value3",
                                field2: "some value4",
                                field3: {
                                    field1: "some value5",
                                },
                            },
                        });
                        await flushPromises();
                        expect(watchSpy).toHaveBeenCalledTimes(1);
                        expect(watchSpy.mock.calls[0]).toEqual([
                            {
                                field1: "some value3",
                                field2: "some value4",
                                field3: {
                                    field1: "some value5",
                                },
                            },
                            {
                                field1: "some value3",
                                field2: "some value4",
                                field3: {
                                    field1: "some value5",
                                    field2: "some value6",
                                },
                            },
                            expect.any(Function),
                        ]);
                        expect(watchSpy2).not.toHaveBeenCalled();
                    } finally {
                        stop();
                    }
                });
            });
            describe("updateInitialValue", () => {
                scopedIt("should update the initial value for a top-level field", async () => {
                    const { formContext } = getForm({
                        initialValues: { name: "John", age: 30 },
                    });

                    expect(formContext.state.initialValues.name).toBe("John");
                    formContext.updateInitialValue("name", "Jane");
                    expect(formContext.state.initialValues.name).toBe("Jane");
                });

                scopedIt("should update the initial value for a nested path", async () => {
                    const { formContext } = getForm({
                        initialValues: {
                            profile: {
                                bio: "dev",
                            },
                        },
                    });

                    formContext.updateInitialValue("profile.bio", "engineer");
                    expect(formContext.state.initialValues.profile.bio).toBe("engineer");
                });

                scopedIt("should not update if the value is equal", async () => {
                    const { formContext } = getForm({
                        initialValues: {
                            name: "Same",
                        },
                    });

                    const initial = formContext.state.initialValues;
                    formContext.updateInitialValue("name", "Same");
                    expect(formContext.state.initialValues).toBe(initial); // should be the same object
                });

                scopedIt("should throw if no name is passed", () => {
                    const { formContext } = getForm({});
                    expect(() => formContext.updateInitialValue()).toThrow("No name provided");
                });

                scopedIt("should trigger a watcher when initial value changes", async () => {
                    const { formContext } = getForm({
                        initialValues: { counter: 0 },
                    });
                    const [stop, spy] = testWatches(vue, formContext.state.initialValues, "counter");

                    try {
                        formContext.updateInitialValue("counter", 1);
                        await flushPromises();
                        expect(spy).toHaveBeenCalled();
                    } finally {
                        stop();
                    }
                });
            });
            describe("deleteInitialValue", () => {
                scopedIt("should delete a top-level initial value", () => {
                    const { formContext } = getForm({
                        initialValues: { name: "John", age: 42 },
                    });
                    expect(formContext.state.initialValues).toHaveProperty("name", "John");

                    formContext.deleteInitialValue("name");

                    expect(formContext.state.initialValues).not.toHaveProperty("name");
                    expect(formContext.state.initialValues).toEqual({ age: 42 });
                });

                scopedIt("should delete a nested initial value", () => {
                    const { formContext } = getForm({
                        initialValues: {
                            profile: {
                                bio: "Hello",
                                skills: ["vue", "js"],
                            },
                        },
                    });
                    expect(formContext.state.initialValues.profile).toHaveProperty("bio");

                    formContext.deleteInitialValue("profile.bio");

                    expect(formContext.state.initialValues.profile).not.toHaveProperty("bio");
                    expect(formContext.state.initialValues.profile.skills).toEqual(["vue", "js"]);
                });

                scopedIt("should do nothing if the value is already undefined", () => {
                    const { formContext } = getForm({
                        initialValues: { name: "John" },
                    });

                    formContext.deleteInitialValue("nonexistent");

                    expect(formContext.state.initialValues).toEqual({ name: "John" });
                });

                scopedIt("should throw if no name is passed", () => {
                    const { formContext } = getForm({});
                    expect(() => formContext.deleteInitialValue()).toThrow("No name provided");
                });
            });
        });
        describe("Error & Message Handling", () => {
            describe.each([
                {
                    label: "Error",
                    updateMethod: "updateError",
                    deleteMethod: "deleteError",
                    clearMethod: "clearErrors",
                    stateKey: "errors",
                    testPropKey: "testErrors",
                    missingNameMsg: "No name provided",
                    missingCodeMsg: "No code provided",
                    missingMessageMsg: "No message provided",
                },
                {
                    label: "Message",
                    updateMethod: "updateMessage",
                    deleteMethod: "deleteMessage",
                    clearMethod: "clearMessages",
                    stateKey: "messages",
                    testPropKey: "testMessages",
                    missingNameMsg: "No name provided",
                    missingCodeMsg: "No code provided",
                    missingMessageMsg: "No message provided",
                },
            ])(
                "$label",
                ({
                    label,
                    updateMethod,
                    deleteMethod,
                    clearMethod,
                    stateKey,
                    testPropKey,
                    missingNameMsg,
                    missingCodeMsg,
                    missingMessageMsg,
                }) => {
                    describe(`${clearMethod}`, () => {
                        scopedIt(`should clear ${label.toLowerCase()} for a field`, async () => {
                            const { formContext } = getForm({
                                initialValues: { field1: "some value" },
                                [testPropKey]: {
                                    field1: {
                                        required: "Field is required",
                                    },
                                },
                            });
                            expect(formContext.state[stateKey].field1).toEqual({ required: "Field is required" });
                            const [stop, watchSpy] = testWatches(vue, formContext.state[stateKey], "field1");
                            try {
                                formContext[clearMethod]("field1");
                                expect(formContext.state[stateKey]).toEqual({});
                                await flushPromises();
                                expect(watchSpy).toHaveBeenCalledTimes(1);
                            } finally {
                                stop();
                            }
                        });
                        scopedIt(`should clear ${label.toLowerCase()}s for a child index when provided`, async () => {
                            // In the case of array fields, errors might be keyed like "field[0]"
                            const { formContext } = getForm({
                                initialValues: { field: ["a", "b"] },
                                [testPropKey]: {
                                    "field[0]": "Error message",
                                    "field[1]": "Error message",
                                },
                            });
                            expect(formContext.state[stateKey]).toEqual({
                                "field[0]": "Error message",
                                "field[1]": "Error message",
                            });
                            const [stop, watchSpy] = testWatches(
                                vue,
                                formContext.state[stateKey],
                                "field[0]",
                                "field[1]",
                                true,
                            );
                            try {
                                formContext[clearMethod]("field", 0);
                                expect(formContext.state[stateKey]).toEqual({
                                    "field[1]": "Error message",
                                });
                                await flushPromises();
                                expect(watchSpy).toHaveBeenCalledTimes(1);
                            } finally {
                                stop();
                            }
                        });
                        scopedIt(`should clear nested ${label.toLowerCase()} keys for a child index`, async () => {
                            const { formContext } = getForm({
                                initialValues: { field: ["a", "b"] },
                                [testPropKey]: {
                                    "field[0]": "Direct error",
                                    "field[0].child": "Nested error",
                                    "field[1]": "Other error",
                                },
                            });

                            // Calling clearErrors for child index 0 should clear both "field[0]" and "field[0].child".
                            formContext[clearMethod]("field", 0);
                            await flushPromises();

                            // After clearing, only the error for "field[1]" should remain.
                            expect(formContext.state[stateKey]).toEqual({
                                "field[1]": "Other error",
                            });
                        });
                    });
                    describe(`${updateMethod}`, () => {
                        scopedIt(`should require a name for ${label.toLowerCase()}`, () => {
                            const { formContext } = getForm({});
                            expect(() => formContext[updateMethod]()).toThrow(missingNameMsg);
                        });

                        scopedIt(`should require a code for ${label.toLowerCase()}`, () => {
                            const { formContext } = getForm({});
                            expect(() => formContext[updateMethod]("field1")).toThrow(missingCodeMsg);
                        });

                        scopedIt(`should require a message for ${label.toLowerCase()}`, () => {
                            const { formContext } = getForm({});
                            expect(() => formContext[updateMethod]("field1", "required")).toThrow(missingMessageMsg);
                        });
                        scopedIt(`should reject reserved server code for ${label.toLowerCase()}`, () => {
                            const { formContext } = getForm({});
                            expect(() => formContext[updateMethod]("field1", "server", "Some value")).toThrow(
                                reservedServerCodeMsg,
                            );
                        });

                        scopedIt(`should update a ${label.toLowerCase()} for a field`, async () => {
                            const { formContext } = getForm({
                                initialValues: { field1: "some value" },
                            });
                            expect(formContext.state[stateKey]).toEqual({});
                            const [stop, watchSpy] = testWatches(vue, formContext.state[stateKey], "field1");
                            try {
                                formContext[updateMethod]("field1", "required", `${label} is required`);
                                expect(formContext.state[stateKey]).toEqual({
                                    field1: { required: `${label} is required` },
                                });
                                await flushPromises();
                                expect(watchSpy).toHaveBeenCalledTimes(1);
                            } finally {
                                stop();
                            }
                        });
                        scopedIt(`should not update if the ${label.toLowerCase()} is unchanged`, async () => {
                            const { formContext } = getForm({
                                initialValues: { field1: "some value" },
                                [testPropKey]: {
                                    field1: {
                                        required: "Field is requried",
                                    },
                                },
                            });
                            expect(formContext.state[stateKey]).toEqual({
                                field1: {
                                    required: "Field is requried",
                                },
                            });
                            await flushPromises();
                            const [stop, watchSpy] = testWatches(vue, formContext.state[stateKey], "field1");
                            try {
                                formContext[updateMethod]("field1", "required", "Field is required");
                                await flushPromises();
                                expect(watchSpy).not.toHaveBeenCalled();
                            } finally {
                                stop();
                            }
                        });
                        scopedIt("should not reassign the entire errors object", async () => {
                            const { formContext } = getForm({
                                initialValues: { field1: "some value" },
                                [testPropKey]: {
                                    field2: {
                                        required: "Field! is required",
                                    },
                                },
                            });
                            expect(formContext.state[stateKey]).toEqual({
                                field2: { required: "Field! is required" },
                            });
                            await flushPromises();
                            const [stop, watchSpy, watchSpy2] = testWatches(
                                vue,
                                formContext.state[stateKey],
                                "field1",
                                "field2",
                            );
                            try {
                                formContext[updateMethod]("field1", "required", "Field@ is required");
                                expect(formContext.state[stateKey]).toEqual({
                                    field1: { required: "Field@ is required" },
                                    field2: { required: "Field! is required" },
                                });
                                await flushPromises();
                                expect(watchSpy).toHaveBeenCalledTimes(1);
                                expect(watchSpy.mock.calls[0]).toEqual([
                                    { required: "Field@ is required" },
                                    undefined,
                                    expect.any(Function),
                                ]);
                                expect(watchSpy2).not.toHaveBeenCalled();
                            } finally {
                                stop();
                            }
                        });
                    });
                    describe(`${deleteMethod}`, () => {
                        scopedIt("should require a name", () => {
                            const { formContext } = getForm({});
                            expect(() => formContext[deleteMethod]()).toThrow("No name provided");
                        });
                        scopedIt(
                            `should delete an ${label.toLowerCase()} for a field when a code is provided`,
                            async () => {
                                const { formContext } = getForm({
                                    initialValues: { field1: "some value" },
                                    [testPropKey]: {
                                        field1: {
                                            required: "Field is required",
                                            format: "Invalid format",
                                        },
                                    },
                                });
                                expect(formContext.state[stateKey].field1).toEqual({
                                    required: "Field is required",
                                    format: "Invalid format",
                                });
                                const [stop, watchSpy, watchSpy2] = testWatches(
                                    vue,
                                    formContext.state[stateKey],
                                    "field1.required",
                                    "field1.format",
                                );
                                try {
                                    formContext[deleteMethod]("field1", "required");
                                    expect(formContext.state[stateKey]).toEqual({
                                        field1: { format: "Invalid format" },
                                    });
                                    await flushPromises();
                                    expect(watchSpy).toHaveBeenCalledTimes(1);
                                    expect(watchSpy.mock.calls[0]).toEqual([
                                        undefined,
                                        "Field is required",
                                        expect.any(Function),
                                    ]);
                                    expect(watchSpy2).not.toHaveBeenCalled();
                                } finally {
                                    stop();
                                }
                            },
                        );
                        scopedIt(
                            `should delete all ${label.toLowerCase()}s for a field if no code is provided`,
                            async () => {
                                const { formContext } = getForm({
                                    initialValues: { field1: "some value" },
                                    [testPropKey]: {
                                        field1: {
                                            required: "Field is required",
                                            format: "Invalid format",
                                        },
                                        field2: {
                                            required: "Field is required",
                                            format: "Invalid format",
                                        },
                                    },
                                });
                                expect(formContext.state[stateKey]).toEqual({
                                    field1: {
                                        required: "Field is required",
                                        format: "Invalid format",
                                    },
                                    field2: {
                                        required: "Field is required",
                                        format: "Invalid format",
                                    },
                                });
                                const [stop, watchSpy, watchSpy2] = testWatches(
                                    vue,
                                    formContext.state[stateKey],
                                    "field1",
                                    "field2",
                                );
                                try {
                                    formContext[deleteMethod]("field1");
                                    expect(formContext.state[stateKey]).toEqual({
                                        field2: {
                                            required: "Field is required",
                                            format: "Invalid format",
                                        },
                                    });
                                    await flushPromises();
                                    expect(watchSpy).toHaveBeenCalledTimes(1);
                                    expect(watchSpy.mock.calls[0]).toEqual([
                                        undefined,
                                        {
                                            required: "Field is required",
                                            format: "Invalid format",
                                        },
                                        expect.any(Function),
                                    ]);
                                    expect(watchSpy2).not.toHaveBeenCalled();
                                } finally {
                                    stop();
                                }
                            },
                        );
                    });
                },
            );
            describe("handleServerFormValidationError", () => {
                scopedIt("should apply messages and errors from a ServerFeedbackError", async () => {
                    const { formContext } = getForm({ initialValues: {} });
                    const error = new ServerFeedbackError("Custom validation failed", {
                        messages: {
                            field1: ["Some server message"],
                        },
                        errors: {
                            field2: ["Some server error"],
                        },
                    });
                    formContext.handleServerFormValidationError(error);
                    await flushPromises();
                    expect(formContext.state.messages).toEqual({
                        field1: { server: ["Some server message"] },
                    });
                    expect(formContext.state.errors).toEqual({
                        field2: { server: ["Some server error"] },
                    });
                });
                scopedIt("should apply both messages and errors from a server validation error", async () => {
                    const { formContext } = getForm({ initialValues: {} });
                    const error = {
                        messages: {
                            field1: "Some server message",
                        },
                        errors: {
                            field2: "Some server error",
                        },
                    };
                    formContext.handleServerFormValidationError(error);
                    await flushPromises();
                    expect(formContext.state.messages).toEqual({
                        field1: { server: "Some server message" },
                    });
                    expect(formContext.state.errors).toEqual({
                        field2: { server: "Some server error" },
                    });
                });
                scopedIt("should apply only messages if no errors are present", async () => {
                    const { formContext } = getForm({ initialValues: {} });
                    const error = {
                        messages: {
                            field1: "Only message",
                        },
                        errors: {},
                    };
                    formContext.handleServerFormValidationError(error);
                    await flushPromises();
                    expect(formContext.state.messages).toEqual({
                        field1: { server: "Only message" },
                    });
                    expect(formContext.state.errors).toEqual({});
                });
                scopedIt("should apply only errors if no messages are present", async () => {
                    const { formContext } = getForm({ initialValues: {} });
                    const error = {
                        messages: {},
                        errors: {
                            field2: "Only error",
                        },
                    };
                    formContext.handleServerFormValidationError(error);
                    await flushPromises();
                    expect(formContext.state.errors).toEqual({
                        field2: { server: "Only error" },
                    });
                    expect(formContext.state.messages).toEqual({});
                });
                scopedIt("should do nothing if messages and errors are empty", async () => {
                    const { formContext } = getForm({ initialValues: {} });
                    const error = {
                        messages: {},
                        errors: {},
                    };
                    formContext.handleServerFormValidationError(error);
                    await flushPromises();
                    expect(formContext.state.errors).toEqual({});
                    expect(formContext.state.messages).toEqual({});
                });
                scopedIt("should reactively update errors and messages from server", async () => {
                    const { formContext } = getForm({ initialValues: {} });
                    const [stop, msgWatcher, errWatcher] = testWatches(
                        vue,
                        formContext.state,
                        "messages.field1",
                        "errors.field2",
                    );

                    try {
                        const error = {
                            messages: {
                                field1: "Hello message",
                            },
                            errors: {
                                field2: "Hello error",
                            },
                        };
                        formContext.handleServerFormValidationError(error);
                        await flushPromises();
                        expect(msgWatcher).toHaveBeenCalledTimes(1);
                        expect(errWatcher).toHaveBeenCalledTimes(1);
                    } finally {
                        stop();
                    }
                });
                scopedIt(
                    "should key a plain field's server error the same way toFlatValuePath addresses its value",
                    async () => {
                        const { formContext } = getForm({ initialValues: { name: "", other: "" } });
                        const error = new ServerFeedbackError("Invalid", { errors: { name: ["Too long"] } });

                        formContext.handleServerFormValidationError(error);
                        await flushPromises();

                        // `errors` is keyed by the raw server field name; a plain (undotted) identity's
                        // value path has to resolve to that same key, or the error never reaches the field
                        // that renders it.
                        expect(formContext.state.errors[toFlatValuePath("name")]).toEqual({ server: ["Too long"] });

                        formContext.setAllTouched();
                        expect(formContext.state.touched[toFlatValuePath("name")]).toBe(true);

                        expect(formContext.getFirstErrorField(["name"], [])).toBe("name");

                        // `clearServerErrors` is called with the same renderer-produced value path, so it
                        // has to resolve to the key the server error actually landed under.
                        formContext.clearServerErrors(toFlatValuePath("name"));
                        expect(formContext.state.errors[toFlatValuePath("name")]).toBeUndefined();
                    },
                );
            });
            describe("clearServerErrors", () => {
                scopedIt("should clear server error and message for a given field", async () => {
                    const { formContext } = getForm({
                        initialValues: { field1: "val" },
                        testErrors: { field1: { server: "Server error" } },
                        testMessages: { field1: { server: "Server message" } },
                    });

                    formContext.clearServerErrors("field1");
                    await flushPromises();

                    expect(formContext.state.errors).toEqual({});
                    expect(formContext.state.messages).toEqual({});
                });
                scopedIt("should clear server errors/messages for dependents", async () => {
                    const { formContext } = getForm({
                        initialValues: { main: "", dep1: "", dep2: "" },
                        testErrors: {
                            main: { server: "Main error" },
                            dep1: { server: "Dep1 error" },
                            dep2: { server: "Dep2 error" },
                        },
                        testMessages: {
                            main: { server: "Main message" },
                            dep1: { server: "Dep1 message" },
                            dep2: { server: "Dep2 message" },
                        },
                    });

                    formContext.clearServerErrors("main", ["dep1", "dep2"]);
                    await flushPromises();

                    expect(formContext.state.errors).toEqual({});
                    expect(formContext.state.messages).toEqual({});
                });
                scopedIt("should resolve $parent in dependent names", async () => {
                    const { formContext } = getForm({
                        initialValues: {
                            "parent.child": "",
                            "parent.child.dep": "",
                        },
                        testErrors: {
                            "parent.child": { server: "Error at child" },
                            "parent.child.dep": { server: "Error at dep" },
                        },
                        testMessages: {
                            "parent.child": { server: "Message at child" },
                            "parent.child.dep": { server: "Message at dep" },
                        },
                    });

                    formContext.clearServerErrors("parent.child", ["$parent.child.dep"]);
                    await flushPromises();

                    expect(formContext.state.errors).toEqual({});
                    expect(formContext.state.messages).toEqual({});
                });
                scopedIt("should not throw when clearing a missing field", () => {
                    const { formContext } = getForm({ initialValues: {} });
                    expect(() => formContext.clearServerErrors("missingField")).not.toThrow();
                });
                scopedIt("should recursively clear nested $parent dependencies", async () => {
                    const { formContext } = getForm({
                        initialValues: {
                            "parent.child.grandchild": "",
                        },
                        testErrors: {
                            "parent.child": { server: "child error" },
                            "parent.child.grandchild": { server: "grandchild error" },
                        },
                        testMessages: {
                            "parent.child": { server: "child msg" },
                            "parent.child.grandchild": { server: "grandchild msg" },
                        },
                    });

                    formContext.clearServerErrors("parent.child.grandchild", ["$parent", "$parent.$parent"]);
                    await flushPromises();

                    expect(formContext.state.errors).toEqual({});
                    expect(formContext.state.messages).toEqual({});
                });
            });
        });
        describe("Touch & Focus Management", () => {
            describe("setTouched", () => {
                scopedIt("should require a name", () => {
                    const { formContext } = getForm({});
                    expect(() => formContext.setTouched()).toThrow("No name provided");
                });

                scopedIt("should mark a field as touched", async () => {
                    const { formContext } = getForm({ initialValues: { field1: "abc" } });
                    expect(formContext.state.touched).toEqual({});
                    expect(formContext.state.anyTouched).toBe(false);

                    const [stop, watchTouched, watchAnyTouched] = testWatches(
                        vue,
                        formContext.state,
                        "touched.field1",
                        "anyTouched",
                    );
                    try {
                        formContext.setTouched("field1");
                        await flushPromises();

                        expect(formContext.state.touched).toEqual({ field1: true });
                        expect(formContext.state.anyTouched).toBe(true);
                        expect(watchTouched).toHaveBeenCalledTimes(1);
                        expect(watchAnyTouched).toHaveBeenCalledTimes(1);
                    } finally {
                        stop();
                    }
                });

                scopedIt("should not overwrite if field is already touched", async () => {
                    const { formContext } = getForm({
                        initialValues: { field1: "abc" },
                        testTouched: { field1: true },
                    });
                    expect(formContext.state.touched).toEqual({ field1: true });
                    expect(formContext.state.anyTouched).toBe(true);

                    const [stop, watchTouched, watchAnyTouched] = testWatches(
                        vue,
                        formContext.state.touched,
                        "field1",
                        "anyTouched",
                    );
                    try {
                        formContext.setTouched("field1");
                        await flushPromises();

                        expect(formContext.state.touched).toEqual({ field1: true });
                        expect(watchTouched).not.toHaveBeenCalled();
                        expect(watchAnyTouched).not.toHaveBeenCalled();
                    } finally {
                        stop();
                    }
                });

                scopedIt("should set anyTouched to true even if multiple fields are set incrementally", async () => {
                    const { formContext } = getForm({ initialValues: { field1: "", field2: "" } });
                    expect(formContext.state.anyTouched).toBe(false);

                    formContext.setTouched("field1");
                    await flushPromises();
                    expect(formContext.state.anyTouched).toBe(true);

                    formContext.setTouched("field2");
                    await flushPromises();
                    expect(formContext.state.touched).toEqual({ field1: true, field2: true });
                    expect(formContext.state.anyTouched).toBe(true);
                });
            });
            describe("setAllTouched", () => {
                scopedIt("should mark all fields as touched based on current values", async () => {
                    const { formContext } = getForm({
                        initialValues: {
                            name: "John",
                            email: "john@domain.invalid",
                            profile: {
                                age: 30,
                                bio: "Dev",
                            },
                            tags: ["one", "two"],
                        },
                    });

                    expect(formContext.state.touched).toEqual({});
                    expect(formContext.state.anyTouched).toBe(false);

                    const [stop, watchTouched, watchAnyTouched] = testWatches(
                        vue,
                        formContext.state,
                        "touched.name",
                        "anyTouched",
                        true,
                    );
                    try {
                        formContext.setAllTouched();
                        await flushPromises();

                        expect(Object.keys(formContext.state.touched)).toEqual(
                            expect.arrayContaining([
                                "name",
                                "email",
                                "profile.age",
                                "profile.bio",
                                "tags[0]",
                                "tags[1]",
                            ]),
                        );
                        expect(formContext.state.anyTouched).toBe(true);

                        expect(watchTouched).toHaveBeenCalled();
                        expect(watchAnyTouched).toHaveBeenCalled();
                    } finally {
                        stop();
                    }
                });

                scopedIt("should not throw when values are empty", () => {
                    const { formContext } = getForm({ initialValues: {} });

                    expect(() => formContext.setAllTouched()).not.toThrow();
                    expect(formContext.state.touched).toEqual({});
                    expect(formContext.state.anyTouched).toBe(true);
                });

                scopedIt("should not overwrite existing touched values", async () => {
                    const { formContext } = getForm({
                        initialValues: { field1: "abc", field2: "def" },
                        testTouched: { field1: true },
                    });

                    formContext.setAllTouched();
                    await flushPromises();

                    expect(formContext.state.touched).toMatchObject({
                        field1: true,
                        field2: true,
                    });
                    expect(formContext.state.anyTouched).toBe(true);
                });

                scopedIt("should not re-set anyTouched if already true", async () => {
                    const { formContext } = getForm({
                        initialValues: { a: 1, b: 2 },
                        testTouched: { a: true, b: true },
                    });

                    expect(formContext.state.anyTouched).toBe(true);

                    const [stop, watchAnyTouched] = testWatches(vue, formContext.state.touched, "anyTouched");
                    try {
                        formContext.setAllTouched();
                        await flushPromises();
                        expect(watchAnyTouched).not.toHaveBeenCalled(); // already true
                    } finally {
                        stop();
                    }
                });

                scopedIt("should set submitted to true", () => {
                    const { formContext } = getForm({ initialValues: { a: 1 } });
                    expect(formContext.state.submitted).toBe(false);
                    formContext.setAllTouched();
                    expect(formContext.state.submitted).toBe(true);
                });
            });
            describe("clearTouched", () => {
                describe("clearTouched", () => {
                    scopedIt("should require a name", () => {
                        const { formContext } = getForm({});
                        expect(() => formContext.clearTouched()).toThrow("No name provided");
                    });

                    scopedIt("should clear a touched field", async () => {
                        const { formContext } = getForm({
                            initialValues: { field1: "abc", field2: "def" },
                            testTouched: { field1: true, field2: true },
                        });

                        const [stop, watchSpy, watchSpy2] = testWatches(
                            vue,
                            formContext.state,
                            "touched.field1",
                            "anyTouched",
                        );

                        try {
                            formContext.clearTouched("field1");
                            await flushPromises();

                            expect(formContext.state.touched).toEqual({ field2: true });
                            expect(formContext.state.anyTouched).toBe(true);
                            expect(watchSpy).toHaveBeenCalledTimes(1);
                            expect(watchSpy2).not.toHaveBeenCalled(); // anyTouched remains true
                        } finally {
                            stop();
                        }
                    });

                    scopedIt("should clear anyTouched when last touched field is cleared", async () => {
                        const { formContext } = getForm({
                            initialValues: { field1: "abc" },
                            testTouched: { field1: true },
                        });

                        expect(formContext.state.anyTouched).toBe(true);

                        const [stop, watchSpy] = testWatches(vue, formContext.state, "anyTouched");

                        try {
                            formContext.clearTouched("field1");
                            await flushPromises();

                            expect(formContext.state.touched).toEqual({});
                            expect(formContext.state.anyTouched).toBe(false);
                            expect(watchSpy).toHaveBeenCalledTimes(1);
                        } finally {
                            stop();
                        }
                    });

                    scopedIt("should do nothing if the field is not touched", async () => {
                        const { formContext } = getForm({
                            initialValues: { field1: "abc" },
                            testTouched: { field2: true },
                        });

                        expect(formContext.state.touched).toEqual({ field2: true });
                        expect(formContext.state.anyTouched).toBe(true);

                        const [stop, watchSpy1, watchSpy2] = testWatches(
                            vue,
                            formContext.state.touched,
                            "field1",
                            "field2",
                        );

                        try {
                            formContext.clearTouched("field1");
                            await flushPromises();

                            expect(formContext.state.touched).toEqual({ field2: true });
                            expect(formContext.state.anyTouched).toBe(true);
                            expect(watchSpy1).not.toHaveBeenCalled();
                            expect(watchSpy2).not.toHaveBeenCalled();
                        } finally {
                            stop();
                        }
                    });
                });
            });
            describe("clearAllTouched", () => {
                scopedIt("should clear all touched fields and set anyTouched to false", async () => {
                    const { formContext } = getForm({
                        initialValues: { field1: "val1", field2: "val2" },
                        testTouched: { field1: true, field2: true },
                    });

                    expect(formContext.state.touched).toEqual({ field1: true, field2: true });
                    expect(formContext.state.anyTouched).toBe(true);

                    const [stop, watchTouched, watchAnyTouched] = testWatches(
                        vue,
                        formContext.state,
                        "touched",
                        "anyTouched",
                        true,
                    );

                    try {
                        formContext.clearAllTouched();
                        await flushPromises();

                        expect(formContext.state.touched).toEqual({});
                        expect(formContext.state.anyTouched).toBe(false);
                        expect(watchTouched).toHaveBeenCalled();
                        expect(watchAnyTouched).toHaveBeenCalled();
                    } finally {
                        stop();
                    }
                });
                scopedIt("should do nothing if no fields are touched", async () => {
                    const { formContext } = getForm({ initialValues: {} });

                    expect(formContext.state.touched).toEqual({});
                    expect(formContext.state.anyTouched).toBe(false);

                    const [stop, watchTouched, watchAnyTouched] = testWatches(
                        vue,
                        formContext.state,
                        "touched",
                        "anyTouched",
                    );

                    try {
                        formContext.clearAllTouched();
                        await flushPromises();

                        expect(formContext.state.touched).toEqual({});
                        expect(formContext.state.anyTouched).toBe(false);
                        expect(watchTouched).not.toHaveBeenCalled();
                        expect(watchAnyTouched).not.toHaveBeenCalled();
                    } finally {
                        stop();
                    }
                });
            });
            describe("focus", () => {
                scopedIt("should require a name", () => {
                    const { formContext } = getForm({});
                    expect(() => formContext.focus()).toThrow("No name provided");
                });

                scopedIt("should set the focused field", async () => {
                    const { formContext } = getForm({
                        initialValues: { field1: "abc", field2: "def" },
                    });
                    expect(formContext.state.focused).toBeNull();

                    const [stop, watchSpy] = testWatches(vue, formContext.state, "focused");
                    try {
                        formContext.focus("field1");
                        await flushPromises();

                        expect(formContext.state.focused).toBe("field1");
                        expect(watchSpy).toHaveBeenCalledTimes(1);
                    } finally {
                        stop();
                    }
                });

                scopedIt("should overwrite existing focus with new field", async () => {
                    const { formContext } = getForm({
                        initialValues: { field1: "", field2: "" },
                    });

                    formContext.focus("field1");
                    await flushPromises();
                    formContext.focus("field2");
                    await flushPromises();

                    expect(formContext.state.focused).toBe("field2");
                });

                scopedIt("should not change focus if the same field is focused again", async () => {
                    const { formContext } = getForm({
                        initialValues: { field1: "" },
                    });

                    formContext.focus("field1");
                    await flushPromises();

                    const [stop, watchSpy] = testWatches(vue, formContext.state, "focused");
                    try {
                        formContext.focus("field1");
                        await flushPromises();
                        expect(watchSpy).not.toHaveBeenCalled();
                    } finally {
                        stop();
                    }
                });
            });
            describe("blur", () => {
                scopedIt("should require a name", () => {
                    const { formContext } = getForm({});
                    expect(() => formContext.blur()).toThrow("No name provided");
                });

                scopedIt("should clear focus if the field was focused", async () => {
                    const { formContext } = getForm({
                        initialValues: { field1: "abc" },
                    });
                    formContext.focus("field1");
                    expect(formContext.state.focused).toBe("field1");

                    const [stop, watchFocused] = testWatches(vue, formContext.state, "focused");
                    try {
                        formContext.blur("field1");
                        await flushPromises();

                        expect(formContext.state.focused).toBeNull();
                        expect(watchFocused).toHaveBeenCalledTimes(1);
                    } finally {
                        stop();
                    }
                });

                scopedIt("should not clear focus if a different field is blurred", async () => {
                    const { formContext } = getForm({
                        initialValues: { field1: "", field2: "" },
                    });
                    formContext.focus("field1");
                    expect(formContext.state.focused).toBe("field1");

                    const [stop, watchFocused] = testWatches(vue, formContext.state, "focused");
                    try {
                        formContext.blur("field2");
                        await flushPromises();
                        expect(formContext.state.focused).toBe("field1");
                        expect(watchFocused).not.toHaveBeenCalled();
                    } finally {
                        stop();
                    }
                });

                scopedIt("should mark the field as touched", async () => {
                    const { formContext } = getForm({
                        initialValues: { field1: "abc" },
                    });
                    expect(formContext.state.touched).toEqual({});

                    const [stop, watchTouched] = testWatches(vue, formContext.state.touched, "field1");
                    try {
                        formContext.blur("field1");
                        await flushPromises();

                        expect(formContext.state.touched).toEqual({ field1: true });
                        expect(watchTouched).toHaveBeenCalledTimes(1);
                    } finally {
                        stop();
                    }
                });

                scopedIt("should set anyTouched to true if it was false", async () => {
                    const { formContext } = getForm({
                        initialValues: { field1: "abc" },
                    });
                    expect(formContext.state.anyTouched).toBe(false);

                    const [stop, watchAnyTouched] = testWatches(vue, formContext.state, "anyTouched");
                    try {
                        formContext.blur("field1");
                        await flushPromises();
                        expect(formContext.state.anyTouched).toBe(true);
                        expect(watchAnyTouched).toHaveBeenCalledTimes(1);
                    } finally {
                        stop();
                    }
                });
            });
        });
        describe("Ignore State Management", () => {
            describe("ignore", () => {
                scopedIt("should require a name", () => {
                    const { formContext } = getForm({});
                    expect(() => formContext.ignore()).toThrow("No name provided");
                });

                scopedIt("should mark a field as ignored", async () => {
                    const { formContext } = getForm({
                        initialValues: { field1: "value" },
                    });
                    expect(formContext.state.ignored).toEqual({});
                    expect(formContext.state.anyIgnored).toBe(false);

                    const [stop, watchIgnored, watchAnyIgnored] = testWatches(
                        vue,
                        formContext.state,
                        "ignored.field1",
                        "anyIgnored",
                    );
                    try {
                        formContext.ignore("field1");
                        await flushPromises();

                        expect(formContext.state.ignored).toEqual({ field1: true });
                        expect(formContext.state.anyIgnored).toBe(true);
                        expect(watchIgnored).toHaveBeenCalledTimes(1);
                        expect(watchAnyIgnored).toHaveBeenCalledTimes(1);
                    } finally {
                        stop();
                    }
                });

                scopedIt("should not set anyIgnored again if already true", async () => {
                    const { formContext } = getForm({
                        initialValues: { field1: "", field2: "" },
                    });

                    formContext.ignore("field1");
                    await flushPromises();
                    expect(formContext.state.anyIgnored).toBe(true);

                    const [stop, watchAnyIgnored] = testWatches(vue, formContext.state, "anyIgnored");

                    try {
                        formContext.ignore("field2");
                        await flushPromises();
                        expect(formContext.state.ignored).toHaveProperty("field2", true);
                        expect(watchAnyIgnored).not.toHaveBeenCalled();
                    } finally {
                        stop();
                    }
                });

                scopedIt("should not overwrite existing ignored field", async () => {
                    const { formContext } = getForm({
                        initialValues: { field1: "" },
                    });

                    formContext.ignore("field1");
                    await flushPromises();

                    const [stop, watchSpy] = testWatches(vue, formContext.state.ignored, "field1");

                    try {
                        formContext.ignore("field1"); // re-ignoring
                        await flushPromises();
                        expect(watchSpy).not.toHaveBeenCalled();
                    } finally {
                        stop();
                    }
                });
            });
            describe("removeIgnore", () => {
                scopedIt("should require a name", () => {
                    const { formContext } = getForm({});
                    expect(() => formContext.removeIgnore()).toThrow("No name provided");
                });

                scopedIt("should remove a field from ignored", async () => {
                    const { formContext } = getForm({
                        initialValues: { field1: "value", field2: "value" },
                    });
                    formContext.ignore("field1");
                    formContext.ignore("field2");
                    await flushPromises();

                    const [stop, watchIgnored, watchAnyIgnored] = testWatches(
                        vue,
                        formContext.state,
                        "ignored.field1",
                        "anyIgnored",
                    );
                    try {
                        formContext.removeIgnore("field1");
                        await flushPromises();

                        expect(formContext.state.ignored).not.toHaveProperty("field1");
                        expect(formContext.state.ignored).toHaveProperty("field2");
                        expect(formContext.state.anyIgnored).toBe(true);
                        expect(watchIgnored).toHaveBeenCalledTimes(1);
                        expect(watchAnyIgnored).not.toHaveBeenCalled();
                    } finally {
                        stop();
                    }
                });

                scopedIt("should clear anyIgnored if no ignored fields remain", async () => {
                    const { formContext } = getForm({
                        initialValues: { field1: "value" },
                    });
                    formContext.ignore("field1");
                    await flushPromises();

                    expect(formContext.state.anyIgnored).toBe(true);

                    const [stop, watchAnyIgnored] = testWatches(vue, formContext.state, "anyIgnored");
                    try {
                        formContext.removeIgnore("field1");
                        await flushPromises();

                        expect(formContext.state.ignored).toEqual({});
                        expect(formContext.state.anyIgnored).toBe(false);
                        expect(watchAnyIgnored).toHaveBeenCalledTimes(1);
                    } finally {
                        stop();
                    }
                });

                scopedIt("should do nothing if the field is not ignored", async () => {
                    const { formContext } = getForm({
                        initialValues: { field1: "", field2: "" },
                    });
                    formContext.ignore("field2");
                    await flushPromises();

                    const [stop, watchSpy] = testWatches(vue, formContext.state.ignored, "field1");
                    try {
                        formContext.removeIgnore("field1");
                        await flushPromises();
                        expect(watchSpy).not.toHaveBeenCalled();
                    } finally {
                        stop();
                    }
                });
            });
        });
        describe("Field Metadata", () => {
            describe("registerLabel", () => {
                scopedIt("should return a registration id", () => {
                    const { formContext } = getForm({});
                    const id = formContext.registerLabel("field1", () => "Field One");
                    expect(id).toBeTruthy();
                });

                scopedIt("should record the field's label", async () => {
                    const { formContext } = getForm({});
                    expect(formContext.state.labels).toEqual({});

                    formContext.registerLabel("field1", () => "Field One");
                    await flushPromises();
                    expect(formContext.state.labels).toEqual({ field1: "Field One" });
                });

                scopedIt("should reflect the hook's current value reactively, without re-registering", async () => {
                    const { formContext } = getForm({});
                    const label = vue.ref("Field One");
                    formContext.registerLabel("field1", () => label.value);
                    await flushPromises();
                    expect(formContext.state.labels).toEqual({ field1: "Field One" });

                    label.value = "Updated Field One";
                    await flushPromises();
                    expect(formContext.state.labels).toEqual({ field1: "Updated Field One" });
                });

                scopedIt("should report the most recently registered hook when two share a name", async () => {
                    const { formContext } = getForm({});
                    formContext.registerLabel("field1", () => "Outgoing label");
                    await flushPromises();
                    expect(formContext.state.labels).toEqual({ field1: "Outgoing label" });

                    // Models a replaced field instance: the incoming registration lands before
                    // the outgoing instance's own unregister call runs.
                    const incomingId = formContext.registerLabel("field1", () => "Incoming label");
                    await flushPromises();
                    expect(formContext.state.labels).toEqual({ field1: "Incoming label" });

                    expect(incomingId).toBeTruthy();
                });
            });
            describe("unregisterLabel", () => {
                scopedIt("should remove a field's label when its only registration is unregistered", async () => {
                    const { formContext } = getForm({});
                    const id = formContext.registerLabel("field1", () => "Field One");
                    await flushPromises();

                    formContext.unregisterLabel(id);
                    await flushPromises();
                    expect(formContext.state.labels).toEqual({});
                });

                scopedIt("should leave a surviving registration's label in place", async () => {
                    const { formContext } = getForm({});
                    const outgoingId = formContext.registerLabel("field1", () => "Outgoing label");
                    await flushPromises();
                    formContext.registerLabel("field1", () => "Incoming label");
                    await flushPromises();

                    // The outgoing instance unregisters by its own id, so it cannot delete the
                    // incoming instance's registration for the same name (see registerLabel's
                    // "most recently registered" test above for the replacement this models).
                    formContext.unregisterLabel(outgoingId);
                    await flushPromises();
                    expect(formContext.state.labels).toEqual({ field1: "Incoming label" });
                });

                scopedIt("should do nothing for an unknown registration id", async () => {
                    const { formContext } = getForm({});
                    formContext.registerLabel("field1", () => "Field One");
                    await flushPromises();

                    expect(formContext.unregisterLabel("unknown-id")).toBe(false);
                    await flushPromises();
                    expect(formContext.state.labels).toEqual({ field1: "Field One" });
                });
            });
            describe("registerShowsErrors", () => {
                scopedIt("should return a registration id", () => {
                    const { formContext } = getForm({});
                    const id = formContext.registerShowsErrors("field1", () => true);
                    expect(id).toBeTruthy();
                });

                scopedIt("should record whether the field shows its own errors", async () => {
                    const { formContext } = getForm({});
                    expect(formContext.state.showsErrors).toEqual({});

                    formContext.registerShowsErrors("field1", () => true);
                    formContext.registerShowsErrors("field2", () => false);
                    await flushPromises();
                    expect(formContext.state.showsErrors).toEqual({ field1: true, field2: false });
                });

                scopedIt("should reflect the hook's current value reactively, without re-registering", async () => {
                    const { formContext } = getForm({});
                    const hidden = vue.ref(false);
                    formContext.registerShowsErrors("field1", () => !hidden.value);
                    await flushPromises();
                    expect(formContext.state.showsErrors).toEqual({ field1: true });

                    hidden.value = true;
                    await flushPromises();
                    expect(formContext.state.showsErrors).toEqual({ field1: false });
                });

                scopedIt("should report true when any registration for a name shows errors", async () => {
                    const { formContext } = getForm({});
                    formContext.registerShowsErrors("field1", () => false);
                    formContext.registerShowsErrors("field1", () => true);
                    await flushPromises();
                    expect(formContext.state.showsErrors).toEqual({ field1: true });
                });
            });
            describe("unregisterShowsErrors", () => {
                scopedIt("should drop the field's entry when its only registration is unregistered", async () => {
                    const { formContext } = getForm({});
                    const id = formContext.registerShowsErrors("field1", () => true);
                    await flushPromises();

                    formContext.unregisterShowsErrors(id);
                    await flushPromises();
                    // No entry at all, as distinct from `false`: the form no longer knows of a
                    // rendered field for this name.
                    expect(formContext.state.showsErrors).toEqual({});
                });

                scopedIt("should leave a surviving registration in place", async () => {
                    const { formContext } = getForm({});
                    const outgoingId = formContext.registerShowsErrors("field1", () => true);
                    formContext.registerShowsErrors("field1", () => true);
                    await flushPromises();

                    formContext.unregisterShowsErrors(outgoingId);
                    await flushPromises();
                    expect(formContext.state.showsErrors).toEqual({ field1: true });
                });

                scopedIt("should do nothing for an unknown registration id", async () => {
                    const { formContext } = getForm({});
                    formContext.registerShowsErrors("field1", () => true);
                    await flushPromises();

                    expect(formContext.unregisterShowsErrors("unknown-id")).toBe(false);
                    await flushPromises();
                    expect(formContext.state.showsErrors).toEqual({ field1: true });
                });
            });
        });
        describe("Hook Registrations", () => {
            describe.todo("registerIsModifiedHook");
            describe.todo("unregisterIsModifiedHook");
            describe.todo("registerIsRequiredHook");
            describe.todo("unregisterIsRequiredHook");
            describe.todo("registerIsValidHook");
            describe.todo("unregisterIsValidHook");
        });
    });
    describe("lifecycle", () => {
        scopedIt("should immediately provide the same instances of itself under FormContextSymbol", () => {
            const { formContext } = getForm();
            expect(mockedProvide).toHaveBeenCalledTimes(1);
            expect(mockedProvide).toHaveBeenCalledWith(FormContextSymbol, formContext);
        });
    });
});
