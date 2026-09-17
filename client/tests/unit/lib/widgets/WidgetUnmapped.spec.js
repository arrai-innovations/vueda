import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { reactive } from "vue";

const importComponent = () => import("@vueda/widgets/WidgetUnmapped.vue");
const QA_SEL = "[data-qa='unmapped-widget-message']";

describe("lib/widgets/WidgetUnmapped.vue", () => {
    let WidgetUnmapped;
    beforeEach(async () => {
        WidgetUnmapped = (await importComponent()).default;
    });

    scopedIt("names the field from the name prop", () => {
        const wrapper = mount(WidgetUnmapped, { props: { name: "foo" } });
        const msg = wrapper.get(QA_SEL);
        expect(msg.attributes("role")).toBe("alert");
        expect(msg.text()).toContain("Unmapped widget");
        expect(msg.text()).toContain('the field "foo" has no widget component');
    });

    scopedIt("names the field from the surrounding field context", () => {
        const fc = { state: reactive({ name: "serverIp" }) };
        const wrapper = mount(WidgetUnmapped, {
            global: { provide: { [FieldContextSymbol]: fc } },
        });
        expect(wrapper.get(QA_SEL).text()).toContain('the field "serverIp" has no widget component');
    });

    scopedIt("prefers the field context name over the name prop", () => {
        const fc = { state: reactive({ name: "fromContext" }) };
        const wrapper = mount(WidgetUnmapped, {
            props: { name: "fromProp" },
            global: { provide: { [FieldContextSymbol]: fc } },
        });
        expect(wrapper.get(QA_SEL).text()).toContain('the field "fromContext"');
    });

    scopedIt("falls back to a generic descriptor when no name resolves", () => {
        const wrapper = mount(WidgetUnmapped);
        expect(wrapper.get(QA_SEL).text()).toContain("this field has no widget component");
    });
});
