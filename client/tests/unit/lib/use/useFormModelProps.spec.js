import { scopedIt } from "@tests/unit/utils.js";
import { pickViewFormModelProps, useFormModelProps } from "@vueda/use/useFormModelProps.js";
import { effectScope, nextTick, reactive } from "vue";

let scope;
let modelSequence = 0;

function build(state) {
    scope = effectScope();
    return scope.run(() =>
        useFormModelProps({
            app: () => state.app,
            model: () => state.model,
            view: () => state.view,
            configFormProps: () => state.configFormProps,
            formProps: () => state.formProps,
            viewProps: () => state.viewProps,
        }),
    );
}

function makeState(overrides = {}) {
    return reactive({
        app: "shop",
        model: `widget${++modelSequence}`,
        view: "update",
        configFormProps: undefined,
        formProps: undefined,
        viewProps: {},
        ...overrides,
    });
}

afterEach(() => {
    scope?.stop();
    vi.restoreAllMocks();
});

describe("lib/use/useFormModelProps.js", () => {
    describe("useFormModelProps", () => {
        scopedIt("orders model config, then the view's formProps, then the view's own props", () => {
            const props = build(
                makeState({
                    configFormProps: { a: "config", b: "config", c: "config" },
                    formProps: { b: "formProps", c: "formProps" },
                    viewProps: { c: "view" },
                }),
            );
            expect(props.value).toMatchObject({ a: "config", b: "formProps", c: "view" });
        });

        scopedIt("leaves earlier layers in place for a view prop that is undefined", () => {
            const props = build(makeState({ configFormProps: { fields: ["name"] }, viewProps: { fields: undefined } }));
            expect(props.value.fields).toEqual(["name"]);
        });

        scopedIt("replaces a configured map whole instead of merging it", () => {
            const props = build(
                makeState({
                    configFormProps: { fieldProps: { name: { label: "Name" }, sku: { label: "SKU" } } },
                    viewProps: { fieldProps: { name: { label: "Title" } } },
                }),
            );
            expect(props.value.fieldProps).toEqual({ name: { label: "Title" } });
        });

        scopedIt("drops a kebab-case formProps key that a view prop replaces", () => {
            const props = build(
                makeState({ configFormProps: { "field-props": { name: {} } }, viewProps: { fieldProps: { sku: {} } } }),
            );
            expect(props.value).not.toHaveProperty("field-props");
            expect(props.value.fieldProps).toEqual({ sku: {} });
        });

        scopedIt("sets app, model, and view from the view over every layer", () => {
            vi.spyOn(console, "warn").mockImplementation(() => {});
            const state = makeState({
                configFormProps: { app: "a", model: "m", view: "v" },
                formProps: { app: "a2", model: "m2", view: "v2" },
                viewProps: { app: "a3" },
            });
            const props = build(state);
            expect(props.value).toMatchObject({ app: "shop", model: state.model, view: "update" });
        });

        scopedIt("warns once for each ignored selector key in each layer", async () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            const state = makeState({ configFormProps: { view: "other" }, formProps: { model: "other" } });
            const props = build(state);
            expect(props.value.view).toBe("update");
            state.configFormProps = { view: "other", variant: "x" };
            await nextTick();
            expect(warn).toHaveBeenCalledTimes(2);
            expect(warn.mock.calls[0][0]).toContain('The "view" key in model config formProps');
            expect(warn.mock.calls[1][0]).toContain(`The "model" key in the view's formProps for shop.${state.model}`);
        });

        scopedIt("does not warn when no layer sets a selector key", () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            build(makeState({ configFormProps: { variant: "x" } }));
            expect(warn).not.toHaveBeenCalled();
        });

        scopedIt("recomputes when a layer changes", async () => {
            const state = makeState({ configFormProps: { variant: "config" } });
            const props = build(state);
            expect(props.value.variant).toBe("config");
            state.viewProps = { variant: "view" };
            await nextTick();
            expect(props.value.variant).toBe("view");
        });
    });

    describe("pickViewFormModelProps", () => {
        scopedIt("picks the forwarded props and renames formModelVariant to variant", () => {
            const fieldProps = { name: {} };
            const picked = pickViewFormModelProps({ fieldProps, formModelVariant: "compact", pk: "1" });
            expect(picked).toMatchObject({ fieldProps, variant: "compact", fields: undefined });
            expect(picked).not.toHaveProperty("pk");
            expect(picked).not.toHaveProperty("formModelVariant");
        });
    });
});
