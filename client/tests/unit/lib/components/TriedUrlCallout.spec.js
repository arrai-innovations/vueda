import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import TriedUrlCallout from "@vueda/components/TriedUrlCallout.vue";

const mountCallout = (props = {}) => mount(TriedUrlCallout, { props });

describe("lib/components/TriedUrlCallout.vue", () => {
    describe("root element", () => {
        scopedIt("renders with data-slot='tried-url-callout'", () => {
            const wrapper = mountCallout();
            expect(wrapper.attributes("data-slot")).toBe("tried-url-callout");
        });

        scopedIt("merges a custom class onto the root", () => {
            const wrapper = mountCallout({ class: "custom-class" });
            expect(wrapper.classes()).toContain("custom-class");
        });
    });

    describe("label column", () => {
        scopedIt("renders default label 'You tried'", () => {
            const wrapper = mountCallout();
            expect(wrapper.find('[data-qa="tried-url-callout-label"]').text()).toBe("You tried");
        });

        scopedIt("renders a custom label", () => {
            const wrapper = mountCallout({ label: "Action key" });
            expect(wrapper.find('[data-qa="tried-url-callout-label"]').text()).toBe("Action key");
        });
    });

    describe("value column", () => {
        scopedIt("always renders the value element", () => {
            const wrapper = mountCallout();
            expect(wrapper.find('[data-qa="tried-url-callout-value"]').exists()).toBe(true);
        });

        scopedIt("renders no segment spans when segments is empty", () => {
            const wrapper = mountCallout({ segments: [] });
            expect(wrapper.findAll('[data-qa="tried-url-callout-segment"]')).toHaveLength(0);
            expect(wrapper.findAll('[data-qa="tried-url-callout-segment-bad"]')).toHaveLength(0);
        });
    });

    describe("non-bad segments", () => {
        scopedIt("renders a non-bad segment span with the fade qa attribute", () => {
            const wrapper = mountCallout({ segments: [{ text: "/crm/customers/list" }] });
            expect(wrapper.find('[data-qa="tried-url-callout-segment"]').exists()).toBe(true);
        });

        scopedIt("renders the segment text", () => {
            const wrapper = mountCallout({ segments: [{ text: "/crm/customers/list" }] });
            expect(wrapper.find('[data-qa="tried-url-callout-segment"]').text()).toBe("/crm/customers/list");
        });

        scopedIt("treats bad=false the same as omitted bad", () => {
            const wrapper = mountCallout({ segments: [{ text: "/crm/", bad: false }] });
            expect(wrapper.find('[data-qa="tried-url-callout-segment"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="tried-url-callout-segment-bad"]').exists()).toBe(false);
        });
    });

    describe("bad segments", () => {
        scopedIt("renders a bad segment span with the segment-bad qa attribute", () => {
            const wrapper = mountCallout({ segments: [{ text: "custommers", bad: true }] });
            expect(wrapper.find('[data-qa="tried-url-callout-segment-bad"]').exists()).toBe(true);
        });

        scopedIt("renders the bad segment text", () => {
            const wrapper = mountCallout({ segments: [{ text: "custommers", bad: true }] });
            expect(wrapper.find('[data-qa="tried-url-callout-segment-bad"]').text()).toBe("custommers");
        });

        scopedIt("applies text-destructive to bad segments", () => {
            const wrapper = mountCallout({ segments: [{ text: "custommers", bad: true }] });
            expect(wrapper.find('[data-qa="tried-url-callout-segment-bad"]').classes()).toContain("text-destructive");
        });

        scopedIt("does not apply text-destructive to non-bad segments", () => {
            const wrapper = mountCallout({ segments: [{ text: "/crm/", bad: false }] });
            expect(wrapper.find('[data-qa="tried-url-callout-segment"]').classes()).not.toContain("text-destructive");
        });
    });

    describe("mixed segments", () => {
        scopedIt("renders all segments in order", () => {
            const wrapper = mountCallout({
                segments: [
                    { text: "/crm/", bad: false },
                    { text: "custommers", bad: true },
                    { text: "/list", bad: false },
                ],
            });
            expect(wrapper.findAll('[data-qa="tried-url-callout-segment"]')).toHaveLength(2);
            expect(wrapper.findAll('[data-qa="tried-url-callout-segment-bad"]')).toHaveLength(1);
        });

        scopedIt("bad segment text is correct in mixed context", () => {
            const wrapper = mountCallout({
                segments: [
                    { text: "/crm/", bad: false },
                    { text: "custommers", bad: true },
                    { text: "/list", bad: false },
                ],
            });
            expect(wrapper.find('[data-qa="tried-url-callout-segment-bad"]').text()).toBe("custommers");
        });
    });

    describe("themeOverride", () => {
        scopedIt("applies themeOverride to the root", () => {
            const wrapper = mountCallout({
                themeOverride: { TriedUrlCallout: { root: { class: "custom-root" } } },
            });
            expect(wrapper.classes()).toContain("custom-root");
        });

        scopedIt("applies themeOverride to the label", () => {
            const wrapper = mountCallout({
                themeOverride: { TriedUrlCallout: { label: { class: "custom-label" } } },
            });
            expect(wrapper.find('[data-qa="tried-url-callout-label"]').classes()).toContain("custom-label");
        });

        scopedIt("applies themeOverride to the value", () => {
            const wrapper = mountCallout({
                themeOverride: { TriedUrlCallout: { value: { class: "custom-value" } } },
            });
            expect(wrapper.find('[data-qa="tried-url-callout-value"]').classes()).toContain("custom-value");
        });

        scopedIt("applies themeOverride to fade segments", () => {
            const wrapper = mountCallout({
                segments: [{ text: "/crm/", bad: false }],
                themeOverride: { TriedUrlCallout: { fade: { class: "custom-fade" } } },
            });
            expect(wrapper.find('[data-qa="tried-url-callout-segment"]').classes()).toContain("custom-fade");
        });
    });

    describe("reactivity", () => {
        scopedIt("updates when segments prop changes", async () => {
            const wrapper = mountCallout({
                segments: [{ text: "/crm/", bad: false }],
            });
            expect(wrapper.findAll('[data-qa="tried-url-callout-segment"]')).toHaveLength(1);
            expect(wrapper.findAll('[data-qa="tried-url-callout-segment-bad"]')).toHaveLength(0);

            await wrapper.setProps({
                segments: [
                    { text: "/crm/", bad: false },
                    { text: "custommers", bad: true },
                    { text: "/list", bad: false },
                ],
            });
            expect(wrapper.findAll('[data-qa="tried-url-callout-segment"]')).toHaveLength(2);
            expect(wrapper.findAll('[data-qa="tried-url-callout-segment-bad"]')).toHaveLength(1);
        });

        scopedIt("updates when label prop changes", async () => {
            const wrapper = mountCallout({ label: "You tried" });
            expect(wrapper.find('[data-qa="tried-url-callout-label"]').text()).toBe("You tried");

            await wrapper.setProps({ label: "Action key" });
            expect(wrapper.find('[data-qa="tried-url-callout-label"]').text()).toBe("Action key");
        });
    });
});
