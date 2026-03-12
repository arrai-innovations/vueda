import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ShellTabs from "@vueda/shell/tabs/ShellTabs.vue";
import ShellTabsContent from "@vueda/shell/tabs/ShellTabsContent.vue";
import ShellTabsList from "@vueda/shell/tabs/ShellTabsList.vue";
import ShellTabsTrigger from "@vueda/shell/tabs/ShellTabsTrigger.vue";

const buildTabsTree = () =>
    mount({
        components: { ShellTabs, ShellTabsList, ShellTabsTrigger, ShellTabsContent },
        template: `
            <ShellTabs default-value="tab1">
                <ShellTabsList>
                    <ShellTabsTrigger value="tab1">Tab 1</ShellTabsTrigger>
                    <ShellTabsTrigger value="tab2">Tab 2</ShellTabsTrigger>
                </ShellTabsList>
                <ShellTabsContent value="tab1">Content 1</ShellTabsContent>
                <ShellTabsContent value="tab2">Content 2</ShellTabsContent>
            </ShellTabs>
        `,
    });

describe("lib/shell/tabs/ShellTabs.vue", () => {
    describe("data-slot attributes", () => {
        scopedIt("ShellTabs has data-slot=tabs", () => {
            const wrapper = buildTabsTree();
            expect(wrapper.find('[data-slot="tabs"]').exists()).toBe(true);
        });

        scopedIt("ShellTabsList has data-slot=tabs-list", () => {
            const wrapper = buildTabsTree();
            expect(wrapper.find('[data-slot="tabs-list"]').exists()).toBe(true);
        });

        scopedIt("ShellTabsTrigger has data-slot=tabs-trigger on each trigger", () => {
            const wrapper = buildTabsTree();
            expect(wrapper.findAll('[data-slot="tabs-trigger"]')).toHaveLength(2);
        });

        scopedIt("ShellTabsContent has data-slot=tabs-content on each panel", () => {
            const wrapper = buildTabsTree();
            expect(wrapper.findAll('[data-slot="tabs-content"]')).toHaveLength(2);
        });
    });

    describe("ShellTabs", () => {
        scopedIt("applies base flex layout classes", () => {
            const wrapper = buildTabsTree();
            const tabs = wrapper.find('[data-slot="tabs"]');
            expect(tabs.classes()).toContain("flex");
            expect(tabs.classes()).toContain("flex-col");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ShellTabs, {
                props: { class: "my-tabs" },
                slots: { default: "" },
            });
            expect(wrapper.classes()).toContain("my-tabs");
            expect(wrapper.classes()).toContain("flex");
        });
    });

    describe("ShellTabsList", () => {
        scopedIt("applies base inline-flex and height classes", () => {
            const wrapper = buildTabsTree();
            const list = wrapper.find('[data-slot="tabs-list"]');
            expect(list.classes()).toContain("inline-flex");
            expect(list.classes()).toContain("h-9");
        });
    });

    describe("ShellTabsTrigger", () => {
        scopedIt("applies base inline-flex class", () => {
            const wrapper = buildTabsTree();
            const trigger = wrapper.find('[data-slot="tabs-trigger"]');
            expect(trigger.classes()).toContain("inline-flex");
        });
    });

    describe("ShellTabsContent", () => {
        scopedIt("applies base flex-1 class", () => {
            const wrapper = buildTabsTree();
            const content = wrapper.find('[data-slot="tabs-content"]');
            expect(content.classes()).toContain("flex-1");
        });
    });

    describe("tab switching", () => {
        scopedIt("first tab content is active by default", () => {
            const wrapper = buildTabsTree();
            const contents = wrapper.findAll('[data-slot="tabs-content"]');
            expect(contents[0].attributes("data-state")).toBe("active");
            expect(contents[1].attributes("data-state")).toBe("inactive");
        });

        scopedIt("changing modelValue activates the corresponding tab", async () => {
            const wrapper = mount({
                components: { ShellTabs, ShellTabsList, ShellTabsTrigger, ShellTabsContent },
                data() {
                    return { activeTab: "tab1" };
                },
                template: `
                    <ShellTabs v-model="activeTab">
                        <ShellTabsList>
                            <ShellTabsTrigger value="tab1">Tab 1</ShellTabsTrigger>
                            <ShellTabsTrigger value="tab2">Tab 2</ShellTabsTrigger>
                        </ShellTabsList>
                        <ShellTabsContent value="tab1">Content 1</ShellTabsContent>
                        <ShellTabsContent value="tab2">Content 2</ShellTabsContent>
                    </ShellTabs>
                `,
            });
            expect(wrapper.findAll('[data-slot="tabs-content"]')[0].attributes("data-state")).toBe("active");
            await wrapper.setData({ activeTab: "tab2" });
            expect(wrapper.findAll('[data-slot="tabs-content"]')[1].attributes("data-state")).toBe("active");
            expect(wrapper.findAll('[data-slot="tabs-content"]')[0].attributes("data-state")).toBe("inactive");
        });
    });
});
