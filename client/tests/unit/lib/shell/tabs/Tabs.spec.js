import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Tabs from "@vueda/shell/tabs/Tabs.vue";
import TabsContent from "@vueda/shell/tabs/TabsContent.vue";
import TabsList from "@vueda/shell/tabs/TabsList.vue";
import TabsTrigger from "@vueda/shell/tabs/TabsTrigger.vue";

const buildTabsTree = () =>
    mount({
        components: { Tabs, TabsList, TabsTrigger, TabsContent },
        template: `
            <Tabs default-value="tab1">
                <TabsList>
                    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                </TabsList>
                <TabsContent value="tab1">Content 1</TabsContent>
                <TabsContent value="tab2">Content 2</TabsContent>
            </Tabs>
        `,
    });

describe("lib/shell/tabs/Tabs.vue", () => {
    describe("data-slot attributes", () => {
        scopedIt("Tabs has data-slot=tabs", () => {
            const wrapper = buildTabsTree();
            expect(wrapper.find('[data-slot="tabs"]').exists()).toBe(true);
        });

        scopedIt("TabsList has data-slot=tabs-list", () => {
            const wrapper = buildTabsTree();
            expect(wrapper.find('[data-slot="tabs-list"]').exists()).toBe(true);
        });

        scopedIt("TabsTrigger has data-slot=tabs-trigger on each trigger", () => {
            const wrapper = buildTabsTree();
            expect(wrapper.findAll('[data-slot="tabs-trigger"]')).toHaveLength(2);
        });

        scopedIt("TabsContent has data-slot=tabs-content on each panel", () => {
            const wrapper = buildTabsTree();
            expect(wrapper.findAll('[data-slot="tabs-content"]')).toHaveLength(2);
        });
    });

    describe("Tabs", () => {
        scopedIt("applies base flex layout classes", () => {
            const wrapper = buildTabsTree();
            const tabs = wrapper.find('[data-slot="tabs"]');
            expect(tabs.classes()).toContain("flex");
            expect(tabs.classes()).toContain("flex-col");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(Tabs, {
                props: { class: "my-tabs" },
                slots: { default: "" },
            });
            expect(wrapper.classes()).toContain("my-tabs");
            expect(wrapper.classes()).toContain("flex");
        });
    });

    describe("TabsList", () => {
        scopedIt("applies base inline-flex and height classes", () => {
            const wrapper = buildTabsTree();
            const list = wrapper.find('[data-slot="tabs-list"]');
            expect(list.classes()).toContain("inline-flex");
            expect(list.classes()).toContain("h-9");
        });
    });

    describe("TabsTrigger", () => {
        scopedIt("applies base inline-flex class", () => {
            const wrapper = buildTabsTree();
            const trigger = wrapper.find('[data-slot="tabs-trigger"]');
            expect(trigger.classes()).toContain("inline-flex");
        });
    });

    describe("TabsContent", () => {
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
                components: { Tabs, TabsList, TabsTrigger, TabsContent },
                data() {
                    return { activeTab: "tab1" };
                },
                template: `
                    <Tabs v-model="activeTab">
                        <TabsList>
                            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                        </TabsList>
                        <TabsContent value="tab1">Content 1</TabsContent>
                        <TabsContent value="tab2">Content 2</TabsContent>
                    </Tabs>
                `,
            });
            expect(wrapper.findAll('[data-slot="tabs-content"]')[0].attributes("data-state")).toBe("active");
            await wrapper.setData({ activeTab: "tab2" });
            expect(wrapper.findAll('[data-slot="tabs-content"]')[1].attributes("data-state")).toBe("active");
            expect(wrapper.findAll('[data-slot="tabs-content"]')[0].attributes("data-state")).toBe("inactive");
        });
    });
});
