import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import SidebarUserBlock from "@vueda/navigation/sidebar/SidebarUserBlock.vue";

describe("lib/navigation/sidebar/SidebarUserBlock.vue", () => {
    describe("rendering", () => {
        scopedIt("always has data-slot=sidebar-user-block on the root", () => {
            const wrapper = mount(SidebarUserBlock, { props: { name: "Jess Rivera" } });
            expect(wrapper.attributes("data-slot")).toBe("sidebar-user-block");
        });

        scopedIt("renders the name and role lines", () => {
            const wrapper = mount(SidebarUserBlock, {
                props: { name: "Jess Rivera", role: "Admin · Acme Co." },
            });
            expect(wrapper.text()).toContain("Jess Rivera");
            expect(wrapper.text()).toContain("Admin · Acme Co.");
        });

        scopedIt("omits the role line when role is empty", () => {
            const wrapper = mount(SidebarUserBlock, { props: { name: "Jess Rivera" } });
            expect(wrapper.text()).not.toContain("Admin");
            // Only the name span should be present in the text column.
            expect(wrapper.findAll("span").map((s) => s.text())).not.toContain("");
        });

        scopedIt("composes UserAvatar with sidebar tone at 32 px", () => {
            const wrapper = mount(SidebarUserBlock, { props: { name: "Jess Rivera" } });
            const avatar = wrapper.find('[data-slot="user-avatar"]');
            expect(avatar.exists()).toBe(true);
            expect(avatar.attributes("data-tone")).toBe("sidebar");
            expect(avatar.attributes("style") || "").toContain("width: 32px");
            expect(avatar.text()).toBe("JR");
        });

        scopedIt("forwards explicit initials to UserAvatar", () => {
            const wrapper = mount(SidebarUserBlock, {
                props: { name: "Jess Rivera", initials: "ZZ" },
            });
            expect(wrapper.find('[data-slot="user-avatar"]').text()).toBe("ZZ");
        });

        scopedIt("renders the kebab slot when provided", () => {
            const wrapper = mount(SidebarUserBlock, {
                props: { name: "Jess Rivera" },
                slots: { kebab: '<button data-test="kebab">…</button>' },
            });
            expect(wrapper.find('[data-test="kebab"]').exists()).toBe(true);
        });

        scopedIt("merges custom class while preserving theme classes", () => {
            const wrapper = mount(SidebarUserBlock, {
                props: { name: "Jess Rivera", class: "my-custom-class" },
            });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("flex");
        });
    });
});
