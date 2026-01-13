import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

const MessageStub = defineComponent({
    name: "MessageStub",
    props: ["severity"],
    setup(props, { slots }) {
        return () =>
            h("div", { "data-qa": "message", "data-severity": props.severity }, slots.default ? slots.default() : null);
    },
});
vi.mock("primevue/message", () => ({ default: MessageStub }));

const importComponent = () => import("@vueda/widgets/WidgetUnmapped.vue");

describe("lib/widgets/WidgetUnmapped.vue", () => {
    let WidgetUnmapped;
    beforeEach(async () => {
        WidgetUnmapped = (await importComponent()).default;
    });

    scopedIt("shows unmapped widget message with name", () => {
        const wrapper = mount(WidgetUnmapped, { props: { name: "foo" } });
        const msg = wrapper.get("[data-qa='message']");
        expect(msg.attributes("data-severity")).toBe("error");
        expect(msg.text()).toContain("Unmapped Widget");
        expect(msg.text()).toContain('name "foo" is not mapped to a widget component');
    });
});
