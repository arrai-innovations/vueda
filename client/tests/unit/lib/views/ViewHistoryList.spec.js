import { mockProvideInject, scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
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
const ObjectsGridStub = defineComponent({
    name: "ObjectsGridStub",
    props: ["fields", "rowAttrs", "tableBreakpoint"],
    setup(props, { attrs, slots }) {
        objectsGridProps = props;
        return () =>
            h(
                "div",
                { "data-qa": "objects-grid", ...attrs },
                Object.keys(slots).map((n) => h("div", { "data-slot": n }, slots[n] ? slots[n]({ obj: {} }) : null)),
            );
    },
});
vi.mock("@vueda/components/ObjectsGrid.vue", () => ({ default: ObjectsGridStub }));

const PageActionsStub = defineComponent({
    name: "PageActionsStub",
    setup(_, { slots, attrs }) {
        return () => h("div", { "data-qa": "page-actions", ...attrs }, slots.default ? slots.default() : null);
    },
});
vi.mock("@vueda/components/PageActions.vue", () => ({ default: PageActionsStub }));

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

const WidgetReadOnlyStub = defineComponent({
    name: "WidgetReadOnlyStub",
    setup(_, { attrs }) {
        return () => h("div", { "data-qa": "widget-read-only", ...attrs });
    },
});
vi.mock("@vueda/widgets/WidgetReadOnly.vue", () => ({ default: WidgetReadOnlyStub }));

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

let ViewHistoryList, vue, modelConfig, mockInstanceList;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    objectsGridProps = undefined;
    modelConfig = vue.reactive({
        loading: vue.ref(false),
        info: {
            verbose_name: "Thing",
            pk: "id",
            expand: [{ name: "history", f: { history_date: { label: "Date" } } }],
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

    describe("Layout", () => {
        scopedIt("toggles field column based on table mode", async () => {
            mockedInject.mockReturnValueOnce({});
            mockInstanceList.state.objectsInOrder = [
                { history_id: 1, history_date: "2026-04-26T12:00:00Z", num_changes: 0 },
            ];
            const wrapper = mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
            await vue.nextTick();
            expect(objectsGridProps.fields.some((f) => f && f.name === "field")).toBe(true);
            wrapper.vm.handleIsTableUpdate(false);
            await vue.nextTick();
            expect(objectsGridProps.fields.some((f) => f && f.name === "field")).toBe(false);
            wrapper.unmount();
        });

        scopedIt("layout toggle forces tableBreakpoint to xs (table) or inf (cards)", async () => {
            mockedInject.mockReturnValueOnce({});
            mockInstanceList.state.objectsInOrder = [
                { history_id: 1, history_date: "2026-04-26T12:00:00Z", num_changes: 0 },
            ];
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

    describe("Revision presentation", () => {
        scopedIt("emits data-rev-start on the first row of a revision and data-rev-child on siblings", async () => {
            mockedInject.mockReturnValueOnce({});
            mockInstanceList.state.objectsInOrder = [
                { history_id: 1, history_date: "2026-04-26T12:00:00Z", num_changes: 0 },
            ];
            mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
            await vue.nextTick();
            expect(typeof objectsGridProps.rowAttrs).toBe("function");
            const startAttrs = objectsGridProps.rowAttrs({ parent_row: 0, history_id: 1, field: "name" });
            const childAttrs = objectsGridProps.rowAttrs({ parent_row: 0, field: "amount" });
            const noneAttrs = objectsGridProps.rowAttrs({ field: "name" });
            expect(startAttrs["data-rev-start"]).toBe("true");
            expect(startAttrs["data-rev-child"]).toBeUndefined();
            expect(childAttrs["data-rev-child"]).toBe("true");
            expect(childAttrs["data-rev-start"]).toBeUndefined();
            expect(noneAttrs).toBeNull();
        });

        scopedIt("renders a kind-tagged pill for known history_type values via the field slot", async () => {
            mockedInject.mockReturnValueOnce({});
            mockInstanceList.state.objectsInOrder = [
                { history_id: 1, history_date: "2026-04-26T12:00:00Z", history_type: "+", num_changes: 0 },
            ];
            modelConfig.info.expand[0].f.history_type = { label: "Type" };
            const wrapper = mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
            await vue.nextTick();
            // Map each raw code to its expected kind.
            expect(wrapper.vm.historyTypeMeta("+")).toMatchObject({ kind: "created", label: "created" });
            expect(wrapper.vm.historyTypeMeta("~")).toMatchObject({ kind: "updated", label: "updated" });
            expect(wrapper.vm.historyTypeMeta("-")).toMatchObject({ kind: "deleted", label: "deleted" });
            expect(wrapper.vm.historyTypeMeta("restored")).toMatchObject({ kind: "restored", label: "restored" });
            expect(wrapper.vm.historyTypeMeta("unknown-code")).toBeNull();
            wrapper.unmount();
        });
    });

    describe("Meta strip", () => {
        scopedIt("meta strip renders by default and is suppressed by hideMetaStrip", async () => {
            mockedInject.mockReturnValueOnce({});
            mockInstanceList.state.objectsInOrder = [
                { history_id: 1, history_date: "2026-04-26T12:00:00Z", num_changes: 0 },
            ];
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

        scopedIt("uses a custom page-size query key", async () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewHistoryList, {
                props: {
                    app: "a",
                    model: "b",
                    pk: "1",
                    pageSizeKey: "page_size",
                    pageSizeOptions: [25, 50, "all"],
                    defaultPageSize: 50,
                },
            });
            const pagination = wrapper.findComponent(PaginationFooterStub);
            const listProps = mockedUseList.mock.calls.at(-1)[0].props;

            expect(listProps.params.page_size).toBe(50);
            expect(listProps.params).not.toHaveProperty("ps");

            pagination.vm.$emit("update:perPage", 25);
            await vue.nextTick();
            expect(listProps.params.page_size).toBe(25);
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
