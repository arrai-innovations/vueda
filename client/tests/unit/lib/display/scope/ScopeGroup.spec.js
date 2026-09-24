import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

const ButtonStub = defineComponent({
    name: "ButtonStub",
    inheritAttrs: false,
    emits: ["click"],
    setup(_, { emit, slots, attrs }) {
        return () => h("button", { ...attrs, onClick: () => emit("click") }, slots.default?.());
    },
});

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const mockedUseTheme = makeUseThemeMock({ slotResolver: (k) => k });
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
    mergeTheme: (...themes) => Object.assign({}, ...themes),
}));
vi.mock("@vueda/use/useIcons.js", () => ({ ICON_OVERRIDE_PROPS: {}, useIcons: () => () => null }));

let ScopeGroup;

const urlScope = { name: "id", label: "ID · 2 values", keys: ["id"], source: "url", clearable: true };
const paramsScope = {
    name: "replenishment_batch",
    label: "Batch 42",
    keys: ["replenishment_batch"],
    source: "params",
    clearable: true,
};
const fixedScope = { name: "tenant", label: "North", keys: ["tenant"], source: "params", clearable: false };

beforeEach(async () => {
    ScopeGroup = (await import("@vueda/display/scope/ScopeGroup.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
});

describe("lib/display/scope/ScopeGroup.vue", () => {
    scopedIt("renders nothing when no scope is active", () => {
        const wrapper = mount(ScopeGroup, { props: { scopes: [] } });
        expect(wrapper.find('[data-qa="scope-group-strip"]').exists()).toBe(false);
    });

    scopedIt("renders one chip per scope under a Scope eyebrow", () => {
        const wrapper = mount(ScopeGroup, { props: { scopes: [urlScope, paramsScope] } });
        expect(wrapper.get('[data-qa="scope-group-strip"]').text()).toContain("Scope");
        expect(wrapper.findAll('[data-qa="scope-chip-label"]').map((chip) => chip.text())).toEqual([
            "ID · 2 values",
            "Batch 42",
        ]);
    });

    scopedIt("uses the bare subgroup class when hosted and the strip class otherwise", () => {
        const hosted = mount(ScopeGroup, { props: { scopes: [urlScope], hosted: true } });
        expect(hosted.get('[data-qa="scope-group-strip"]').classes()).toContain("subgroup");
        const standalone = mount(ScopeGroup, { props: { scopes: [urlScope] } });
        expect(standalone.get('[data-qa="scope-group-strip"]').classes()).toContain("strip");
    });

    scopedIt("emits the scope a chip clears", async () => {
        const wrapper = mount(ScopeGroup, { props: { scopes: [urlScope, paramsScope] } });
        await wrapper.findAll('[data-qa="scope-chip-clear"]')[1].trigger("click");
        expect(wrapper.emitted("clear")).toEqual([[[paramsScope]]]);
    });

    scopedIt("renders the scope-label slot inside each chip, keeping its clear control", () => {
        const wrapper = mount(ScopeGroup, {
            props: { scopes: [urlScope, fixedScope] },
            slots: { "scope-label": ({ scope }) => h("em", { "data-qa": "custom-label" }, `custom ${scope.name}`) },
        });
        expect(wrapper.findAll('[data-qa="custom-label"]').map((label) => label.text())).toEqual([
            "custom id",
            "custom tenant",
        ]);
        const chips = wrapper.findAll('[data-qa="scope-chip"]');
        expect(chips.map((chip) => chip.find('[data-qa="scope-chip-clear"]').exists())).toEqual([true, false]);
    });

    scopedIt("replaces each chip with the scope-chip slot and clears through its clear prop", async () => {
        const wrapper = mount(ScopeGroup, {
            props: { scopes: [paramsScope, fixedScope] },
            slots: {
                "scope-chip": ({ scope, clear }) =>
                    h("button", { "data-qa": `custom-chip-${scope.name}`, onClick: clear }, scope.label),
            },
        });
        expect(wrapper.find('[data-qa="scope-chip"]').exists()).toBe(false);

        await wrapper.get('[data-qa="custom-chip-replenishment_batch"]').trigger("click");
        await wrapper.get('[data-qa="custom-chip-tenant"]').trigger("click");
        expect(wrapper.emitted("clear")).toEqual([[[paramsScope]]]);
    });

    scopedIt("renders a non-clearable scope without a clear control", () => {
        const wrapper = mount(ScopeGroup, { props: { scopes: [fixedScope] } });
        expect(wrapper.get('[data-qa="scope-chip-label"]').text()).toBe("North");
        expect(wrapper.find('[data-qa="scope-chip-clear"]').exists()).toBe(false);
    });

    scopedIt("counts and clears only clearable scopes from Clear scopes", async () => {
        const oneClearable = mount(ScopeGroup, { props: { scopes: [urlScope, fixedScope] } });
        expect(oneClearable.find('[data-qa="scope-clear"]').exists()).toBe(false);

        const wrapper = mount(ScopeGroup, { props: { scopes: [urlScope, fixedScope, paramsScope] } });
        await wrapper.get('[data-qa="scope-clear"]').trigger("click");
        expect(wrapper.emitted("clear")).toEqual([[[urlScope, paramsScope]]]);
    });

    scopedIt("shows Clear scopes only with more than one scope and emits every scope from it", async () => {
        const single = mount(ScopeGroup, { props: { scopes: [urlScope] } });
        expect(single.find('[data-qa="scope-clear"]').exists()).toBe(false);

        const wrapper = mount(ScopeGroup, { props: { scopes: [urlScope, paramsScope] } });
        await wrapper.get('[data-qa="scope-clear"]').trigger("click");
        expect(wrapper.emitted("clear")).toEqual([[[urlScope, paramsScope]]]);
    });
});
