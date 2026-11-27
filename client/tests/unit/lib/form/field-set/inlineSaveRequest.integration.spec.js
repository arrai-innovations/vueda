import fixture from "../../../../../../server/tests/fixtures/inline-save.json";
import { useObject } from "@arrai-innovations/reactive-helpers";
import { scopedIt } from "@tests/unit/utils.js";
import { flushPromises, mount } from "@vue/test-utils";
import FieldSetSingularStackedInline from "@vueda/form/field-set/FieldSetSingularStackedInline.vue";
import FieldSetStackedInline from "@vueda/form/field-set/FieldSetStackedInline.vue";
import FieldSetTabularInline from "@vueda/form/field-set/FieldSetTabularInline.vue";
import FormModel from "@vueda/form/form-model/FormModel.vue";
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";
import { useFilteredActions } from "@vueda/use/useFilteredActions.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useModelInitialValues } from "@vueda/use/useModelInitialValues.js";
import { useObject404 } from "@vueda/use/useObject404.js";
import { useViewCreate } from "@vueda/use/useViewCreate.js";
import { useViewUpdate } from "@vueda/use/useViewUpdate.js";
import { EXPAND_PARAM, FIELDS_PARAM } from "@vueda/utils/constants.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h, reactive, readonly, ref } from "vue";

// The server's inline save tests (server/tests/unit/core/test_inline_save.py) send each request in the shared
// fixture through a viewset route. This spec proves that the real views and inlines send that request. Only
// the model info fetch, routing, toasts, and error reporting are stubbed. The model config store builds each view's
// config from model info that matches the `tests.inline` serializers. The CRUD handlers record each save.
const fetchModelInfo = vi.hoisted(() => vi.fn());
vi.mock("@vueda/stores/storeModelInfo.js", () => ({ storeModelInfo: () => ({ fetchModelInfo }) }));
vi.mock("@arrai-innovations/reactive-helpers", async () => {
    const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
    return { ...actual, useObject: vi.fn() };
});
vi.mock("@vueda/use/useModelConfig.js", async () => {
    const actual = await vi.importActual("@vueda/use/useModelConfig.js");
    return { ...actual, useModelConfig: vi.fn() };
});
vi.mock("@vueda/use/useModelInitialValues.js", async () => {
    const actual = await vi.importActual("@vueda/use/useModelInitialValues.js");
    return { ...actual, useModelInitialValues: vi.fn() };
});
vi.mock("@vueda/use/useFilteredActions.js", async () => {
    const actual = await vi.importActual("@vueda/use/useFilteredActions.js");
    return { ...actual, useFilteredActions: vi.fn() };
});
vi.mock("@vueda/use/useIsActive.js", async () => {
    const actual = await vi.importActual("@vueda/use/useIsActive.js");
    return { ...actual, useIsActive: vi.fn() };
});
vi.mock("@vueda/use/useObject404.js", async () => {
    const actual = await vi.importActual("@vueda/use/useObject404.js");
    return { ...actual, useObject404: vi.fn() };
});
vi.mock("@vueda/use/useLeaveUnload.js", () => ({ useLeaveUnload: vi.fn() }));
vi.mock("vue-router", async () => ({ ...(await vi.importActual("vue-router")), useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@arrai-innovations/vue-sonner", () => ({
    toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), loading: vi.fn(), message: vi.fn() },
}));
vi.mock("@sentry/vue", () => ({ captureException: vi.fn() }));
const isTable = ref(true);
vi.mock("@vueuse/core", async (importOriginal) => ({
    ...(await importOriginal()),
    useBreakpoints: () => ({ greaterOrEqual: () => isTable }),
}));

const layouts = {
    many: [
        { name: "stacked", component: FieldSetStackedInline },
        { name: "tabular table", component: FieldSetTabularInline },
        { name: "tabular cards", component: FieldSetTabularInline, cards: true },
    ],
    singular: [{ name: "singular stacked", component: FieldSetSingularStackedInline }],
};

// The `tests.inline` parent serializers list each reverse one-to-one relation in `Meta.read_only_fields`, so model
// info reports its plain field read-only. Its expand stays writable.
const READ_ONLY_PLAIN_RELATIONS = new Set(["note"]);

/**
 * The model info that the server reports for the `tests.inline` parent serializer of one relation: `id`, `name`, and
 * the relation, which is also expandable.
 */
