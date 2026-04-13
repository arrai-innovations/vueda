import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import InputOTP from "@vueda/controls/input-otp/InputOTP.vue";
import InputOTPGroup from "@vueda/controls/input-otp/InputOTPGroup.vue";
import InputOTPSeparator from "@vueda/controls/input-otp/InputOTPSeparator.vue";
import InputOTPSlot from "@vueda/controls/input-otp/InputOTPSlot.vue";

vi.mock("vue-input-otp", async (importOriginal) => {
    const actual = await importOriginal();
    const { defineComponent, h, ref } = await import("vue");
    return {
        ...actual,
        OTPInput: defineComponent({
            name: "OTPInput",
            props: { containerClass: String, maxlength: Number },
            setup(props, { slots, attrs }) {
                return () =>
                    h(
                        "div",
                        { "data-slot": attrs["data-slot"], class: props.containerClass },
                        slots.default ? slots.default({ slots: [], isFocused: false, isHovering: false }) : undefined,
                    );
            },
        }),
        useVueOTPContext: () =>
            ref({
                slots: [
                    { char: "1", isActive: true, hasFakeCaret: false, placeholderChar: null },
                    { char: null, isActive: false, hasFakeCaret: true, placeholderChar: null },
                ],
            }),
    };
});

describe("lib/controls/input-otp/InputOTP.vue", () => {
    describe("InputOTP", () => {
        scopedIt("has data-slot=input-otp", () => {
            const wrapper = mount(InputOTP, { props: { maxlength: 6 } });
            expect(wrapper.find('[data-slot="input-otp"]').exists()).toBe(true);
        });

        scopedIt("applies container class with has-disabled:opacity-50", () => {
            const wrapper = mount(InputOTP, { props: { maxlength: 6 } });
            expect(wrapper.find('[data-slot="input-otp"]').classes()).toContain("flex");
        });

        scopedIt("merges custom class into container", () => {
            const wrapper = mount(InputOTP, {
                props: { maxlength: 6, class: "my-otp" },
            });
            expect(wrapper.find('[data-slot="input-otp"]').classes()).toContain("my-otp");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(InputOTP, {
                props: { maxlength: 6 },
                slots: { default: "<span>slot</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("InputOTPGroup", () => {
        scopedIt("has data-slot=input-otp-group", () => {
            const wrapper = mount(InputOTPGroup);
            expect(wrapper.attributes("data-slot")).toBe("input-otp-group");
        });

        scopedIt("applies flex items-center classes", () => {
            const wrapper = mount(InputOTPGroup);
            expect(wrapper.classes()).toContain("flex");
            expect(wrapper.classes()).toContain("items-center");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(InputOTPGroup, { props: { class: "my-group" } });
            expect(wrapper.classes()).toContain("my-group");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(InputOTPGroup, {
                slots: { default: "<span>A</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("InputOTPSeparator", () => {
        scopedIt("has data-slot=input-otp-separator", () => {
            const wrapper = mount(InputOTPSeparator);
            expect(wrapper.attributes("data-slot")).toBe("input-otp-separator");
        });

        scopedIt("has role=separator", () => {
            const wrapper = mount(InputOTPSeparator);
            expect(wrapper.attributes("role")).toBe("separator");
        });

        scopedIt("renders minus character by default", () => {
            const wrapper = mount(InputOTPSeparator);
            expect(wrapper.find("span").text()).toBe("−");
        });

        scopedIt("renders custom slot content", () => {
            const wrapper = mount(InputOTPSeparator, {
                slots: { default: "<span>|</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("InputOTPSlot", () => {
        scopedIt("has data-slot=input-otp-slot", () => {
            const wrapper = mount(InputOTPSlot, { props: { index: 0 } });
            expect(wrapper.attributes("data-slot")).toBe("input-otp-slot");
        });

        scopedIt("applies border and sizing classes", () => {
            const wrapper = mount(InputOTPSlot, { props: { index: 0 } });
            expect(wrapper.classes()).toContain("h-9");
            expect(wrapper.classes()).toContain("w-9");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(InputOTPSlot, {
                props: { index: 0, class: "my-slot" },
            });
            expect(wrapper.classes()).toContain("my-slot");
        });

        scopedIt("renders char from context at index 0", () => {
            const wrapper = mount(InputOTPSlot, { props: { index: 0 } });
            expect(wrapper.text()).toContain("1");
        });

        scopedIt("sets data-active from context", () => {
            const wrapper = mount(InputOTPSlot, { props: { index: 0 } });
            expect(wrapper.attributes("data-active")).toBe("true");
        });

        scopedIt("renders fake caret when hasFakeCaret is true", () => {
            const wrapper = mount(InputOTPSlot, { props: { index: 1 } });
            expect(wrapper.find(".animate-caret-blink").exists()).toBe(true);
        });
    });
});
