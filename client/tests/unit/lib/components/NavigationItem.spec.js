import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

const RouterLinkStub = defineComponent({
    name: "RouterLinkStub",
    props: ["to"],
    setup(props, { slots }) {
        return () =>
            h(
                "a",
                {
                    "data-qa": "router-link",
                    "data-to": typeof props.to === "string" ? props.to : JSON.stringify(props.to),
                },
                slots.default ? slots.default() : null,
            );
    },
});

let NavigationItem;

beforeEach(async () => {
    NavigationItem = (await import("@vueda/components/NavigationItem.vue")).default;
});

describe("lib/components/NavigationItem.vue", () => {
    scopedIt("renders a router link when item has link", () => {
        const item = { name: "Home", link: "/home" };
        const wrapper = mount(NavigationItem, {
            props: { item },
            global: { stubs: { RouterLink: RouterLinkStub } },
        });
        const link = wrapper.get('[data-qa="router-link"]');
        expect(link.text()).toBe("Home");
        expect(link.attributes("data-to")).toBe("/home");
        expect(wrapper.find("span").exists()).toBe(false);
    });

    scopedIt("renders a span when no link is provided", () => {
        const item = { name: "NoLink" };
        const wrapper = mount(NavigationItem, {
            props: { item },
            global: { stubs: { RouterLink: RouterLinkStub } },
        });
        const span = wrapper.get("span");
        expect(span.text()).toBe("NoLink");
        expect(wrapper.find('[data-qa="router-link"]').exists()).toBe(false);
    });

    scopedIt("renders children recursively", () => {
        const item = {
            name: "Parent",
            children: [{ name: "Child1", link: "/child1" }, { name: "Child2" }],
        };
        const wrapper = mount(NavigationItem, {
            props: { item },
            global: { stubs: { RouterLink: RouterLinkStub } },
        });
        const listItems = wrapper.findAll("li");
        expect(listItems).toHaveLength(3);
        expect(wrapper.text()).toContain("Child1");
        expect(wrapper.text()).toContain("Child2");
        const links = wrapper.findAll('[data-qa="router-link"]');
        expect(links).toHaveLength(1);
        expect(links[0].attributes("data-to")).toBe("/child1");
    });
});