const parentModelInfo = (scenario) => ({
    appLabel: "inline",
    model: "inlineparent",
    verboseName: "parent",
    verboseNamePlural: "parents",
    pk: "id",
    fields: {
        id: { label: "ID", many: false, readOnly: true, required: false, typeSerializer: "IntegerField", pk: true },
        name: { label: "Name", many: false, readOnly: false, required: false, typeSerializer: "CharField" },
        [scenario.relation]: {
            label: "Relation",
            many: scenario.inline === "many",
            readOnly: READ_ONLY_PLAIN_RELATIONS.has(scenario.relation),
            required: false,
            typeSerializer: scenario.inline === "many" ? "ManyRelatedField" : "PrimaryKeyRelatedField",
        },
    },
    actions: [
        { name: "create", detail: false, bulk: false, methodNames: ["post"] },
        { name: "retrieve", detail: true, bulk: false, methodNames: ["get"], parameters: ["pk"] },
        { name: "update", detail: true, bulk: false, methodNames: ["put"], parameters: ["pk"] },
    ],
    expand: [
        {
            name: scenario.relation,
            readOnly: false,
            many: scenario.inline === "many",
            appLabel: "inline",
            model: scenario.relation,
            f: {
                id: { label: "ID", many: false, readOnly: true, required: false, typeSerializer: "IntegerField" },
                name: { label: "Name", many: false, readOnly: false, required: false, typeSerializer: "CharField" },
            },
        },
    ],
});

/**
 * Builds the view's model config through the model config store. The overrides name the relation in `expand` and the
 * form's fields in `fields`. The default field lists leave out a field whose plain field is read-only, such as `note`,
 * even when the view expands it. Issue #680 covers that gap.
 */
async function buildParentConfig(scenario) {
    fetchModelInfo.mockResolvedValue(parentModelInfo(scenario));
    const store = storeModelConfig();
    store.setConfig(
        { app: "inline", model: "inlineparent" },
        { expand: [scenario.relation], fields: ["name", scenario.relation] },
    );
    return store.getConfig({ app: "inline", model: "inlineparent", view: scenario.view });
}

/**
 * Mounts the real create or update view composable with the real FormModel and inline. Returns the wrapper, the view
 * result, and the requests that each save sent.
 */
async function mountParentForm(scenario, layout) {
    setActivePinia(createPinia());
    isTable.value = !layout.cards;
    const { useObject: realUseObject } = await vi.importActual("@arrai-innovations/reactive-helpers");
    const config = await buildParentConfig(scenario);
    useModelConfig.mockReturnValue(reactive({ info: { pk: "id" }, config, loading: false }));
    useFilteredActions.mockReturnValue(reactive({ actions: [] }));
    useIsActive.mockReturnValue(ref(true));
    useObject404.mockReturnValue(undefined);

    const requests = [];
    const record = ({ object, params }) => {
        requests.push({ e: [...params[EXPAND_PARAM]], f: [...params[FIELDS_PARAM]], body: cloneDeep(object) });
        return Promise.resolve({ id: fixture.parent_pk, ...cloneDeep(object) });
    };
    const retrieve = () => Promise.resolve({ id: fixture.parent_pk, ...cloneDeep(scenario.saved) });
    let objectCount = 0;
    useObject.mockImplementation((options) => {
        objectCount += 1;
        if (scenario.view === "update" && objectCount === 1) {
            return realUseObject({ ...options, handlers: { retrieve } });
        }
        return realUseObject({ ...options, handlers: { create: record, update: record } });
    });
    useModelInitialValues.mockReturnValue(
        readonly(ref({ name: "", [scenario.relation]: scenario.inline === "many" ? [] : null })),
    );

    const props = reactive({
        app: "inline",
        model: "inlineparent",
        pk: scenario.view === "update" ? String(fixture.parent_pk) : undefined,
        redirectAfter: null,
    });
    let view;
    const wrapper = mount(
        defineComponent({
            setup() {
                view = scenario.view === "update" ? useViewUpdate(props) : useViewCreate(props);
                return () =>
                    h(FormModel, {
                        ...view.instance.combinedFormProps,
                        fieldComponents: { [scenario.relation]: () => layout.component },
                        fieldProps: { [scenario.relation]: { hidable: false, autoCreateWhenEmpty: false } },
                    });
            },
        }),
        { attachTo: document.body },
    );
    await flushPromises();
    return { wrapper, view, requests };
}

const button = (wrapper, label) => {
    const found = wrapper.findAll("button").find((candidate) => candidate.text() === label);
    expect(found, `a "${label}" button`).toBeDefined();
    return found;
};

