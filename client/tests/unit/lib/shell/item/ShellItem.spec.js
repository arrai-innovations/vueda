import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ShellItem from "@vueda/shell/item/ShellItem.vue";
import ShellItemActions from "@vueda/shell/item/ShellItemActions.vue";
import ShellItemContent from "@vueda/shell/item/ShellItemContent.vue";
import ShellItemDescription from "@vueda/shell/item/ShellItemDescription.vue";
import ShellItemFooter from "@vueda/shell/item/ShellItemFooter.vue";
import ShellItemGroup from "@vueda/shell/item/ShellItemGroup.vue";
import ShellItemHeader from "@vueda/shell/item/ShellItemHeader.vue";
import ShellItemMedia from "@vueda/shell/item/ShellItemMedia.vue";
import ShellItemSeparator from "@vueda/shell/item/ShellItemSeparator.vue";
import ShellItemTitle from "@vueda/shell/item/ShellItemTitle.vue";
import { h } from "vue";

describe("lib/shell/item/ShellItem.vue", () => {
    describe("ShellItem", () => {
        scopedIt("has data-slot=item", () => {
            const wrapper = mount(ShellItem);
            expect(wrapper.attributes("data-slot")).toBe("item");
        });

        scopedIt("renders as div by default", () => {
            const wrapper = mount(ShellItem);
            expect(wrapper.element.tagName).toBe("DIV");
        });

        scopedIt("applies default variant and size classes", () => {
            const wrapper = mount(ShellItem);
            expect(wrapper.classes()).toContain("flex");
            expect(wrapper.classes()).toContain("items-center");
            expect(wrapper.classes()).toContain("p-4");
        });

        scopedIt("applies outline variant classes", () => {
            const wrapper = mount(ShellItem, { props: { variant: "outline" } });
            expect(wrapper.classes()).toContain("border-border");
        });

        scopedIt("applies sm size classes", () => {
            const wrapper = mount(ShellItem, { props: { size: "sm" } });
            expect(wrapper.classes()).toContain("py-3");
        });

        scopedIt("reflects variant in data-variant attribute", () => {
            const wrapper = mount(ShellItem, { props: { variant: "outline" } });
            expect(wrapper.attributes("data-variant")).toBe("outline");
        });

        scopedIt("reflects size in data-size attribute", () => {
            const wrapper = mount(ShellItem, { props: { size: "sm" } });
            expect(wrapper.attributes("data-size")).toBe("sm");
        });

        scopedIt("merges custom class while preserving variant classes", () => {
            const wrapper = mount(ShellItem, { props: { class: "my-item" } });
            expect(wrapper.classes()).toContain("my-item");
            expect(wrapper.classes()).toContain("flex");
        });

        scopedIt("renders as a different element when as prop is set", () => {
            const wrapper = mount(ShellItem, { props: { as: "li" } });
            expect(wrapper.element.tagName).toBe("LI");
        });

        scopedIt("merges onto child element when asChild is true", () => {
            const wrapper = mount(ShellItem, {
                props: { asChild: true },
                slots: { default: () => h("a", { href: "/foo" }, "Link") },
            });
            expect(wrapper.element.tagName).toBe("A");
            expect(wrapper.attributes("data-slot")).toBe("item");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ShellItem, { slots: { default: "Item text" } });
            expect(wrapper.text()).toBe("Item text");
        });
    });

    describe("ShellItemGroup", () => {
        scopedIt("has role=list", () => {
            const wrapper = mount(ShellItemGroup);
            expect(wrapper.attributes("role")).toBe("list");
        });

        scopedIt("has data-slot=item-group", () => {
            const wrapper = mount(ShellItemGroup);
            expect(wrapper.attributes("data-slot")).toBe("item-group");
        });

        scopedIt("applies flex-col class", () => {
            const wrapper = mount(ShellItemGroup);
            expect(wrapper.classes()).toContain("flex-col");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ShellItemGroup, { props: { class: "my-group" } });
            expect(wrapper.classes()).toContain("my-group");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ShellItemGroup, { slots: { default: "<li>Item</li>" } });
            expect(wrapper.find("li").exists()).toBe(true);
        });
    });

    describe("ShellItemHeader", () => {
        scopedIt("has data-slot=item-header", () => {
            const wrapper = mount(ShellItemHeader);
            expect(wrapper.attributes("data-slot")).toBe("item-header");
        });

        scopedIt("applies justify-between and items-center classes", () => {
            const wrapper = mount(ShellItemHeader);
            expect(wrapper.classes()).toContain("justify-between");
            expect(wrapper.classes()).toContain("items-center");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ShellItemHeader, { props: { class: "my-header" } });
            expect(wrapper.classes()).toContain("my-header");
        });
    });

    describe("ShellItemFooter", () => {
        scopedIt("has data-slot=item-footer", () => {
            const wrapper = mount(ShellItemFooter);
            expect(wrapper.attributes("data-slot")).toBe("item-footer");
        });

        scopedIt("applies justify-between and basis-full classes", () => {
            const wrapper = mount(ShellItemFooter);
            expect(wrapper.classes()).toContain("justify-between");
            expect(wrapper.classes()).toContain("basis-full");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ShellItemFooter, { props: { class: "my-footer" } });
            expect(wrapper.classes()).toContain("my-footer");
        });
    });

    describe("ShellItemContent", () => {
        scopedIt("has data-slot=item-content", () => {
            const wrapper = mount(ShellItemContent);
            expect(wrapper.attributes("data-slot")).toBe("item-content");
        });

        scopedIt("applies flex-col and flex-1 classes", () => {
            const wrapper = mount(ShellItemContent);
            expect(wrapper.classes()).toContain("flex-col");
            expect(wrapper.classes()).toContain("flex-1");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ShellItemContent, { props: { class: "my-content" } });
            expect(wrapper.classes()).toContain("my-content");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ShellItemContent, { slots: { default: "Content" } });
            expect(wrapper.text()).toBe("Content");
        });
    });

    describe("ShellItemTitle", () => {
        scopedIt("has data-slot=item-title", () => {
            const wrapper = mount(ShellItemTitle);
            expect(wrapper.attributes("data-slot")).toBe("item-title");
        });

        scopedIt("applies font-medium and items-center classes", () => {
            const wrapper = mount(ShellItemTitle);
            expect(wrapper.classes()).toContain("font-medium");
            expect(wrapper.classes()).toContain("items-center");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ShellItemTitle, { props: { class: "my-title" } });
            expect(wrapper.classes()).toContain("my-title");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ShellItemTitle, { slots: { default: "Title text" } });
            expect(wrapper.text()).toBe("Title text");
        });
    });

    describe("ShellItemDescription", () => {
        scopedIt("has data-slot=item-description", () => {
            const wrapper = mount(ShellItemDescription);
            expect(wrapper.attributes("data-slot")).toBe("item-description");
        });

        scopedIt("renders as a p element", () => {
            const wrapper = mount(ShellItemDescription);
            expect(wrapper.element.tagName).toBe("P");
        });

        scopedIt("applies muted text and line-clamp classes", () => {
            const wrapper = mount(ShellItemDescription);
            expect(wrapper.classes()).toContain("text-muted-foreground");
            expect(wrapper.classes()).toContain("line-clamp-2");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ShellItemDescription, { props: { class: "my-desc" } });
            expect(wrapper.classes()).toContain("my-desc");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ShellItemDescription, { slots: { default: "A description." } });
            expect(wrapper.text()).toBe("A description.");
        });
    });

    describe("ShellItemActions", () => {
        scopedIt("has data-slot=item-actions", () => {
            const wrapper = mount(ShellItemActions);
            expect(wrapper.attributes("data-slot")).toBe("item-actions");
        });

        scopedIt("applies flex and gap-2 classes", () => {
            const wrapper = mount(ShellItemActions);
            expect(wrapper.classes()).toContain("flex");
            expect(wrapper.classes()).toContain("gap-2");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ShellItemActions, { props: { class: "my-actions" } });
            expect(wrapper.classes()).toContain("my-actions");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ShellItemActions, { slots: { default: "<button>Edit</button>" } });
            expect(wrapper.find("button").exists()).toBe(true);
        });
    });

    describe("ShellItemMedia", () => {
        scopedIt("has data-slot=item-media", () => {
            const wrapper = mount(ShellItemMedia);
            expect(wrapper.attributes("data-slot")).toBe("item-media");
        });

        scopedIt("applies base flex and shrink-0 classes", () => {
            const wrapper = mount(ShellItemMedia);
            expect(wrapper.classes()).toContain("flex");
            expect(wrapper.classes()).toContain("shrink-0");
        });

        scopedIt("applies icon variant classes", () => {
            const wrapper = mount(ShellItemMedia, { props: { variant: "icon" } });
            expect(wrapper.classes()).toContain("size-8");
        });

        scopedIt("applies image variant classes", () => {
            const wrapper = mount(ShellItemMedia, { props: { variant: "image" } });
            expect(wrapper.classes()).toContain("size-10");
        });

        scopedIt("reflects variant in data-variant attribute", () => {
            const wrapper = mount(ShellItemMedia, { props: { variant: "icon" } });
            expect(wrapper.attributes("data-variant")).toBe("icon");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ShellItemMedia, { props: { class: "my-media" } });
            expect(wrapper.classes()).toContain("my-media");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ShellItemMedia, { slots: { default: "<img src='x.png' />" } });
            expect(wrapper.find("img").exists()).toBe(true);
        });
    });

    describe("ShellItemSeparator", () => {
        scopedIt("has data-slot=item-separator", () => {
            const wrapper = mount(ShellItemSeparator);
            expect(wrapper.find('[data-slot="item-separator"]').exists()).toBe(true);
        });

        scopedIt("always uses horizontal orientation", () => {
            const wrapper = mount(ShellItemSeparator);
            expect(wrapper.find('[data-slot="item-separator"]').attributes("data-orientation")).toBe("horizontal");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ShellItemSeparator, { props: { class: "my-sep" } });
            expect(wrapper.find('[data-slot="item-separator"]').classes()).toContain("my-sep");
        });
    });
});
