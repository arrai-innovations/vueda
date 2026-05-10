import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import UserAvatar from "@vueda/display/avatar/UserAvatar.vue";

describe("lib/display/avatar/UserAvatar.vue", () => {
    describe("initials derivation", () => {
        scopedIt("uses first + last token initials for two-token names", () => {
            const wrapper = mount(UserAvatar, { props: { name: "Jess Rivera" } });
            expect(wrapper.text()).toBe("JR");
        });

        scopedIt("uses first + last token initials for names with middle tokens", () => {
            const wrapper = mount(UserAvatar, { props: { name: "Mara Anh Tani" } });
            expect(wrapper.text()).toBe("MT");
        });

        scopedIt("uses first two characters for single-token names", () => {
            const wrapper = mount(UserAvatar, { props: { name: "Madonna" } });
            expect(wrapper.text()).toBe("MA");
        });

        scopedIt("collapses runs of whitespace", () => {
            const wrapper = mount(UserAvatar, { props: { name: "  Jess   Rivera  " } });
            expect(wrapper.text()).toBe("JR");
        });

        scopedIt("uppercases initials", () => {
            const wrapper = mount(UserAvatar, { props: { name: "jess rivera" } });
            expect(wrapper.text()).toBe("JR");
        });

        scopedIt("renders empty initials for empty name", () => {
            const wrapper = mount(UserAvatar, { props: { name: "" } });
            expect(wrapper.text()).toBe("");
        });

        scopedIt("explicit initials prop wins over derivation", () => {
            const wrapper = mount(UserAvatar, { props: { name: "Jess Rivera", initials: "xy" } });
            expect(wrapper.text()).toBe("XY");
        });

        scopedIt("aria-label mirrors the full name when present", () => {
            const wrapper = mount(UserAvatar, { props: { name: "Jess Rivera" } });
            expect(wrapper.attributes("aria-label")).toBe("Jess Rivera");
        });
    });

    describe("sizing", () => {
        scopedIt("default size is 32 px", () => {
            const wrapper = mount(UserAvatar, { props: { name: "JR" } });
            const style = wrapper.attributes("style") || "";
            expect(style).toContain("width: 32px");
            expect(style).toContain("height: 32px");
        });

        scopedIt("custom size is reflected on the root", () => {
            const wrapper = mount(UserAvatar, { props: { name: "JR", size: 22 } });
            const style = wrapper.attributes("style") || "";
            expect(style).toContain("width: 22px");
            expect(style).toContain("height: 22px");
        });

        scopedIt("font-size is derived from size at ~45% (clamped to 10 px floor)", () => {
            const tiny = mount(UserAvatar, { props: { name: "JR", size: 16 } });
            // 16 * 0.45 = 7.2, clamped to 10
            expect(tiny.attributes("style") || "").toContain("font-size: 10px");
            const sidebar = mount(UserAvatar, { props: { name: "JR", size: 32 } });
            // 32 * 0.45 = 14.4 → 14
            expect(sidebar.attributes("style") || "").toContain("font-size: 14px");
        });
    });

    describe("tone variants", () => {
        scopedIt("primary tone is default", () => {
            const wrapper = mount(UserAvatar, { props: { name: "JR" } });
            expect(wrapper.attributes("data-tone")).toBe("primary");
            expect(wrapper.classes()).toContain("border-primary");
            expect(wrapper.classes()).toContain("text-primary");
        });

        scopedIt("sidebar tone applies sidebar-accent surface", () => {
            const wrapper = mount(UserAvatar, { props: { name: "JR", tone: "sidebar" } });
            expect(wrapper.attributes("data-tone")).toBe("sidebar");
            expect(wrapper.classes()).toContain("bg-sidebar-accent");
            expect(wrapper.classes()).toContain("text-sidebar-foreground");
        });
    });

    describe("root contract", () => {
        scopedIt("always has data-slot=user-avatar", () => {
            const wrapper = mount(UserAvatar);
            expect(wrapper.attributes("data-slot")).toBe("user-avatar");
        });

        scopedIt("merges custom class while preserving theme classes", () => {
            const wrapper = mount(UserAvatar, { props: { name: "JR", class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("rounded-full");
        });
    });
});