// Field widgets load as async components, so an input appears a little after its row.
const typeInto = async (wrapper, name, value) => {
    const input = await vi.waitFor(() => wrapper.get(`input[name="${name}"]`));
    await input.setValue(value);
    await flushPromises();
};

const rowPath = (scenario, index) =>
    scenario.inline === "many" ? `${scenario.relation}[${index}]` : scenario.relation;

/** What a user does in the form for each fixture action. */
const actions = {
    "add a row": async (wrapper, scenario) => {
        if (scenario.view === "create") {
            await typeInto(wrapper, "name", "New parent");
        }
        await button(wrapper, "Create").trigger("click");
        await flushPromises();
        const index = scenario.saved ? scenario.saved[scenario.relation].length : 0;
        await typeInto(wrapper, `${rowPath(scenario, index)}.name`, "Added");
    },
    "create the object": async (wrapper, scenario) => {
        await typeInto(wrapper, "name", "New parent");
        await button(wrapper, "Create").trigger("click");
        await flushPromises();
        await typeInto(wrapper, `${rowPath(scenario, 0)}.name`, "Added");
    },
    "edit a saved row": async (wrapper, scenario) => {
        await typeInto(wrapper, `${rowPath(scenario, 0)}.name`, "Edited");
    },
    "edit the saved object": async (wrapper, scenario) => {
        await typeInto(wrapper, `${rowPath(scenario, 0)}.name`, "Edited");
    },
    "delete an unsaved row": async (wrapper, scenario) => {
        await button(wrapper, "Create").trigger("click");
        await flushPromises();
        await button(wrapper, "Delete").trigger("click");
        await flushPromises();
        // Removing the only change leaves nothing to save, so the parent's name changes too.
        await typeInto(wrapper, "name", scenario.view === "create" ? "New parent" : "Renamed");
    },
    "mark a saved row for removal": async (wrapper, scenario) => {
        if (scenario.inline === "singular") {
            const toggle = button(wrapper, "Delete on save");
            await toggle.trigger("click");
            await flushPromises();
            expect(toggle.attributes("aria-pressed")).toBe("true");
            return;
        }
        const checkbox = wrapper.get('[role="checkbox"]');
        await checkbox.trigger("click");
        await flushPromises();
        expect(checkbox.attributes("aria-checked")).toBe("true");
    },
};

const cases = fixture.scenarios.flatMap((scenario) =>
    layouts[scenario.inline].map((layout) => ({ ...scenario, layout, title: `${layout.name}: ${scenario.name}` })),
);

describe("lib/form/field-set/FieldSet*Inline*.vue", () => {
    describe("save request for each inline action (server/tests/fixtures/inline-save.json)", () => {
        beforeEach(() => {
            // A new row scrolls into view; jsdom has no layout to scroll.
            Element.prototype.scrollIntoView = vi.fn();
        });

        afterEach(() => {
            vi.clearAllMocks();
            document.body.innerHTML = "";
        });

        scopedIt("a singular object created after the saved removal loads is sent, not null", async () => {
            const scenario = fixture.scenarios.find(
                (candidate) => candidate.relation === "note" && candidate.action === "mark a saved row for removal",
            );
            const { wrapper, view, requests } = await mountParentForm(scenario, layouts.singular[0]);
            try {
                await actions[scenario.action](wrapper, scenario);
                await view.objectForm.submit();
                await flushPromises();
                expect(requests).toEqual([scenario.request]);

                // Loading the saved result, which has no note, clears the removal mark with it.
                Object.assign(view.formInitialValue, { name: "Parent", note: null });
                await flushPromises();
                expect(view.formContext.state.submittedAsNull).toEqual({});
                await button(wrapper, "Create").trigger("click");
                await flushPromises();
                await typeInto(wrapper, "note.name", "Replacement");
                await view.objectForm.submit();
                await flushPromises();

                expect(requests[1].e).toEqual(["note"]);
                expect(requests[1].body.note).toEqual({ name: "Replacement" });
            } finally {
                wrapper.unmount();
            }
        });

        scopedIt.each(cases)("$title", async (testCase) => {
            const { layout, ...scenario } = testCase;
            const { wrapper, view, requests } = await mountParentForm(scenario, layout);
            try {
                await actions[scenario.action](wrapper, scenario);

                await view.objectForm.submit();
                await flushPromises();

                expect(requests).toEqual([scenario.request]);
            } finally {
                wrapper.unmount();
            }
        });
    });
});
