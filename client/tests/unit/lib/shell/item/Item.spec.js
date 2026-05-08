import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Item from "@vueda/shell/item/Item.vue";
import ItemActions from "@vueda/shell/item/ItemActions.vue";
import ItemContent from "@vueda/shell/item/ItemContent.vue";
import ItemDescription from "@vueda/shell/item/ItemDescription.vue";
import ItemFooter from "@vueda/shell/item/ItemFooter.vue";
import ItemGroup from "@vueda/shell/item/ItemGroup.vue";
import ItemHeader from "@vueda/shell/item/ItemHeader.vue";
import ItemMedia from "@vueda/shell/item/ItemMedia.vue";
import ItemSeparator from "@vueda/shell/item/ItemSeparator.vue";
import ItemTitle from "@vueda/shell/item/ItemTitle.vue";
import { h } from "vue";

describe("lib/shell/item/Item.vue", () => {
    describe("Item", () => {
        scopedIt("has data-slot=item", () => {
            const wrapper = mount(Item);
            expect(wrapper.attributes("data-slot")).toBe("item");
        });

        scopedIt("renders as div by default", () => {
            const wrapper = mount(Item);
            expect(wrapper.element.tagName).toBe("DIV");
        });

        scopedIt("applies default variant and size classes", () => {
            const wrapper = mount(Item);
            expect(wrapper.classes()).toContain("flex");
            expect(wrapper.classes()).toContain("items-center");
            expect(wrapper.classes()).toContain("p-4");
        });

        scopedIt("applies outline variant classes", () => {
            const wrapper = mount(Item, { props: { variant: "outline" } });
            expect(wrapper.classes()).toContain("border-border");
        });

        scopedIt("applies sm size classes", () => {
            const wrapper = mount(Item, { props: { size: "sm" } });
            expect(wrapper.classes()).toContain("py-3");
        });

        scopedIt("reflects variant in data-variant attribute", () => {
            const wrapper = mount(Item, { props: { variant: "outline" } });
            expect(wrapper.attributes("data-variant")).toBe("outline");
        });

        scopedIt("reflects size in data-size attribute", () => {
            const wrapper = mount(Item, { props: { size: "sm" } });
            expect(wrapper.attributes("data-size")).toBe("sm");
        });

        scopedIt("merges custom class while preserving variant classes", () => {
            const wrapper = mount(Item, { props: { class: "my-item" } });
            expect(wrapper.classes()).toContain("my-item");
            expect(wrapper.classes()).toContain("flex");
        });

        scopedIt("renders as a different element when as prop is set", () => {
            const wrapper = mount(Item, { props: { as: "li" } });
            expect(wrapper.element.tagName).toBe("LI");
        });

        scopedIt("merges onto child element when asChild is true", () => {
            const wrapper = mount(Item, {
                props: { asChild: true },
                slots: { default: () => h("a", { href: "/foo" }, "Link") },
            });
            expect(wrapper.element.tagName).toBe("A");
            expect(wrapper.attributes("data-slot")).toBe("item");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(Item, { slots: { default: "Item text" } });
            expect(wrapper.text()).toBe("Item text");
        });
    });

    describe("ItemGroup", () => {
        scopedIt("has role=list", () => {
            const wrapper = mount(ItemGroup);
            expect(wrapper.attributes("role")).toBe("list");
        });

        scopedIt("has data-slot=item-group", () => {
            const wrapper = mount(ItemGroup);
            expect(wrapper.attributes("data-slot")).toBe("item-group");
        });

        scopedIt("applies flex-col class", () => {
            const wrapper = mount(ItemGroup);
            expect(wrapper.classes()).toContain("flex-col");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ItemGroup, { props: { class: "my-group" } });
            expect(wrapper.classes()).toContain("my-group");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ItemGroup, { slots: { default: "<li>Item</li>" } });
            expect(wrapper.find("li").exists()).toBe(true);
        });
    });

    describe("ItemHeader", () => {
        scopedIt("has data-slot=item-header", () => {
            const wrapper = mount(ItemHeader);
            expect(wrapper.attributes("data-slot")).toBe("item-header");
        });

        scopedIt("applies justify-between and items-center classes", () => {
            const wrapper = mount(ItemHeader);
            expect(wrapper.classes()).toContain("justify-between");
            expect(wrapper.classes()).toContain("items-center");
        });

        scopedIt("applies mono supporting-text treatment", () => {
            const wrapper = mount(ItemHeader);
            expect(wrapper.classes()).toContain("font-mono");
            expect(wrapper.classes()).toContain("text-muted-foreground");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ItemHeader, { props: { class: "my-header" } });
            expect(wrapper.classes()).toContain("my-header");
        });
    });

    describe("ItemFooter", () => {
        scopedIt("has data-slot=item-footer", () => {
            const wrapper = mount(ItemFooter);
            expect(wrapper.attributes("data-slot")).toBe("item-footer");
        });

        scopedIt("applies justify-between and basis-full classes", () => {
            const wrapper = mount(ItemFooter);
            expect(wrapper.classes()).toContain("justify-between");
            expect(wrapper.classes()).toContain("basis-full");
        });

        scopedIt("applies mono supporting-text treatment", () => {
            const wrapper = mount(ItemFooter);
            expect(wrapper.classes()).toContain("font-mono");
            expect(wrapper.classes()).toContain("text-muted-foreground");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ItemFooter, { props: { class: "my-footer" } });
            expect(wrapper.classes()).toContain("my-footer");
        });
    });

    describe("ItemContent", () => {
        scopedIt("has data-slot=item-content", () => {
            const wrapper = mount(ItemContent);
            expect(wrapper.attributes("data-slot")).toBe("item-content");
        });

        scopedIt("applies flex-col and flex-1 classes", () => {
            const wrapper = mount(ItemContent);
            expect(wrapper.classes()).toContain("flex-col");
            expect(wrapper.classes()).toContain("flex-1");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ItemContent, { props: { class: "my-content" } });
            expect(wrapper.classes()).toContain("my-content");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ItemContent, { slots: { default: "Content" } });
            expect(wrapper.text()).toBe("Content");
        });
    });

    describe("ItemTitle", () => {
        scopedIt("has data-slot=item-title", () => {
            const wrapper = mount(ItemTitle);
            expect(wrapper.attributes("data-slot")).toBe("item-title");
        });

        scopedIt("applies font-medium and items-center classes", () => {
            const wrapper = mount(ItemTitle);
            expect(wrapper.classes()).toContain("font-medium");
            expect(wrapper.classes()).toContain("items-center");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ItemTitle, { props: { class: "my-title" } });
            expect(wrapper.classes()).toContain("my-title");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ItemTitle, { slots: { default: "Title text" } });
            expect(wrapper.text()).toBe("Title text");
        });
    });

    describe("ItemDescription", () => {
        scopedIt("has data-slot=item-description", () => {
            const wrapper = mount(ItemDescription);
            expect(wrapper.attributes("data-slot")).toBe("item-description");
        });

        scopedIt("renders as a p element", () => {
            const wrapper = mount(ItemDescription);
            expect(wrapper.element.tagName).toBe("P");
        });

        scopedIt("applies muted text and line-clamp classes", () => {
            const wrapper = mount(ItemDescription);
            expect(wrapper.classes()).toContain("text-muted-foreground");
            expect(wrapper.classes()).toContain("line-clamp-2");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ItemDescription, { props: { class: "my-desc" } });
            expect(wrapper.classes()).toContain("my-desc");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ItemDescription, { slots: { default: "A description." } });
            expect(wrapper.text()).toBe("A description.");
        });
    });

    describe("ItemActions", () => {
        scopedIt("has data-slot=item-actions", () => {
            const wrapper = mount(ItemActions);
            expect(wrapper.attributes("data-slot")).toBe("item-actions");
        });

        scopedIt("applies flex and gap-2 classes", () => {
            const wrapper = mount(ItemActions);
            expect(wrapper.classes()).toContain("flex");
            expect(wrapper.classes()).toContain("gap-2");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ItemActions, { props: { class: "my-actions" } });
            expect(wrapper.classes()).toContain("my-actions");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ItemActions, { slots: { default: "<button>Edit</button>" } });
            expect(wrapper.find("button").exists()).toBe(true);
        });
    });

    describe("ItemMedia", () => {
        scopedIt("has data-slot=item-media", () => {
            const wrapper = mount(ItemMedia);
            expect(wrapper.attributes("data-slot")).toBe("item-media");
        });

        scopedIt("applies base flex and shrink-0 classes", () => {
            const wrapper = mount(ItemMedia);
            expect(wrapper.classes()).toContain("flex");
            expect(wrapper.classes()).toContain("shrink-0");
        });

        scopedIt("applies icon variant classes", () => {
            const wrapper = mount(ItemMedia, { props: { variant: "icon" } });
            expect(wrapper.classes()).toContain("size-8");
        });

        scopedIt("applies image variant classes", () => {
            const wrapper = mount(ItemMedia, { props: { variant: "image" } });
            expect(wrapper.classes()).toContain("size-10");
        });

        scopedIt("reflects variant in data-variant attribute", () => {
            const wrapper = mount(ItemMedia, { props: { variant: "icon" } });
            expect(wrapper.attributes("data-variant")).toBe("icon");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ItemMedia, { props: { class: "my-media" } });
            expect(wrapper.classes()).toContain("my-media");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ItemMedia, { slots: { default: "<img src='x.png' />" } });
            expect(wrapper.find("img").exists()).toBe(true);
        });
    });

    describe("ItemSeparator", () => {
        scopedIt("has data-slot=item-separator", () => {
            const wrapper = mount(ItemSeparator);
            expect(wrapper.find('[data-slot="item-separator"]').exists()).toBe(true);
        });

        scopedIt("always uses horizontal orientation", () => {
            const wrapper = mount(ItemSeparator);
            expect(wrapper.find('[data-slot="item-separator"]').attributes("data-orientation")).toBe("horizontal");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ItemSeparator, { props: { class: "my-sep" } });
            expect(wrapper.find('[data-slot="item-separator"]').classes()).toContain("my-sep");
        });
    });
});
