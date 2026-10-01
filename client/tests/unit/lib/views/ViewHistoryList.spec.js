import { mockProvideInject, scopedIt } from "@tests/unit/utils.js";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

var provideStore, mockedProvide, mockedInject;

const mockedUseLookupContext = vi.fn();
vi.mock("@vueda/use/useLookupContext.js", () => ({
    useLookupContext: mockedUseLookupContext,
}));

const mockedUseIsActive = vi.fn();
vi.mock("@vueda/use/useIsActive.js", () => ({
    useIsActive: mockedUseIsActive,
}));

const mockedUseModelConfig = vi.fn();
vi.mock("@vueda/use/useModelConfig.js", () => ({
    useModelConfig: mockedUseModelConfig,
}));

const mockedUseFormModel = vi.fn();
vi.mock("@vueda/use/useFormModel.js", () => ({
    useFormModel: mockedUseFormModel,
}));

const mockedUseList = vi.fn();
vi.mock("@arrai-innovations/reactive-helpers", async () => {
    const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
    return { ...actual, useList: mockedUseList };
});

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const mockedUseTheme = makeUseThemeMock({ slotResolver: () => "theme" });
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
}));

const routerBack = vi.fn();
vi.mock("vue-router", () => ({
    useRouter: () => ({ back: routerBack }),
}));

let objectsGridProps;
let objectsGridSlots;
const ObjectsGridStub = defineComponent({
    name: "ObjectsGridStub",
    props: ["fields", "rowAttrs", "tableBreakpoint", "objectsInOrder", "pkKey"],
    setup(props, { attrs, slots }) {
        objectsGridProps = props;
        objectsGridSlots = slots;
        return () =>
            h(
                "div",
                { "data-qa": "objects-grid", ...attrs },
                Object.keys(slots).map((n) => h("div", { "data-slot": n }, slots[n] ? slots[n]({ obj: {} }) : null)),
            );
    },
});
vi.mock("@vueda/objects-grid/ObjectsGrid.vue", () => ({ default: ObjectsGridStub }));

const PageActionsStub = defineComponent({
    name: "PageActionsStub",
    setup(_, { slots, attrs }) {
        return () => h("div", { "data-qa": "page-actions", ...attrs }, slots.default ? slots.default() : null);
    },
});
vi.mock("@vueda/shell/page-title/PageActions.vue", () => ({ default: PageActionsStub }));

const PaginationFooterStub = defineComponent({
    name: "PaginationFooterStub",
    props: ["currentPage", "perPage", "rows", "totalRecords", "pageSizeOptions", "showTotalRecordNum"],
    emits: ["update:currentPage", "update:perPage"],
    setup(_, { attrs }) {
        return () => h("div", { "data-qa": "pagination-footer", ...attrs });
    },
});
vi.mock("@vueda/navigation/pagination/PaginationFooter.vue", () => ({ default: PaginationFooterStub }));

const ButtonStub = defineComponent({
    name: "ButtonStub",
    emits: ["click"],
    setup(_, { emit, slots, attrs }) {
        return () =>
            h(
                "button",
                { "data-qa": "prime-button", ...attrs, onClick: () => emit("click") },
                slots.default ? slots.default() : null,
            );
    },
});
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));

const UserAvatarStub = defineComponent({
    name: "UserAvatarStub",
    props: ["name", "initials", "size", "tone"],
    setup(props) {
        return () => h("span", { "data-qa": "user-avatar", "data-name": props.name }, props.name || "");
    },
});
vi.mock("@vueda/display/avatar/UserAvatar.vue", () => ({ default: UserAvatarStub }));

vi.mock("vue", async () => {
    const actual = await vi.importActual("vue");
    ({ provideStore, mockedProvide, mockedInject } = mockProvideInject(vi));
    return { __esModule: true, ...actual, inject: mockedInject, provide: mockedProvide };
});

