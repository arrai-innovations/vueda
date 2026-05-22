import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

const importComponent = () => import("@vueda/widgets/WidgetUnmapped.vue");

describe("lib/widgets/WidgetUnmapped.vue", () => {
    let WidgetUnmapped;
    beforeEach(async () => {
        WidgetUnmapped = (await importComponent()).default;
    });

    scopedIt("shows unmapped widget message with name", () => {
        const wrapper = mount(WidgetUnmapped, { props: { name: "foo" } });
        const msg = wrapper.get("[data-qa='unmapped-widget-message']");
        expect(msg.attributes("role")).toBe("alert");
        expect(msg.text()).toContain("Unmapped Widget");
        expect(msg.text()).toContain('name "foo" is not mapped to a widget component');
    });
});
