import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ResizableHandle from "@vueda/shell/resizable/ResizableHandle.vue";
import ResizablePanel from "@vueda/shell/resizable/ResizablePanel.vue";
import ResizablePanelGroup from "@vueda/shell/resizable/ResizablePanelGroup.vue";

// SplitterPanel and SplitterResizeHandle require injection from a parent SplitterGroup.
// Stub the underlying Reka splitter primitives so each wrapper can be tested in isolation.
// Vue imports must live inside the factory because vi.mock is hoisted before top-level imports initialize.
vi.mock("reka-ui", async (importOriginal) => {
    const actual = await importOriginal();
    const { defineComponent, h } = await import("vue");
    const makePassthrough = (name, tag = "div") =>
        defineComponent({
            name,
            props: { class: String },
            setup(props, { slots, attrs }) {
                return () => h(tag, { class: props.class, ...attrs }, slots.default ? slots.default({}) : undefined);
            },
        });
    return {
        ...actual,
        SplitterGroup: makePassthrough("SplitterGroup"),
        SplitterPanel: makePassthrough("SplitterPanel"),
        SplitterResizeHandle: makePassthrough("SplitterResizeHandle"),
    };
});

describe("lib/shell/resizable/ShellResizable", () => {
    describe("ResizablePanelGroup", () => {
        scopedIt("always has data-slot=resizable-panel-group", () => {
            const wrapper = mount(ResizablePanelGroup, {
                props: { direction: "horizontal" },
            });
            expect(wrapper.attributes("data-slot")).toBe("resizable-panel-group");
        });

        scopedIt("applies base classes", () => {
            const wrapper = mount(ResizablePanelGroup, {
                props: { direction: "horizontal" },
            });
            expect(wrapper.classes()).toContain("flex");
            expect(wrapper.classes()).toContain("h-full");
            expect(wrapper.classes()).toContain("w-full");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(ResizablePanelGroup, {
                props: { direction: "horizontal", class: "my-custom-class" },
            });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("flex");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ResizablePanelGroup, {
                props: { direction: "horizontal" },
                slots: { default: "<span>panel content</span>" },
            });
            expect(wrapper.text()).toBe("panel content");
        });
    });

    describe("ResizablePanel", () => {
        scopedIt("always has data-slot=resizable-panel", () => {
            const wrapper = mount(ResizablePanel);
            expect(wrapper.attributes("data-slot")).toBe("resizable-panel");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ResizablePanel, {
                slots: { default: "<span>panel slot</span>" },
            });
            expect(wrapper.text()).toBe("panel slot");
        });
    });

    describe("ResizableHandle", () => {
        scopedIt("always has data-slot=resizable-handle", () => {
            const wrapper = mount(ResizableHandle);
            expect(wrapper.attributes("data-slot")).toBe("resizable-handle");
        });

        scopedIt("applies base classes", () => {
            const wrapper = mount(ResizableHandle);
            expect(wrapper.classes()).toContain("bg-border");
            expect(wrapper.classes()).toContain("relative");
            expect(wrapper.classes()).toContain("flex");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(ResizableHandle, {
                props: { class: "my-custom-class" },
            });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("bg-border");
        });

        scopedIt("does not render the grip handle wrapper when withHandle is not set", () => {
            const wrapper = mount(ResizableHandle);
            // No inner div for the grip icon when withHandle is falsy
            expect(wrapper.find(".z-10").exists()).toBe(false);
        });

        scopedIt("renders the grip handle wrapper when withHandle is true", () => {
            const wrapper = mount(ResizableHandle, { props: { withHandle: true } });
            expect(wrapper.find(".z-10").exists()).toBe(true);
        });
    });
});
