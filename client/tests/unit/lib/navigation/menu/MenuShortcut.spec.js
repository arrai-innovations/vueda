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
    scopedIt.each(cases)("%s renders a shortcut wrapper with grouped Kbd children", (_name, component, slotName) => {
        const wrapper = mount(component, { props: { keys: ["⇧", "⌘", "L"] } });

        expect(wrapper.attributes("data-slot")).toBe(slotName);
        expect(wrapper.element.tagName).toBe("SPAN");

        const group = wrapper.get("[data-slot='kbd-group']");
        const keycaps = group.findAll("kbd");
        expect(keycaps.map((kbd) => kbd.text())).toEqual(["⇧", "⌘", "L"]);
        expect(keycaps.every((kbd) => kbd.classes().includes("hairline"))).toBe(true);
    });

    scopedIt.each(cases)("%s keeps custom classes on the alignment wrapper", (_name, component) => {
        const wrapper = mount(component, {
            props: { class: "my-shortcut", keys: ["⌘", "S"] },
        });

        expect(wrapper.classes()).toContain("my-shortcut");
        expect(wrapper.get("[data-slot='kbd-group']").classes()).not.toContain("my-shortcut");
    });

    scopedIt.each(cases)("%s falls back to parsing slot text", (_name, component) => {
        const wrapper = mount(component, { slots: { default: "⌘S" } });

        const keycaps = wrapper.get("[data-slot='kbd-group']").findAll("kbd");
        expect(keycaps.map((kbd) => kbd.text())).toEqual(["⌘", "S"]);
    });
});
