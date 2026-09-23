import { scopedIt } from "@tests/unit/utils.js";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { FIELDS_PARAM } from "@vueda/utils/constants.js";
import { createPinia } from "pinia";
import { defineComponent, h, markRaw, reactive, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

let modelConfig, instanceList, tableLayout;
vi.mock("@vueuse/core", async (importOriginal) => ({
    ...(await importOriginal()),
    useBreakpoints: () => ({ greaterOrEqual: () => tableLayout }),
}));
vi.mock("@vueda/use/useModelConfig.js", () => ({ useModelConfig: () => modelConfig }));
vi.mock("@vueda/use/useWorkflowTransitions.js", () => ({
    useWorkflowTransitions: () => reactive({ transitions: [], loading: false, errored: false }),
}));
vi.mock("@vueda/use/useFilteredActions.js", () => ({
    useFilteredActions: () => reactive({ actions: [] }),
}));
vi.mock("@vueda/use/useIsActive.js", () => ({ useIsActive: () => ref(true) }));
vi.mock("@vueda/use/useLookupContext.js", () => ({ useLookupContext: () => ({}) }));
vi.mock("@arrai-innovations/reactive-helpers", async (importOriginal) => ({
    ...(await importOriginal()),
    useList: () => instanceList,
}));
vi.mock("@vueda/router/getCrud.js", () => ({
    getCRUDForTo: async ({ app, model, pk, view }) => ({
        name: "detail",
        params: { app, model, pk, action: view },
    }),
}));

const ViewList = (await import("@vueda/views/ViewList.vue")).default;
const Empty = defineComponent({ render: () => null });
const props = { app: "catalog", model: "purchaseorder", extraFieldObjects: [] };
enableAutoUnmount(afterEach);

async function mountList(options = {}) {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { name: "list", path: "/:app/:model/:action", component: Empty },
            { name: "detail", path: "/:app/:model/:pk/:action", component: Empty },
        ],
    });
    await router.push("/catalog/purchaseorder/list");
    const wrapper = mount(ViewList, {
        ...options,
        props: { ...props, ...options.props },
        global: {
            plugins: [createPinia(), router],
            stubs: {
                PageActions: true,
                FilterGroup: true,
                SortControl: true,
                SortGroup: true,
                FormMessage: true,
                PaginationFooter: true,
            },
        },
    });
    await flushPromises();
    return { wrapper, router };
}

beforeEach(() => {
    tableLayout = ref(true);
    localStorage.clear();
    modelConfig = reactive({
        loading: false,
        errored: false,
        error: null,
        clearError: vi.fn(),
        info: { pk: "id" },
        config: {
            detailLinkField: "reference",
            displayFields: ["reference", "note"],
            fetchFields: ["reference", "note"],
            fieldDetails: { reference: { label: "Reference" }, note: { label: "Note" } },
            verboseNamePlural: "purchase orders",
            actionDetails: { update: { detail: true }, retrieve: { detail: true } },
            filterables: [],
            filterableDetails: {},
            sortables: [],
        },
    });
    instanceList = {
        state: reactive({
            loading: false,
            errored: false,
            error: null,
            objectsInOrder: [
                { id: 1, reference: "PO-001", note: "Editable", available_actions: ["retrieve", "update"] },
                { id: 2, reference: "PO-002", note: "Accountant", available_actions: ["retrieve"] },
                { id: 3, reference: "PO-003", note: "Unavailable", available_actions: [] },
                { id: 4, reference: "PO-004", note: "Missing metadata" },
            ],
            relatedObjects: {},
            calculatedObjects: {},
            paginateInfo: { perPage: 10, totalRecords: 4, totalPages: 1 },
            columnTotals: {},
        }),
        clearError: vi.fn(),
        clearList: vi.fn(),
        list: vi.fn(),
    };
});

