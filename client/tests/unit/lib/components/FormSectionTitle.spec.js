import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import FormSectionTitle from "@vueda/components/FormSectionTitle.vue";

describe("lib/components/FormSectionTitle.vue", () => {
    scopedIt("renders an <h3> with data-slot='form-section-title'", () => {
        const wrapper = mount(FormSectionTitle);
        expect(wrapper.element.tagName).toBe("H3");
        expect(wrapper.attributes("data-slot")).toBe("form-section-title");
    });

    scopedIt("renders default slot content", () => {
        const wrapper = mount(FormSectionTitle, {
            slots: { default: "Profile" },
        });
        expect(wrapper.text()).toBe("Profile");
    });

    scopedIt("applies the eyebrow recipe classes", () => {
        const wrapper = mount(FormSectionTitle);
        const classes = wrapper.classes();
        expect(classes).toContain("uppercase");
        expect(classes).toContain("font-semibold");
        expect(classes).toContain("text-muted-foreground");
    });

    scopedIt("merges a custom class onto the root", () => {
        const wrapper = mount(FormSectionTitle, { props: { class: "custom-class" } });
        expect(wrapper.classes()).toContain("custom-class");
    });
});
