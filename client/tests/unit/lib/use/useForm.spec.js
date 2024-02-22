import { mount } from "@vue/test-utils";
import { vi } from "vitest";

const mockedProvide = vi.fn();
vi.mock("vue", async () => {
    const original = await vi.importActual("vue");
    return {
        __esModule: true,
        ...original,
        provide: mockedProvide,
    };
});

describe("lib/use/useForm.js", () => {
    let reactive, nextTick, useForm;
    beforeEach(async () => {
        const vue = await vi.importActual("vue");
        reactive = vue.reactive;
        nextTick = vue.nextTick;
        useForm = await vi.importActual("@vueda/use/useForm.js").then((m) => m.default);
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    it("initializes form context correctly", () => {
        const initialValues = { test: "value" };
        const formContext = useForm(reactive({ initialValues }));

        expect(formContext.form.values).toEqual({ test: "value" });
        expect(formContext.form.errors).toEqual({});
        expect(formContext.form.messages).toEqual({});
        expect(formContext.form.dirty).toEqual({});
    });
    it("should provide the form context", async () => {
        const TestComponent = {
            setup() {
                return {
                    form: useForm({ initialValues: {} }),
                };
            },
            template: "<div></div>",
        };
        const wrapper = mount(TestComponent, {});
        expect(wrapper.vm.form).toEqual(mockedProvide.mock.calls[0][1]);
    });
    it("reacts to changes in initialValues", async () => {
        const initialValues = reactive({ test: "value" });
        const formContext = useForm({ initialValues });
        initialValues.test = "newValue";
        await nextTick();
        expect(formContext.form.values.test).toBe("newValue");
    });
});