describe("lib/views/ViewList.vue", () => {
    describe("Configured detail links", () => {
        scopedIt.each([true, false])("links each row to its available view (table layout: %s)", async (isTable) => {
            tableLayout.value = isTable;
            const { wrapper } = await mountList();
            expect(wrapper.findAll("a").map((link) => [link.text(), link.attributes("href")])).toEqual([
                ["PO-001", "/catalog/purchaseorder/1/update"],
                ["PO-002", "/catalog/purchaseorder/2/read"],
            ]);
            expect(wrapper.text()).toContain("PO-003");
            expect(wrapper.text()).toContain("PO-004");
            expect(wrapper.text()).toContain("Accountant");
        });

        scopedIt.each([undefined, null, ""])("keeps links opt-in when detailLinkField is %s", async (value) => {
            modelConfig.config.detailLinkField = value;
            const { wrapper } = await mountList();
            expect(wrapper.findAll("a")).toHaveLength(0);
            expect(wrapper.vm.list.listState.params[FIELDS_PARAM]).toEqual(["id", "reference", "note"]);
        });

        scopedIt("requests action metadata without displaying it or fetching unrelated fields", async () => {
            const { wrapper } = await mountList();
            expect(wrapper.vm.list.listState.params[FIELDS_PARAM]).toEqual([
                "id",
                "reference",
                "note",
                "available_actions",
            ]);
            expect(wrapper.vm.list.computedFieldObjects.map((field) => field.name)).toEqual(["reference", "note"]);
            expect(modelConfig.config.fetchFields).toEqual(["reference", "note"]);
            await wrapper.setProps({ listFields: ["reference", "available_actions"] });
            expect(wrapper.vm.list.listState.params[FIELDS_PARAM]).toEqual(["id", "reference", "available_actions"]);
        });

        scopedIt("updates destinations when row action availability changes", async () => {
            const { wrapper } = await mountList();
            instanceList.state.objectsInOrder[0].available_actions = ["retrieve"];
            instanceList.state.objectsInOrder[1].available_actions = [];
            await flushPromises();
            expect(wrapper.findAll("a").map((link) => link.attributes("href"))).toEqual([
                "/catalog/purchaseorder/1/read",
            ]);
        });

        scopedIt("uses the model's primary key and the field's formatted value", async () => {
            modelConfig.info.pk = "uuid";
            modelConfig.config.fieldDetails.reference.formatted = "display_reference";
            instanceList.state.objectsInOrder = [
                {
                    uuid: "order-uuid",
                    reference: "raw",
                    display_reference: "Purchase order 12",
                    available_actions: ["retrieve"],
                },
            ];
            const { wrapper } = await mountList();
            expect(wrapper.get("a").text()).toBe("Purchase order 12");
            expect(wrapper.get("a").attributes("href")).toBe("/catalog/purchaseorder/order-uuid/read");
            expect(wrapper.vm.list.listState.params[FIELDS_PARAM][0]).toBe("uuid");
        });

        scopedIt("retains type formatting and column props inside the link", async () => {
            const ColumnBoolean = (await import("@vueda/objects-grid/ColumnBoolean.vue")).default;
            modelConfig.config.fieldDetails.reference.typeSerializer = "BooleanField";
            modelConfig.config.fieldDetails.reference.typeModel = "BooleanField";
            modelConfig.config.columnProps = { reference: { trueLabel: "Approved" } };
            instanceList.state.objectsInOrder = [{ id: 1, reference: true, available_actions: ["retrieve"] }];
            const { wrapper } = await mountList();
            // The adapter is lazy loaded in production; wait for it to render here too.
            await vi.waitFor(() => expect(wrapper.findComponent(ColumnBoolean).exists()).toBe(true));
            expect(wrapper.get("a").text()).toBe("Approved");
        });

        scopedIt("retains a relation adapter's own target without wrapping it in a row link", async () => {
            const ColumnModelLink = (await import("@vueda/objects-grid/ColumnModelLink.vue")).default;
            modelConfig.config.fieldDetails.reference = {
                typeSerializer: "PrimaryKeyRelatedField",
                typeModel: "ForeignKey",
                appLabel: "catalog",
                model: "supplier",
            };
            instanceList.state.objectsInOrder = [{ id: 1, reference: 92, available_actions: ["update"] }];
            const { wrapper } = await mountList();
            await vi.waitFor(() => expect(wrapper.findComponent(ColumnModelLink).exists()).toBe(true));
            await flushPromises();
            expect(wrapper.findAll("a")).toHaveLength(1);
            expect(wrapper.get("a").attributes("href")).toBe("/catalog/supplier/92/read");
            expect(wrapper.find("a a").exists()).toBe(false);
        });

        scopedIt("preserves explicit slots and independent controls without nested anchors", async () => {
            const onClick = vi.fn();
            const { wrapper, router } = await mountList({
                slots: {
                    "field(reference)": ({ formatted }) => h("a", { href: "#custom" }, `Custom ${formatted}`),
                    "field(note)": () => h("button", { onClick, "data-qa": "inspect" }, "Inspect"),
                },
            });
            expect(wrapper.findAll("a")).toHaveLength(4);
            expect(wrapper.findAll("a").every((link) => link.attributes("href") === "#custom")).toBe(true);
            expect(wrapper.find("a a, a button").exists()).toBe(false);
            await wrapper.get('[data-qa="inspect"]').trigger("click");
            expect(onClick).toHaveBeenCalledOnce();
            expect(router.currentRoute.value.path).toBe("/catalog/purchaseorder/list");
        });

        scopedIt.each(["config", "prop"])("keeps a custom %s adapter's controls outside a row link", async (source) => {
            const onClick = vi.fn();
            const Control = markRaw(
                defineComponent({
                    inheritAttrs: false,
                    render: () => h("button", { onClick, "data-qa": "inspect" }, "Inspect"),
                }),
            );
            const columnComponents = { reference: Control };
            if (source === "config") {
                modelConfig.config.columnComponents = columnComponents;
            }
            const { wrapper } = await mountList({ props: source === "prop" ? { columnComponents } : {} });
            expect(wrapper.findAll("a")).toHaveLength(0);
            await wrapper.get('[data-qa="inspect"]').trigger("click");
            expect(onClick).toHaveBeenCalledOnce();
        });

        scopedIt("uses native anchors for focus and lets modified clicks retain browser behavior", async () => {
            const { wrapper, router } = await mountList({ attachTo: document.body });
            const link = wrapper.get('a[href="/catalog/purchaseorder/2/read"]');
            link.element.focus();
            expect(document.activeElement).toBe(link.element);
            const push = vi.spyOn(router, "push");
            for (const modifiers of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { button: 1 }]) {
                const event = new MouseEvent("click", { bubbles: true, cancelable: true, ...modifiers });
                // Observe the Vue handler, then cancel jsdom's unsupported native navigation.
                let preventedByLink;
                link.element.addEventListener(
                    "click",
                    (event) => {
                        preventedByLink = event.defaultPrevented;
                        event.preventDefault();
                    },
                    { once: true },
                );
                link.element.dispatchEvent(event);
                expect(preventedByLink).toBe(false);
            }
            expect(push).not.toHaveBeenCalled();
            await link.trigger("click");
            await flushPromises();
            expect(router.currentRoute.value.path).toBe("/catalog/purchaseorder/2/read");
        });
    });
});
