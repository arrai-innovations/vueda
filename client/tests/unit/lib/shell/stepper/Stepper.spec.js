import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Stepper from "@vueda/shell/stepper/Stepper.vue";
import StepperItem from "@vueda/shell/stepper/StepperItem.vue";
import StepperSeparator from "@vueda/shell/stepper/StepperSeparator.vue";
import { h } from "vue";

describe("lib/shell/stepper/Stepper.vue", () => {
    describe("StepperSeparator", () => {
        scopedIt("applies layout classes so the track is visible between steps", () => {
            const wrapper = mount(Stepper, {
                props: { defaultValue: 1 },
                slots: {
                    default: () => [
                        h(StepperItem, { step: 1 }, { default: () => h(StepperSeparator, { class: "my-sep" }) }),
                        h(StepperItem, { step: 2 }),
                    ],
                },
            });
            const separator = wrapper.find(".my-sep");
            expect(separator.exists()).toBe(true);
            expect(separator.classes()).toContain("flex-1");
            expect(separator.classes()).toContain("h-0.5");
            expect(separator.classes()).toContain("min-w-6");
            expect(separator.classes()).toContain("rounded-sm");
            expect(separator.classes()).toContain("mt-4");
            expect(separator.classes()).toContain("transition-colors");
            expect(separator.classes()).toContain("bg-muted");
        });
    });
});
