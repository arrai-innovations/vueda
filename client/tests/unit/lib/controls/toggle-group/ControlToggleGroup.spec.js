import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ControlToggleGroup from "@vueda/controls/toggle-group/ControlToggleGroup.vue";
import ControlToggleGroupItem from "@vueda/controls/toggle-group/ControlToggleGroupItem.vue";

const buildGroupTree = (groupProps = {}) =>
    mount({
        components: { ControlToggleGroup, ControlToggleGroupItem },
        setup() {
            return { groupProps };
        },
        template: `
            <ControlToggleGroup v-bind="groupProps" type="single">
                <ControlToggleGroupItem value="a">A</ControlToggleGroupItem>
                <ControlToggleGroupItem value="b">B</ControlToggleGroupItem>
            </ControlToggleGroup>
        `,
    });

describe("lib/controls/toggle-group/ControlToggleGroup.vue", () => {
    describe("ControlToggleGroup", () => {
        scopedIt("has data-slot=toggle-group", () => {
            const wrapper = buildGroupTree();
            expect(wrapper.find('[data-slot="toggle-group"]').exists()).toBe(true);
        });

        scopedIt("reflects variant in data-variant attribute", () => {
            const wrapper = buildGroupTree({ variant: "outline" });
            expect(wrapper.find('[data-slot="toggle-group"]').attributes("data-variant")).toBe("outline");
        });

        scopedIt("reflects size in data-size attribute", () => {
            const wrapper = buildGroupTree({ size: "sm" });
            expect(wrapper.find('[data-slot="toggle-group"]').attributes("data-size")).toBe("sm");
        });

        scopedIt("reflects spacing in data-spacing attribute", () => {
            const wrapper = buildGroupTree({ spacing: 4 });
            expect(wrapper.find('[data-slot="toggle-group"]').attributes("data-spacing")).toBe("4");
        });

        scopedIt("applies base flex and items-center classes", () => {
            const wrapper = buildGroupTree();
            const group = wrapper.find('[data-slot="toggle-group"]');
            expect(group.classes()).toContain("flex");
            expect(group.classes()).toContain("items-center");
        });

        scopedIt("merges custom class", () => {
            const wrapper = buildGroupTree({ class: "my-group" });
            expect(wrapper.find('[data-slot="toggle-group"]').classes()).toContain("my-group");
        });
    });

    describe("ControlToggleGroupItem", () => {
        scopedIt("has data-slot=toggle-group-item on each item", () => {
            const wrapper = buildGroupTree();
            expect(wrapper.findAll('[data-slot="toggle-group-item"]')).toHaveLength(2);
        });

        scopedIt("inherits variant from group context via data-variant", () => {
            const wrapper = buildGroupTree({ variant: "outline" });
            const item = wrapper.find('[data-slot="toggle-group-item"]');
            expect(item.attributes("data-variant")).toBe("outline");
        });

        scopedIt("inherits size from group context via data-size", () => {
            const wrapper = buildGroupTree({ size: "sm" });
            const item = wrapper.find('[data-slot="toggle-group-item"]');
            expect(item.attributes("data-size")).toBe("sm");
        });

        scopedIt("applies variant classes from group context", () => {
            const wrapper = buildGroupTree({ variant: "outline" });
            const item = wrapper.find('[data-slot="toggle-group-item"]');
            expect(item.classes()).toContain("border");
        });

        scopedIt("uses own variant prop when group has no variant", () => {
            const wrapper = mount({
                components: { ControlToggleGroup, ControlToggleGroupItem },
                template: `
                    <ControlToggleGroup type="single">
                        <ControlToggleGroupItem value="x" variant="outline">X</ControlToggleGroupItem>
                    </ControlToggleGroup>
                `,
            });
            const item = wrapper.find('[data-slot="toggle-group-item"]');
            expect(item.attributes("data-variant")).toBe("outline");
            expect(item.classes()).toContain("border");
        });

        scopedIt("renders slot content", () => {
            const wrapper = buildGroupTree();
            const items = wrapper.findAll('[data-slot="toggle-group-item"]');
            expect(items[0].text()).toBe("A");
            expect(items[1].text()).toBe("B");
        });
    });

    describe("toggle interaction", () => {
        scopedIt("item starts with data-state=off", () => {
            const wrapper = buildGroupTree();
            const item = wrapper.find('[data-slot="toggle-group-item"]');
            expect(item.attributes("data-state")).toBe("off");
        });

        scopedIt("changing modelValue marks the matching item as on", async () => {
            const wrapper = mount({
                components: { ControlToggleGroup, ControlToggleGroupItem },
                data() {
                    return { selected: null };
                },
                template: `
                    <ControlToggleGroup v-model="selected" type="single">
                        <ControlToggleGroupItem value="a">A</ControlToggleGroupItem>
                        <ControlToggleGroupItem value="b">B</ControlToggleGroupItem>
                    </ControlToggleGroup>
                `,
            });
            await wrapper.setData({ selected: "a" });
            const items = wrapper.findAll('[data-slot="toggle-group-item"]');
            expect(items[0].attributes("data-state")).toBe("on");
            expect(items[1].attributes("data-state")).toBe("off");
        });
    });
});
