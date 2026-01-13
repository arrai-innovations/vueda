import { mockProvideInject, scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

var provideStore, mockedProvide, mockedInject;

const mockedUseForm = vi.fn();
vi.mock("@vueda/use/useForm.js", () => ({
    useForm: mockedUseForm,
}));

const mockedUseLookupContext = vi.fn();
vi.mock("@vueda/use/useLookupContext.js", () => ({
    useLookupContext: mockedUseLookupContext,
}));

let detailedViewEmit;
const DetailedViewStub = defineComponent({
    name: "DetailedViewStub",
    props: ["modelValue", "app", "model", "pk", "viewName"],
    emits: ["update:modelValue", "form-context", "form-object", "loading", "object"],
    setup(props, { emit, attrs, slots }) {
        detailedViewEmit = emit;
        return () =>
            h(
                "div",
                {
                    "data-qa": "detailed-view",
                    "data-app": props.app,
                    "data-model": props.model,
                    "data-pk": props.pk,
                    "data-view-name": props.viewName,
                    ...attrs,
                },
                Object.keys(slots).map((name) => h("div", { "data-slot": name }, slots[name] ? slots[name]() : null)),
            );
    },
});

vi.mock("@vueda/components/DetailedView.vue", () => ({
    default: DetailedViewStub,
}));

vi.mock("vue", async () => {
    const actual = await vi.importActual("vue");
    ({ provideStore, mockedProvide, mockedInject } = mockProvideInject(vi));
    return {
        __esModule: true,
        ...actual,
        inject: mockedInject,
        provide: mockedProvide,
    };
});

let ViewRead, vue;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    detailedViewEmit = undefined;
    mockedUseForm.mockClear();
    mockedUseLookupContext.mockClear();
    ViewRead = (await import("@vueda/views/ViewRead.vue")).default;
    provideStore.clear();
});

scopedIt("calls useLookupContext if lookup context is missing", () => {
    mockedInject.mockReturnValueOnce(null);
    mount(ViewRead, { props: { app: "app", model: "model", pk: "1" } });
    expect(mockedUseLookupContext).toHaveBeenCalled();
});

scopedIt("does not call useLookupContext when lookup context exists", () => {
    mockedInject.mockReturnValueOnce({});
    mount(ViewRead, { props: { app: "app", model: "model", pk: "1" } });
    expect(mockedUseLookupContext).not.toHaveBeenCalled();
});

scopedIt("passes props and attrs to DetailedView and forwards slots", () => {
    mockedInject.mockReturnValueOnce({});
    const wrapper = mount(ViewRead, {
        props: { app: "myApp", model: "myModel", pk: "123" },
        attrs: { foo: "bar" },
        slots: {
            default: "<span>default</span>",
            header: "<span>header</span>",
        },
    });

    const dv = wrapper.find('[data-qa="detailed-view"]');
    expect(dv.attributes("data-app")).toBe("myApp");
    expect(dv.attributes("data-model")).toBe("myModel");
    expect(dv.attributes("data-pk")).toBe("123");
    expect(dv.attributes("data-view-name")).toBe("read");
    expect(dv.attributes("foo")).toBe("bar");
    expect(dv.find('[data-slot="default"]').text()).toBe("default");
    expect(dv.find('[data-slot="header"]').text()).toBe("header");
    const formArg = mockedUseForm.mock.calls[0][0];
    expect(vue.isReactive(formArg)).toBe(true);
});

scopedIt("forwards events from DetailedView", async () => {
    mockedInject.mockReturnValueOnce({});
    const wrapper = mount(ViewRead, { props: { app: "a", model: "b", pk: "c" } });

    detailedViewEmit("loading", true);
    detailedViewEmit("object", { id: 5 });
    detailedViewEmit("form-object", { foo: "bar" });
    detailedViewEmit("form-context", { baz: 1 });
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("loading")[0]).toEqual([true]);
    expect(wrapper.emitted("object")[0]).toEqual([{ id: 5 }]);
    expect(wrapper.emitted("form-object")[0]).toEqual([{ foo: "bar" }]);
    expect(wrapper.emitted("form-context")[0]).toEqual([{ baz: 1 }]);
});