/** One action that updated the requested order and deleted one of its lines, in the server's shape. */
const UPDATE_ACTION = {
    id: "b0c4f1e2-5a7d-4c8b-9e11-2f3a4b5c6d7e",
    action_id: "b0c4f1e2-5a7d-4c8b-9e11-2f3a4b5c6d7e",
    recorded_at: "2026-09-03T18:22:41.512Z",
    kind: "request",
    label: "update",
    actor: { id: 7, display: "Dana Okonkwo", missing: false },
    events: [
        {
            id: "store.Order:412",
            model: "store.Order",
            object_id: "58",
            relation: "self",
            type: "updated",
            recorded_at: "2026-09-03T18:22:41.512Z",
            changes: [
                { field: "status", old: "draft", new: "submitted" },
                {
                    field: "approved_by",
                    old: { id: 6, display: null, missing: true },
                    new: { id: 7, display: "Dana Okonkwo", missing: false },
                },
            ],
        },
        {
            id: "store.OrderLine:9931",
            model: "store.OrderLine",
            object_id: "1204",
            relation: "related",
            type: "deleted",
            recorded_at: "2026-09-03T18:22:41.512Z",
            changes: [],
        },
    ],
};
/** A write recorded outside any action: its own single-event group with null metadata. */
const CREATE_GROUP = {
    id: "store.Order:388",
    action_id: null,
    recorded_at: "2026-08-30T11:04:02.110Z",
    kind: null,
    label: null,
    actor: null,
    events: [
        {
            id: "store.Order:388",
            model: "store.Order",
            object_id: "58",
            relation: "self",
            type: "created",
            recorded_at: "2026-08-30T11:04:02.110Z",
            changes: [],
        },
    ],
};

enableAutoUnmount(afterEach);

