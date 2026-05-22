import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import DiagnosticStrip from "@vueda/components/DiagnosticStrip.vue";

describe("lib/components/DiagnosticStrip.vue", () => {
    describe("root element", () => {
        scopedIt("renders as a dl with data-slot='diagnostic-strip'", () => {
            const wrapper = mount(DiagnosticStrip);
            expect(wrapper.element.tagName).toBe("DL");
            expect(wrapper.attributes("data-slot")).toBe("diagnostic-strip");
        });

        scopedIt("merges a custom class onto the root", () => {
            const wrapper = mount(DiagnosticStrip, { props: { class: "custom-class" } });
            expect(wrapper.classes()).toContain("custom-class");
        });

        scopedIt("renders no rows when rows is empty", () => {
            const wrapper = mount(DiagnosticStrip, { props: { rows: [] } });
            expect(wrapper.findAll('[data-qa="diagnostic-strip-dt"]')).toHaveLength(0);
            expect(wrapper.findAll('[data-qa="diagnostic-strip-dd"]')).toHaveLength(0);
        });
    });

    describe("row rendering", () => {
        scopedIt("renders one dt/dd pair per row", () => {
            const wrapper = mount(DiagnosticStrip, {
                props: {
                    rows: [
                        { label: "request id", value: "req-abc-123" },
                        { label: "route", value: "/crm/contact/list" },
                        { label: "session", value: "sess-xyz" },
                    ],
                },
            });
            expect(wrapper.findAll('[data-qa="diagnostic-strip-dt"]')).toHaveLength(3);
            expect(wrapper.findAll('[data-qa="diagnostic-strip-dd"]')).toHaveLength(3);
        });

        scopedIt("renders label text in each dt", () => {
            const wrapper = mount(DiagnosticStrip, {
                props: {
                    rows: [
                        { label: "request id", value: "req-1" },
                        { label: "route", value: "/foo" },
                    ],
                },
            });
            const dts = wrapper.findAll('[data-qa="diagnostic-strip-dt"]');
            expect(dts[0].text()).toBe("request id");
            expect(dts[1].text()).toBe("route");
        });

        scopedIt("renders value text in each dd", () => {
            const wrapper = mount(DiagnosticStrip, {
                props: {
                    rows: [
                        { label: "request id", value: "req-1" },
                        { label: "route", value: "/foo" },
                    ],
                },
            });
            const dds = wrapper.findAll('[data-qa="diagnostic-strip-dd"]');
            expect(dds[0].text()).toBe("req-1");
            expect(dds[1].text()).toBe("/foo");
        });

        scopedIt("renders a single row correctly", () => {
            const wrapper = mount(DiagnosticStrip, {
                props: { rows: [{ label: "route", value: "/bar" }] },
            });
            expect(wrapper.find('[data-qa="diagnostic-strip-dt"]').text()).toBe("route");
            expect(wrapper.find('[data-qa="diagnostic-strip-dd"]').text()).toBe("/bar");
        });
    });

    describe("mono flag", () => {
        scopedIt("applies font-mono to dd when mono is true (default)", () => {
            const wrapper = mount(DiagnosticStrip, {
                props: { rows: [{ label: "route", value: "/foo" }] },
            });
            expect(wrapper.find('[data-qa="diagnostic-strip-dd"]').classes()).toContain("font-mono");
        });

        scopedIt("omits font-mono from dd when mono is false", () => {
            const wrapper = mount(DiagnosticStrip, {
                props: { rows: [{ label: "route", value: "/foo" }], mono: false },
            });
            expect(wrapper.find('[data-qa="diagnostic-strip-dd"]').classes()).not.toContain("font-mono");
        });

        scopedIt("applies font-mono to all dd elements when multiple rows", () => {
            const wrapper = mount(DiagnosticStrip, {
                props: {
                    rows: [
                        { label: "request id", value: "req-1" },
                        { label: "route", value: "/foo" },
                    ],
                },
            });
            wrapper.findAll('[data-qa="diagnostic-strip-dd"]').forEach((dd) => {
                expect(dd.classes()).toContain("font-mono");
            });
        });
    });

    describe("themeOverride", () => {
        scopedIt("applies themeOverride to the root", () => {
            const wrapper = mount(DiagnosticStrip, {
                props: {
                    themeOverride: { DiagnosticStrip: { root: { class: "custom-root" } } },
                },
            });
            expect(wrapper.classes()).toContain("custom-root");
        });

        scopedIt("applies themeOverride to dt", () => {
            const wrapper = mount(DiagnosticStrip, {
                props: {
                    rows: [{ label: "route", value: "/foo" }],
                    themeOverride: { DiagnosticStrip: { dt: { class: "custom-dt" } } },
                },
            });
            expect(wrapper.find('[data-qa="diagnostic-strip-dt"]').classes()).toContain("custom-dt");
        });

        scopedIt("applies themeOverride to dd", () => {
            const wrapper = mount(DiagnosticStrip, {
                props: {
                    rows: [{ label: "route", value: "/foo" }],
                    themeOverride: { DiagnosticStrip: { dd: { class: "custom-dd" } } },
                },
            });
            expect(wrapper.find('[data-qa="diagnostic-strip-dd"]').classes()).toContain("custom-dd");
        });
    });

    describe("reactivity", () => {
        scopedIt("updates rendered rows when rows prop changes", async () => {
            const wrapper = mount(DiagnosticStrip, {
                props: { rows: [{ label: "route", value: "/foo" }] },
            });
            expect(wrapper.findAll('[data-qa="diagnostic-strip-dt"]')).toHaveLength(1);

            await wrapper.setProps({
                rows: [
                    { label: "route", value: "/foo" },
                    { label: "session", value: "sess-1" },
                ],
            });
            expect(wrapper.findAll('[data-qa="diagnostic-strip-dt"]')).toHaveLength(2);
        });

        scopedIt("toggles font-mono when mono prop changes", async () => {
            const wrapper = mount(DiagnosticStrip, {
                props: { rows: [{ label: "route", value: "/foo" }], mono: true },
            });
            expect(wrapper.find('[data-qa="diagnostic-strip-dd"]').classes()).toContain("font-mono");

            await wrapper.setProps({ mono: false });
            expect(wrapper.find('[data-qa="diagnostic-strip-dd"]').classes()).not.toContain("font-mono");
        });
    });
});
