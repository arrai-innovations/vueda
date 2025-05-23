import { scopedIt } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";

describe("lib/use/useFieldDependencyValuesRegistry.js", () => {
    let useFieldDependencyValuesRegistry, vue;

    beforeEach(async () => {
        useFieldDependencyValuesRegistry = (await vi.importActual("@vueda/use/useFieldDependencyValuesRegistry.js"))
            .useFieldDependencyValuesRegistry;
        vue = await vi.importActual("vue");
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    scopedIt("registers dependency paths and updates reactively", async () => {
        const formValues = vue.reactive({
            field1: "value1",
            parent: { child: "childValue", other: "otherValue" },
        });
        const registry = useFieldDependencyValuesRegistry(formValues);
        const fieldRef = vue.ref("parent.child");
        const depsRef = vue.ref(["field1", "$parent.other"]);
        registry.register(fieldRef, depsRef);
        await flushPromises();

        expect(registry.dependencyValues["parent.child"]).toEqual({
            field1: "value1",
            "$parent.other": "otherValue",
        });

        formValues.field1 = "newValue";
        formValues.parent.other = "newOther";
        await flushPromises();

        expect(registry.dependencyValues["parent.child"]).toEqual({
            field1: "newValue",
            "$parent.other": "newOther",
        });
    });

    scopedIt("updates when field name or dependency paths change", async () => {
        const formValues = vue.reactive({
            field1: "value1",
            parent: { child: "childValue", other: "otherValue", another: "another" },
        });
        const registry = useFieldDependencyValuesRegistry(formValues);
        const fieldRef = vue.ref("parent.child");
        const depsRef = vue.ref(["field1", "$parent.other"]);
        registry.register(fieldRef, depsRef);
        await flushPromises();

        fieldRef.value = "parent.newChild";
        depsRef.value = ["field1", "$parent.another"];
        await flushPromises();

        expect(registry.dependencyValues["parent.child"]).toBeUndefined();
        expect(registry.dependencyValues["parent.newChild"]).toEqual({
            field1: "value1",
            "$parent.another": "another",
        });
    });

    scopedIt("unregister removes dependency tracking", async () => {
        const formValues = vue.reactive({ field1: "value1" });
        const registry = useFieldDependencyValuesRegistry(formValues);
        const fieldRef = vue.ref("field1");
        const depsRef = vue.ref(["field1"]);
        const id = registry.register(fieldRef, depsRef);
        await flushPromises();
        expect(registry.dependencyValues.field1).toEqual({ field1: "value1" });

        registry.unregister(id);
        await flushPromises();

        expect(registry.dependencyValues.field1).toBeUndefined();
        formValues.field1 = "updated";
        await flushPromises();
        expect(registry.dependencyValues.field1).toBeUndefined();
    });
});
