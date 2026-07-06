import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ContextMenuShortcut from "@vueda/navigation/context-menu/ContextMenuShortcut.vue";
import DropdownMenuShortcut from "@vueda/navigation/dropdown-menu/DropdownMenuShortcut.vue";
import MenubarShortcut from "@vueda/navigation/menubar/MenubarShortcut.vue";

const cases = [
    ["DropdownMenuShortcut", DropdownMenuShortcut, "dropdown-menu-shortcut"],
    ["ContextMenuShortcut", ContextMenuShortcut, "context-menu-shortcut"],
    ["MenubarShortcut", MenubarShortcut, "menubar-shortcut"],
];

describe("lib/navigation menu shortcut components", () => {
    scopedIt.each(cases)("%s renders a shortcut wrapper with a Kbd child", (_name, component, slotName) => {
        const wrapper = mount(component, { slots: { default: "⌘S" } });

        expect(wrapper.attributes("data-slot")).toBe(slotName);
        expect(wrapper.element.tagName).toBe("SPAN");

        const kbd = wrapper.get("kbd");
        expect(kbd.text()).toBe("⌘S");
        expect(kbd.classes()).toContain("border-hairline");
    });

    scopedIt.each(cases)("%s keeps custom classes on the alignment wrapper", (_name, component) => {
        const wrapper = mount(component, {
            props: { class: "my-shortcut" },
            slots: { default: "⌘S" },
        });

        expect(wrapper.classes()).toContain("my-shortcut");
        expect(wrapper.get("kbd").classes()).not.toContain("my-shortcut");
    });
});
