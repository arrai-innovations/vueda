import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

let lmvProps;
const LinkModelViewStub = defineComponent({
    name: "LinkModelViewStub",
    props: ["app", "model", "pk", "view", "button"],
    setup(props, { slots }) {
        return () => {
            lmvProps = { ...props };
            return h("a", { "data-qa": "lmv" }, slots.default ? slots.default() : null);
        };
    },
});
vi.mock("@vueda/components/LinkModelView.vue", () => ({ default: LinkModelViewStub }));

let ColumnModelLink;
beforeEach(async () => {
    lmvProps = undefined;
    ColumnModelLink = (await import("@vueda/components/ColumnModelLink.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
});

const link = (wrapper) => wrapper.find('[data-qa="lmv"]');

describe("lib/components/ColumnModelLink.vue", () => {
    describe("rendering a link", () => {
        scopedIt("links using the field's related-model identity and a scalar pk", () => {
            const wrapper = mount(ColumnModelLink, {
                props: {
                    value: 5,
                    formatted: "Widgets",
                    field: { appLabel: "catalog", model: "widgetcategory" },
                },
            });
            expect(link(wrapper).exists()).toBe(true);
            expect(lmvProps).toMatchObject({ app: "catalog", model: "widgetcategory", pk: 5, view: "read" });
            expect(link(wrapper).text()).toBe("Widgets");
            wrapper.unmount();
        });

        scopedIt("falls back to columnProps app/model when the field omits them", () => {
            const wrapper = mount(ColumnModelLink, {
                props: { value: 3, app: "catalog", model: "supplier", field: {} },
            });
            expect(link(wrapper).exists()).toBe(true);
            expect(lmvProps).toMatchObject({ app: "catalog", model: "supplier", pk: 3 });
            wrapper.unmount();
        });

        scopedIt("prefers the field identity over the columnProps fallback", () => {
            const wrapper = mount(ColumnModelLink, {
                props: {
                    value: 1,
                    field: { appLabel: "catalog", model: "widgetcategory" },
                    app: "other",
                    model: "wrong",
                },
            });
            expect(lmvProps).toMatchObject({ app: "catalog", model: "widgetcategory" });
            wrapper.unmount();
        });

        scopedIt("extracts pk and label from an object value", () => {
            const wrapper = mount(ColumnModelLink, {
                props: {
                    value: { id: 9, name: "Acme" },
                    field: { appLabel: "catalog", model: "supplier" },
                },
            });
            expect(lmvProps.pk).toBe(9);
            expect(link(wrapper).text()).toBe("Acme");
            wrapper.unmount();
        });

        scopedIt("an explicit label overrides the formatted value", () => {
            const wrapper = mount(ColumnModelLink, {
                props: {
                    value: 2,
                    formatted: "from-formatted",
                    label: "explicit",
                    field: { appLabel: "a", model: "b" },
                },
            });
            expect(link(wrapper).text()).toBe("explicit");
            wrapper.unmount();
        });

        scopedIt("forwards the button flag", () => {
            const wrapper = mount(ColumnModelLink, {
                props: { value: 2, button: true, field: { appLabel: "a", model: "b" } },
            });
            expect(lmvProps.button).toBe(true);
            wrapper.unmount();
        });
    });

    describe("degrading to text", () => {
        scopedIt("renders plain text when no target model is resolvable", () => {
            const wrapper = mount(ColumnModelLink, { props: { value: 5, formatted: "Widgets", field: {} } });
            expect(link(wrapper).exists()).toBe(false);
            expect(wrapper.text()).toBe("Widgets");
            wrapper.unmount();
        });

        scopedIt("renders plain text when the pk is empty", () => {
            const wrapper = mount(ColumnModelLink, {
                props: { value: "", formatted: "-", field: { appLabel: "a", model: "b" } },
            });
            expect(link(wrapper).exists()).toBe(false);
            expect(wrapper.text()).toBe("-");
            wrapper.unmount();
        });

        scopedIt("renders plain text for an array (many) value rather than a single link", () => {
            const wrapper = mount(ColumnModelLink, {
                props: { value: [1, 2, 3], formatted: "3 items", field: { appLabel: "a", model: "b" } },
            });
            expect(link(wrapper).exists()).toBe(false);
            expect(wrapper.text()).toBe("3 items");
            wrapper.unmount();
        });
    });

    scopedIt("does not leak surplus cell-context props as DOM attributes", () => {
        const wrapper = mount(ColumnModelLink, {
            props: { value: 5, field: { appLabel: "a", model: "b" } },
            attrs: { "data-obj": "row", "data-pk-key": "id" },
        });
        expect(link(wrapper).attributes("data-obj")).toBeUndefined();
        expect(link(wrapper).attributes("data-pk-key")).toBeUndefined();
        wrapper.unmount();
    });
});
