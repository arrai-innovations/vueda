import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import CommandShortcut from "@vueda/controls/command/CommandShortcut.vue";

describe("lib/controls/command/CommandShortcut.vue", () => {
    scopedIt("renders a shortcut wrapper with grouped Kbd children", () => {
        const wrapper = mount(CommandShortcut, { slots: { default: "⌘ ⇧ S" } });

        expect(wrapper.attributes("data-slot")).toBe("command-shortcut");
        expect(wrapper.element.tagName).toBe("SPAN");

        const group = wrapper.get("[data-slot='kbd-group']");
        const keycaps = group.findAll("kbd");
        expect(keycaps.map((kbd) => kbd.text())).toEqual(["⌘", "⇧", "S"]);
        expect(keycaps.every((kbd) => kbd.classes().includes("border-hairline"))).toBe(true);
    });

    scopedIt("keeps custom classes on the alignment wrapper", () => {
        const wrapper = mount(CommandShortcut, {
            props: { class: "my-shortcut" },
            slots: { default: "⌘ K" },
        });

        expect(wrapper.classes()).toContain("my-shortcut");
        expect(wrapper.get("[data-slot='kbd-group']").classes()).not.toContain("my-shortcut");
    });
});
