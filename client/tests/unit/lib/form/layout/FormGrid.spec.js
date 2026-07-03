import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import FormGrid from "@vueda/form/layout/FormGrid.vue";

describe("lib/form/layout/FormGrid.vue", () => {
    scopedIt("renders a div with data-slot='form-grid'", () => {
        const wrapper = mount(FormGrid);
        expect(wrapper.element.tagName).toBe("DIV");
        expect(wrapper.attributes("data-slot")).toBe("form-grid");
    });

    scopedIt("applies the 12-column grid recipe", () => {
        const wrapper = mount(FormGrid);
        const classes = wrapper.classes();
        expect(classes).toContain("grid");
        expect(classes).toContain("grid-cols-12");
    });

    scopedIt("renders default slot children", () => {
        const wrapper = mount(FormGrid, {
            slots: { default: '<div data-col="6" data-qa="child">a</div>' },
        });
        expect(wrapper.find('[data-qa="child"]').exists()).toBe(true);
        expect(wrapper.find('[data-qa="child"]').attributes("data-col")).toBe("6");
    });

    scopedIt("merges a custom class onto the root", () => {
        const wrapper = mount(FormGrid, { props: { class: "custom-class" } });
        expect(wrapper.classes()).toContain("custom-class");
    });
});
