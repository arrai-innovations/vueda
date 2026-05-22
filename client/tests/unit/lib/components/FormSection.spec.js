import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import FormSection from "@vueda/components/FormSection.vue";

describe("lib/components/FormSection.vue", () => {
    describe("root element", () => {
        scopedIt("renders a <section> with data-slot='form-section'", () => {
            const wrapper = mount(FormSection);
            expect(wrapper.element.tagName).toBe("SECTION");
            expect(wrapper.attributes("data-slot")).toBe("form-section");
        });

        scopedIt("merges a custom class onto the root", () => {
            const wrapper = mount(FormSection, { props: { class: "custom-class" } });
            expect(wrapper.classes()).toContain("custom-class");
        });

        scopedIt("renders default slot content as the body", () => {
            const wrapper = mount(FormSection, {
                slots: { default: '<p data-qa="body">Body content</p>' },
            });
            expect(wrapper.find('[data-qa="body"]').exists()).toBe(true);
        });
    });

    describe("head row", () => {
        scopedIt("omits the head row when neither title nor aside slot is provided", () => {
            const wrapper = mount(FormSection);
            expect(wrapper.find('[data-qa="form-section-head"]').exists()).toBe(false);
        });

        scopedIt("renders the head row when a title slot is provided", () => {
            const wrapper = mount(FormSection, {
                slots: { title: "<span>Profile</span>" },
            });
            expect(wrapper.find('[data-qa="form-section-head"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="form-section-head"]').text()).toContain("Profile");
        });

        scopedIt("renders the aside span only when the aside slot is provided", () => {
            const without = mount(FormSection, {
                slots: { title: "<span>Profile</span>" },
            });
            expect(without.find('[data-qa="form-section-aside"]').exists()).toBe(false);

            const withAside = mount(FormSection, {
                slots: {
                    title: "<span>Profile</span>",
                    aside: "required",
                },
            });
            expect(withAside.find('[data-qa="form-section-aside"]').text()).toBe("required");
        });

        scopedIt("renders the head row when only the aside slot is provided", () => {
            const wrapper = mount(FormSection, {
                slots: { aside: "optional" },
            });
            expect(wrapper.find('[data-qa="form-section-head"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="form-section-aside"]').text()).toBe("optional");
        });
    });
});
