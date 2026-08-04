import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Skeleton from "@vueda/feedback/skeleton/Skeleton.vue";

describe("lib/feedback/skeleton/Skeleton.vue", () => {
    describe("rendering", () => {
        scopedIt("renders as a <div>", () => {
            const wrapper = mount(Skeleton);
            expect(wrapper.element.tagName).toBe("DIV");
        });

        scopedIt("always has data-slot=skeleton", () => {
            const wrapper = mount(Skeleton);
            expect(wrapper.attributes("data-slot")).toBe("skeleton");
        });

        scopedIt("applies base classes", () => {
            const wrapper = mount(Skeleton);
            expect(wrapper.classes()).toContain("animate-pulse");
            expect(wrapper.classes()).toContain("rounded-md");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(Skeleton, { props: { class: "w-24 h-4" } });
            expect(wrapper.classes()).toContain("w-24");
            expect(wrapper.classes()).toContain("h-4");
            expect(wrapper.classes()).toContain("animate-pulse");
        });
    });
});
