import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { ICON_OVERRIDE_PROPS, setIcons, useIcons } from "@vueda/use/useIcons.js";
import { defineComponent, h, markRaw } from "vue";

describe("lib/use/useIcons.js", () => {
    /**
     * A throwaway icon component tagged with a stable `data-qa` so tests can assert which one
     * resolved. `markRaw` models the consumer contract: components placed in the reactive
     * `iconOverride` prop must be raw, since Vue wraps the prop before the registry can mark them.
     */
    const makeIcon = (qa) =>
        markRaw(
            defineComponent({
                name: qa,
                setup(_, { attrs }) {
                    return () => h("i", { "data-qa": qa, ...attrs });
                },
            }),
        );

    /** A consumer that resolves one icon key for `componentName` and renders whatever entry comes back. */
    const makeConsumer = (componentName) =>
        defineComponent({
            name: `Consumer_${componentName}`,
            props: {
                ...ICON_OVERRIDE_PROPS,
                iconName: { type: String, default: "edit" },
            },
            setup(props, { slots }) {
                const icon = useIcons(componentName, props);
                return () => {
                    const entry = icon(props.iconName);
                    return h("div", [
                        entry ? h(entry.component, { ...entry.props }) : h("span", { "data-qa": "no-icon" }),
                        slots.default ? slots.default() : null,
                    ]);
                };
            },
        });

    const DefaultEdit = makeIcon("default-edit");
    const CompEdit = makeIcon("comp-edit");
    const OverrideEdit = makeIcon("override-edit");

    beforeEach(() => {
        setIcons({
            Default: { edit: { component: DefaultEdit } },
            MyComp: { edit: { component: CompEdit } },
        });
    });

    describe("default registry resolution", () => {
        scopedIt("prefers a component-specific entry over the Default bucket", () => {
            const wrapper = mount(makeConsumer("MyComp"));
            expect(wrapper.find('[data-qa="comp-edit"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="default-edit"]').exists()).toBe(false);
        });

        scopedIt("falls back to the Default bucket when the component has no entry", () => {
            const wrapper = mount(makeConsumer("UnregisteredComp"));
            expect(wrapper.find('[data-qa="default-edit"]').exists()).toBe(true);
        });

        scopedIt("resolves null when neither the component nor Default registers the key", () => {
            const wrapper = mount(makeConsumer("MyComp"), { props: { iconName: "missing" } });
            expect(wrapper.find('[data-qa="no-icon"]').exists()).toBe(true);
        });

        scopedIt("passes registered entry props through to the rendered component", () => {
            setIcons({ Default: { edit: { component: DefaultEdit, props: { spin: true } } } });
            const wrapper = mount(makeConsumer("AnyComp"));
            expect(wrapper.get('[data-qa="default-edit"]').attributes("spin")).toBe("true");
        });
    });

    describe("self override via iconOverride prop", () => {
        scopedIt("lets the component's own iconOverride prop replace its own icons", () => {
            const wrapper = mount(makeConsumer("MyComp"), {
                props: { iconOverride: { MyComp: { edit: { component: OverrideEdit } } } },
            });
            // The component must see its OWN prop despite Vue inject not observing a self-provide.
            expect(wrapper.find('[data-qa="override-edit"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="comp-edit"]').exists()).toBe(false);
        });

        scopedIt("ranks a Default-bucket override above the default registry's component entry", () => {
            const wrapper = mount(makeConsumer("MyComp"), {
                props: { iconOverride: { Default: { edit: { component: OverrideEdit } } } },
            });
            // Resolution checks override[comp] → override.Default → defaultRegistry[comp]. So an
            // override.Default outranks MyComp's default-registry entry. The override component also
            // renders, proving the merge keeps the markRaw'd entry intact.
            expect(wrapper.find('[data-qa="override-edit"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="comp-edit"]').exists()).toBe(false);
        });
    });

    describe("descendant inheritance", () => {
        scopedIt("provides the merged override down so descendants inherit it via inject", () => {
            const child = makeConsumer("ChildComp"); // no entry registered for ChildComp
            const parent = makeConsumer("MyComp");
            const wrapper = mount(parent, {
                props: { iconOverride: { Default: { edit: { component: OverrideEdit } } } },
                slots: { default: () => h(child) },
            });
            // Child has no local iconOverride prop and no ChildComp registry entry, so the only way
            // it can resolve the override component is by inheriting the parent's provided override.
            expect(wrapper.findAllComponents(child).length).toBe(1);
            // Both parent (MyComp) and child (ChildComp) resolve the inherited override.Default entry.
            expect(wrapper.findAll('[data-qa="override-edit"]').length).toBe(2);
            expect(wrapper.find('[data-qa="comp-edit"]').exists()).toBe(false);
        });
    });
});
