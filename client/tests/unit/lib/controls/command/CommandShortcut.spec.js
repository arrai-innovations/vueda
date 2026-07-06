import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import CommandShortcut from "@vueda/controls/command/CommandShortcut.vue";

describe("lib/controls/command/CommandShortcut.vue", () => {
    scopedIt("renders a shortcut wrapper with a Kbd child", () => {
        const wrapper = mount(CommandShortcut, { slots: { default: "⌘ K" } });

        expect(wrapper.attributes("data-slot")).toBe("command-shortcut");
        expect(wrapper.element.tagName).toBe("SPAN");

        const kbd = wrapper.get("kbd");
        expect(kbd.text()).toBe("⌘ K");
        expect(kbd.classes()).toContain("border-hairline");
    });

    scopedIt("keeps custom classes on the alignment wrapper", () => {
        const wrapper = mount(CommandShortcut, {
            props: { class: "my-shortcut" },
            slots: { default: "⌘ K" },
        });

        expect(wrapper.classes()).toContain("my-shortcut");
        expect(wrapper.get("kbd").classes()).not.toContain("my-shortcut");
    });
});