let ViewHistoryList, vue, modelConfig, mockInstanceList;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    objectsGridProps = undefined;
    objectsGridSlots = undefined;
    modelConfig = vue.reactive({
        loading: vue.ref(false),
        info: {
            verboseName: "Thing",
            pk: "id",
            expand: [],
            fields: {},
        },
        config: {},
    });
    mockedUseModelConfig.mockReturnValue(modelConfig);
    mockedUseIsActive.mockReturnValue(vue.ref(true));
    mockInstanceList = {
        state: vue.reactive({
            loading: false,
            calculatedObjects: [],
            relatedObjects: [],
            objectsInOrder: [],
            perPage: 10,
            totalRecords: 0,
        }),
        clearError: vi.fn(),
        clearList: vi.fn(),
        list: vi.fn(),
    };
    mockedUseList.mockReturnValue(mockInstanceList);
    mockedUseFormModel.mockReturnValue({ fieldComponents: {}, fieldProps: {}, widgetProps: {} });
    ViewHistoryList = (await import("@vueda/views/ViewHistoryList.vue")).default;
    provideStore.clear();
    routerBack.mockClear();
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("lib/views/ViewHistoryList.vue", () => {
    describe("Lookup context", () => {
        scopedIt("calls useLookupContext if lookup context is missing", () => {
            mockedInject.mockReturnValueOnce(null);
            mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
            expect(mockedUseLookupContext).toHaveBeenCalled();
        });

        scopedIt("does not call useLookupContext when lookup context exists", () => {
            mockedInject.mockReturnValueOnce({});
            mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
            expect(mockedUseLookupContext).not.toHaveBeenCalled();
        });
    });

    describe("Request", () => {
        scopedIt("requests the new object's first history page even when its parameters are unchanged", async () => {
            const { useList } = await vi.importActual("@arrai-innovations/reactive-helpers");
            const { default: flushPromises } = await import("flush-promises");
            const requests = [];
            mockedUseList.mockImplementationOnce((options) =>
                useList({
                    ...options,
                    handlers: {
                        list: async ({ target, params }) => {
                            requests.push({ target: { ...target }, params: { ...params } });
                        },
                    },
                }),
            );
            const wrapper = mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
            await flushPromises();
            expect(requests.at(-1).target.pk).toBe("1");
            const count = requests.length;
            await wrapper.setProps({ pk: "2" });
            await flushPromises();
            expect(requests.length).toBeGreaterThan(count);
            expect(requests.at(-1)).toMatchObject({ target: { pk: "2" }, params: { p: 1, ps: 25 } });
            wrapper.vm.perPage = 50;
            wrapper.vm.currentPage = 3;
            wrapper.vm.setLayoutOverride("cards");
            await flushPromises();
            await wrapper.setProps({ pk: "3" });
            await flushPromises();
            expect(requests.at(-1)).toMatchObject({ target: { pk: "3" }, params: { p: 1, ps: 25 } });
            expect(wrapper.vm.layoutOverride).toBe("auto");
        });

        scopedIt("lists the history_list action keyed by the group id, with no expand parameter", () => {
            mockedInject.mockReturnValueOnce({});
            mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
            const listProps = mockedUseList.mock.calls.at(-1)[0].props;
            expect(listProps.target.action).toBe("history_list");
            expect(listProps.pkKey).toBe("id");
            expect(listProps.params).not.toHaveProperty("f");
        });
    });

    describe("Layout", () => {
        scopedIt("defines its columns itself and drops the field column in card mode", async () => {
            mockedInject.mockReturnValueOnce({});
            mockInstanceList.state.objectsInOrder = [CREATE_GROUP];
            const wrapper = mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
            await vue.nextTick();
            expect(objectsGridProps.fields.map((f) => f.name)).toEqual([
                "recorded_at",
                "actor",
                "kind",
                "label",
                "model",
                "type",
                "field",
                "old",
                "new",
            ]);
            expect(objectsGridProps.fields.every((f) => f.extra && f.label)).toBe(true);
            wrapper.vm.handleIsTableUpdate(false);
            await vue.nextTick();
            expect(objectsGridProps.fields.some((f) => f.name === "field")).toBe(false);
            wrapper.unmount();
        });

        scopedIt("orders and filters columns from the fields prop", async () => {
            mockedInject.mockReturnValueOnce({});
            mockInstanceList.state.objectsInOrder = [CREATE_GROUP];
            mount(ViewHistoryList, {
                props: { app: "a", model: "b", pk: "1", fields: ["type", "relation", "recorded_at", "not_a_column"] },
            });
            await vue.nextTick();
            expect(objectsGridProps.fields.map((f) => f.name)).toEqual(["type", "relation", "recorded_at"]);
        });

        scopedIt("layout toggle forces tableBreakpoint to xs (table) or inf (cards)", async () => {
            mockedInject.mockReturnValueOnce({});
            mockInstanceList.state.objectsInOrder = [CREATE_GROUP];
            const wrapper = mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
            await vue.nextTick();
            // Default: auto -> the prop's tableBreakpoint passes through.
            expect(objectsGridProps.tableBreakpoint).toBe("lg");
            wrapper.vm.setLayoutOverride("cards");
            await vue.nextTick();
            expect(objectsGridProps.tableBreakpoint).toBe("inf");
            wrapper.vm.setLayoutOverride("table");
            await vue.nextTick();
            expect(objectsGridProps.tableBreakpoint).toBe("xs");
            wrapper.vm.setLayoutOverride("auto");
            await vue.nextTick();
            expect(objectsGridProps.tableBreakpoint).toBe("lg");
            wrapper.unmount();
        });
    });

    describe("Empty and loading states", () => {
        scopedIt("renders the dedicated empty state when no history rows are present", async () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
            await vue.nextTick();
            expect(wrapper.find('[data-qa="view-history-empty"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="objects-grid"]').exists()).toBe(false);
            expect(wrapper.text()).toContain("No history yet");
            wrapper.unmount();
        });

        scopedIt("reports a real zero to the pagination footer instead of falling back to one", async () => {
            mockedInject.mockReturnValueOnce({});
            // A record with no history: the server answers with a page of nothing, not with a
            // missing paginateInfo, so the footer has to read the zero rather than substitute 1.
            mockInstanceList.state.paginateInfo = { perPage: 25, totalRecords: 0 };
            const wrapper = mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
            await vue.nextTick();
            const footer = wrapper.findComponent({ name: "PaginationFooterStub" });
            expect(footer.props("totalRecords")).toBe(0);
            expect(footer.props("rows")).toBe(25);
            wrapper.unmount();
        });

        scopedIt("renders the grid (not the empty state) while history is loading", async () => {
            mockedInject.mockReturnValueOnce({});
            mockInstanceList.state.loading = true;
            const wrapper = mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
            await vue.nextTick();
            expect(wrapper.find('[data-qa="view-history-empty"]').exists()).toBe(false);
            expect(wrapper.find('[data-qa="objects-grid"]').exists()).toBe(true);
            wrapper.unmount();
        });
    });

    describe("Action groups", () => {
        scopedIt("flattens a group to one table row per change, with metadata only on the first rows", async () => {
            mockedInject.mockReturnValueOnce({});
            mockInstanceList.state.objectsInOrder = [UPDATE_ACTION, CREATE_GROUP];
            const wrapper = mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
            await vue.nextTick();
            const rows = objectsGridProps.objectsInOrder;
            expect(objectsGridProps.pkKey).toBe("id");
            expect(rows.map((row) => row.id)).toEqual([
                "store.Order:412:0",
                "store.Order:412:1",
                "store.OrderLine:9931:0",
                "store.Order:388:0",
            ]);
            // The action's metadata sits on its first row only.
            expect(rows[0]).toMatchObject({
                group_row: 0,
                group_start: true,
                event_start: true,
                recorded_at: UPDATE_ACTION.recorded_at,
                kind: "request",
                label: "update",
                actor: UPDATE_ACTION.actor,
                model: "store.Order",
                relation: "self",
                type: "updated",
                field: "status",
                old: "draft",
                new: "submitted",
            });
            expect(rows[1]).toMatchObject({
                group_row: 0,
                group_start: false,
                event_start: false,
                field: "approved_by",
            });
            expect(rows[1]).not.toHaveProperty("recorded_at");
            expect(rows[1]).not.toHaveProperty("model");
            // The second event of the same action carries its own event metadata but not the action's.
            expect(rows[2]).toMatchObject({
                group_row: 0,
                group_start: false,
                event_start: true,
                model: "store.OrderLine",
                object_id: "1204",
                relation: "related",
                type: "deleted",
                no_changes: true,
                field: "(deleted)",
            });
            expect(rows[2]).not.toHaveProperty("actor");
            // A context-less group is its own single row with the create placeholder.
            expect(rows[3]).toMatchObject({
                group_row: 1,
                group_start: true,
                kind: null,
                actor: null,
                type: "created",
                no_changes: true,
                field: "(created)",
            });
            wrapper.unmount();
        });

        scopedIt("names an update that changed no tracked value", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
            expect(wrapper.vm.noChangeField("updated")).toBe("(no field changes)");
            expect(wrapper.vm.noChangeField("created")).toBe("(created)");
            expect(wrapper.vm.noChangeField("deleted")).toBe("(deleted)");
        });

        scopedIt("gives the card layout one row per event with its changes attached", async () => {
            mockedInject.mockReturnValueOnce({});
            mockInstanceList.state.objectsInOrder = [UPDATE_ACTION];
            const wrapper = mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
            wrapper.vm.handleIsTableUpdate(false);
            await vue.nextTick();
            const rows = objectsGridProps.objectsInOrder;
            expect(rows.map((row) => row.id)).toEqual(["store.Order:412", "store.OrderLine:9931"]);
            expect(rows[0]).toMatchObject({ group_start: true, actor: UPDATE_ACTION.actor, no_changes: false });
            expect(rows[0].changes).toHaveLength(2);
            expect(rows[1]).toMatchObject({
                group_start: false,
                model: "store.OrderLine",
                changes: [],
                no_changes: true,
            });
            expect(rows[1]).not.toHaveProperty("actor");
            wrapper.unmount();
        });

        scopedIt("names a card event that reports no difference in both value cells", async () => {
            mockedInject.mockReturnValueOnce({});
            mockInstanceList.state.objectsInOrder = [UPDATE_ACTION];
            const wrapper = mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
            wrapper.vm.handleIsTableUpdate(false);
            await vue.nextTick();
            // The card layout drops the table's Field column, so an event with nothing to stack would
            // otherwise render two silent blank cells. Both sides say what happened instead.
            const [, deletedRow] = objectsGridProps.objectsInOrder;
            for (const side of ["old", "new"]) {
                const cell = mount(
                    defineComponent({ setup: () => () => objectsGridSlots[`field(${side})`]({ obj: deletedRow }) }),
                );
                expect(cell.text()).toBe("(deleted)");
                expect(cell.find("[data-empty='true']").exists()).toBe(true);
                cell.unmount();
            }
            wrapper.unmount();
        });

        scopedIt("emits data-rev-start on the first row of an action and data-rev-child on the rest", async () => {
            mockedInject.mockReturnValueOnce({});
            mockInstanceList.state.objectsInOrder = [UPDATE_ACTION];
            mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
            await vue.nextTick();
            expect(typeof objectsGridProps.rowAttrs).toBe("function");
            const startAttrs = objectsGridProps.rowAttrs({ group_row: 0, group_start: true, event_start: true });
            const childAttrs = objectsGridProps.rowAttrs({ group_row: 0, group_start: false, event_start: false });
            const eventAttrs = objectsGridProps.rowAttrs({ group_row: 0, group_start: false, event_start: true });
            const noneAttrs = objectsGridProps.rowAttrs({ field: "name" });
            expect(startAttrs["data-rev-start"]).toBe("true");
            expect(startAttrs["data-rev-child"]).toBeUndefined();
            expect(startAttrs["data-event-start"]).toBe("true");
            expect(childAttrs["data-rev-child"]).toBe("true");
            expect(childAttrs["data-rev-start"]).toBeUndefined();
            expect(childAttrs["data-event-start"]).toBeUndefined();
            expect(eventAttrs["data-rev-child"]).toBe("true");
            expect(eventAttrs["data-event-start"]).toBe("true");
            expect(noneAttrs).toBeNull();
        });
    });

    describe("Cell values", () => {
        scopedIt("maps the published event types to a pill and leaves an unknown type as itself", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
            expect(wrapper.vm.historyTypeMeta("created")).toMatchObject({ kind: "created", label: "created" });
            expect(wrapper.vm.historyTypeMeta("updated")).toMatchObject({ kind: "updated", label: "updated" });
            expect(wrapper.vm.historyTypeMeta("deleted")).toMatchObject({ kind: "deleted", label: "deleted" });
            expect(wrapper.vm.historyTypeMeta("+")).toBeNull();
            expect(wrapper.vm.historyTypeMeta("unknown-code")).toBeNull();
            wrapper.unmount();
        });

        scopedIt("renders each side of a change: scalars, empties, references, and missing references", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
            expect(wrapper.vm.changeSide("draft")).toEqual({ text: "draft", empty: false, missing: false });
            expect(wrapper.vm.changeSide(12)).toEqual({ text: "12", empty: false, missing: false });
            expect(wrapper.vm.changeSide(false)).toEqual({ text: "false", empty: false, missing: false });
            expect(wrapper.vm.changeSide(null)).toEqual({ text: "empty", empty: true, missing: false });
            expect(wrapper.vm.changeSide("")).toEqual({ text: "empty", empty: true, missing: false });
            expect(wrapper.vm.changeSide(undefined)).toEqual({ text: "empty", empty: true, missing: false });
            expect(wrapper.vm.changeSide({ id: 7, display: "Dana Okonkwo", missing: false })).toEqual({
                text: "Dana Okonkwo",
                empty: false,
                missing: false,
            });
            // The server publishes the absence; the wording is the client's.
            expect(wrapper.vm.changeSide({ id: 6, display: null, missing: true })).toEqual({
                text: "deleted row #6",
                empty: false,
                missing: true,
            });
            // A JSON value that is not a reference renders as JSON rather than "[object Object]".
            expect(wrapper.vm.changeSide({ a: 1 })).toEqual({ text: '{"a":1}', empty: false, missing: false });
            expect(wrapper.vm.changeSide(["x", "y"])).toEqual({ text: '["x","y"]', empty: false, missing: false });
            wrapper.unmount();
        });

        scopedIt("names a deleted acting user and shortens a model label", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
            expect(wrapper.vm.referenceText({ id: 7, display: "Dana Okonkwo", missing: false }, "user")).toBe(
                "Dana Okonkwo",
            );
            expect(wrapper.vm.referenceText({ id: 6, display: null, missing: true }, "user")).toBe("deleted user #6");
            expect(wrapper.vm.modelDisplay("store.OrderLine")).toBe("OrderLine");
            expect(wrapper.vm.modelDisplay(null)).toBe("");
            wrapper.unmount();
        });
    });

    describe("Meta strip", () => {
        scopedIt("meta strip renders by default and is suppressed by hideMetaStrip", async () => {
            mockedInject.mockReturnValueOnce({});
            mockInstanceList.state.objectsInOrder = [CREATE_GROUP];
            const wrapper = mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
            await vue.nextTick();
            expect(wrapper.find('[data-qa="view-history-meta"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="view-history-layout-table"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="view-history-layout-cards"]').exists()).toBe(true);
            await wrapper.setProps({ hideMetaStrip: true });
            expect(wrapper.find('[data-qa="view-history-meta"]').exists()).toBe(false);
            wrapper.unmount();
        });

        scopedIt("meta strip is not rendered when the dedicated empty state is showing", async () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
            await vue.nextTick();
            expect(wrapper.find('[data-qa="view-history-empty"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="view-history-meta"]').exists()).toBe(false);
            wrapper.unmount();
        });
    });

    describe("Pagination", () => {
        scopedIt("updates the numeric page size and resets the current page", async () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
            const pagination = wrapper.findComponent(PaginationFooterStub);
            const listProps = mockedUseList.mock.calls.at(-1)[0].props;

            pagination.vm.$emit("update:currentPage", 3);
            await vue.nextTick();
            expect(listProps.params.p).toBe(3);

            pagination.vm.$emit("update:perPage", 50);
            await vue.nextTick();
            expect(listProps.params.p).toBe(1);
            expect(listProps.params.ps).toBe(50);
            expect(pagination.props("perPage")).toBe(50);
            wrapper.unmount();
        });

        scopedIt("removes the page-size parameter and reloads through the all-pages path", async () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
            const pagination = wrapper.findComponent(PaginationFooterStub);
            const listOptions = mockedUseList.mock.calls.at(-1)[0];

            mockInstanceList.clearList.mockClear();
            mockInstanceList.list.mockClear();
            pagination.vm.$emit("update:perPage", "all");
            await vue.nextTick();

            expect(listOptions.props.params).not.toHaveProperty("ps");
            expect(pagination.props("perPage")).toBe("all");
            expect(mockInstanceList.clearList).toHaveBeenCalled();
            expect(mockInstanceList.list).toHaveBeenCalled();
            wrapper.unmount();
        });
    });

    describe("Navigation", () => {
        scopedIt("calls router.back when Back button clicked", async () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
            await wrapper.find('[data-qa="prime-button"]').trigger("click");
            expect(routerBack).toHaveBeenCalled();
            wrapper.unmount();
        });
    });
});
