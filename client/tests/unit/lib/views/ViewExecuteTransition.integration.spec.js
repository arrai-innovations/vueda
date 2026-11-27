import { scopedIt } from "@tests/unit/utils.js";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { FormValidationError } from "@vueda/utils/errors.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h, reactive, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

/**
 * Mounts ViewExecuteTransition over the real ModelActionForm and ActionForm.
 *
 * These tests cover the names that the selected-records panel shows, the banner's states, and how the page skips the
 * records that the dry run refuses. The workflow store is replaced, so each test decides what the transition request
 * returns.
 */

const modelConfig = reactive({
    loading: false,
    info: { pk: "id", verboseName: "purchase order", verboseNamePlural: "purchase orders", actions: [] },
    config: {
        verboseName: "purchase order",
        verboseNamePlural: "purchase orders",
        fetchFields: [],
        expand: [],
        actionRedirects: {},
    },
});
vi.mock("@vueda/use/useModelConfig.js", () => ({ useModelConfig: () => modelConfig }));
vi.mock("@vueda/use/useIsActive.js", () => ({ useIsActive: () => ref(true) }));
vi.mock("@vueda/use/usePageTitle.js", () => ({ usePageTitle: () => {} }));
vi.mock("@vueda/use/useWorkflowTransitions.js", () => ({
    useWorkflowTransitions: () => reactive({ transitions: [{ code: "submit", name: "Submit for approval" }] }),
}));
vi.mock("@vueda/shell/page-title/PageActions.vue", () => ({
    default: defineComponent({
        setup:
            (_, { slots }) =>
            () =>
                h("div", slots.default?.()),
    }),
}));

const executeTransition = vi.fn();
vi.mock("@vueda/stores/storeWorkflow.js", () => ({ storeWorkflow: () => ({ executeTransition }) }));

const RecordLink = defineComponent({
    props: ["app", "model", "pk", "view", "label"],
    setup: (props) => () => h("a", { href: `/${props.app}/${props.model}/${props.view}/${props.pk}` }, props.label),
});
const records = [
    { id: 4, formatted_name: "PO-1044" },
    { id: 5, formatted_name: "PO-1049" },
    { id: 6, formatted_name: "PO-HIST-5-26" },
];
const lookupContext = { requestObject: vi.fn(() => Promise.resolve({})) };
const rowSelector = '[data-qa="action-form-list-item"]';

let ViewExecuteTransition;

enableAutoUnmount(afterEach);

beforeEach(async () => {
    setActivePinia(createPinia());
    ViewExecuteTransition = (await import("@vueda/views/ViewExecuteTransition.vue")).default;
    (await import("@vueda/utils/listCrud.js")).setupDefaultListCrud();
    global.fetch = vi.fn(
        async () => new Response(JSON.stringify({ results: records, totalPages: 1 }), { status: 200 }),
    );
    executeTransition.mockReset();
    executeTransition.mockImplementation(() => Promise.resolve({}));
});

/**
 * Mounts ViewExecuteTransition for the `submit` transition on the given purchase orders.
 *
 * @param {string|string[]} pk - The selected primary key, or keys for a bulk transition.
 * @returns {Promise<import('@vue/test-utils').VueWrapper>}
 */
async function mountTransition(pk) {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: "/", component: { template: "<div />" } },
            { path: "/done", component: { template: "<div />" } },
        ],
    });
    await router.push("/?returnPath=/done");
    const wrapper = mount(ViewExecuteTransition, {
        props: { app: "purchasing", model: "purchaseorder", action: "submit", pk },
        attachTo: document.body,
        global: {
            plugins: [router],
            provide: { [LookupContextSymbol]: lookupContext },
            stubs: { LinkModelView: RecordLink },
        },
    });
    await flushPromises();
    return wrapper;
}

describe("lib/views/ViewExecuteTransition.vue", () => {
    describe("Selected record names", () => {
        scopedIt("names a single selected record", async () => {
            const wrapper = await mountTransition("4");

            const rows = wrapper.findAll(rowSelector);
            expect(rows.map((row) => row.get("a").text())).toEqual(["PO-1044"]);
            expect(wrapper.find('[data-qa="action-form-list-item-pk"]').exists()).toBe(false);
        });

        scopedIt("names every record of a bulk selection", async () => {
            const wrapper = await mountTransition(["4", "5"]);

            const rows = wrapper.findAll(rowSelector);
            expect(rows.map((row) => row.get("a").text())).toEqual(["PO-1044", "PO-1049"]);
            expect(wrapper.find('[data-qa="action-form-list-item-pk"]').exists()).toBe(false);
        });
    });

    describe("Records that the dry run refuses", () => {
        const refusedBody = {
            target_state: { code: "submitted", name: "Submitted" },
            objects: {
                4: { state: { code: "draft", name: "Draft" } },
                5: {
                    state: { code: "submitted", name: "Submitted" },
                    errors: ["Already in the Submitted state."],
                    already_in_target_state: true,
                },
                6: {
                    state: { code: "received", name: "Received" },
                    errors: ["Submit for approval is not available from the Received state."],
                },
            },
        };

        /**
         * Builds the error that the workflow store rejects a refused bulk run with.
         *
         * @returns {FormValidationError}
         */
        const refusal = () => {
            const error = new FormValidationError(
                { 6: ["Submit for approval is not available from the Received state."] },
                new Response(null, { status: 400 }),
            );
            error.responseData = refusedBody;
            return error;
        };

        beforeEach(() => {
            executeTransition.mockImplementation((app, model, pk, code, router, url, dryRun) =>
                dryRun ? Promise.reject(refusal()) : Promise.resolve({ target_state: {}, objects: {} }),
            );
        });

        scopedIt("counts and labels only the record that can move", async () => {
            const wrapper = await mountTransition(["4", "5", "6"]);

            expect(wrapper.get('[data-qa="action-form-selected-count"]').text()).toBe("1 of 3 selected");
            const confirm = wrapper.get('[data-qa="action-form-buttons"] button[type="submit"]');
            expect(confirm.text()).toBe("Submit for approval (1 of 3)");
            expect(confirm.attributes("disabled")).toBeUndefined();
            expect(wrapper.get('[data-qa="action-form-skipped-message"]').text()).toBe(
                "2 of the selected purchase orders will be skipped. Go back to change your selection, or click " +
                    '"Submit for approval (1 of 3)" to continue without them.',
            );
        });

        scopedIt("names the target state and the source state of the records that move", async () => {
            const wrapper = await mountTransition(["4", "5", "6"]);

            expect(wrapper.get('[data-qa="model-action-form-banner-desc"]').text()).toBe(
                "Moves 1 of the selected purchase orders from Draft to Submitted.",
            );
        });

        scopedIt("shows the already-there record as information and the other refusal as an error", async () => {
            const wrapper = await mountTransition(["4", "5", "6"]);

            const rows = wrapper.findAll(rowSelector);
            const notice = rows[1].get('[data-qa="action-form-list-item-notice"]');
            expect(notice.text()).toBe("Already in the Submitted state.");
            expect(notice.attributes("data-severity")).toBe("info");
            expect(rows[1].find('[data-slot="field-message"][data-severity="error"]').exists()).toBe(false);
            const error = rows[2].get('[data-slot="field-message"][data-severity="error"]');
            expect(error.text()).toBe("Submit for approval is not available from the Received state.");
            expect(rows[0].find('[data-slot="field-message"]').exists()).toBe(false);
        });

        scopedIt("sends only the record that can move when confirmed", async () => {
            const wrapper = await mountTransition(["4", "5", "6"]);
            executeTransition.mockClear();

            await wrapper.get("form").trigger("submit");
            await flushPromises();

            expect(executeTransition).toHaveBeenCalledTimes(1);
            const [, , pk, , , , dryRun] = executeTransition.mock.calls[0];
            expect(pk).toEqual(["4"]);
            expect(dryRun).toBe(false);
        });

        scopedIt("disables the confirm button when no selected record can move", async () => {
            const wrapper = await mountTransition(["5", "6"]);

            expect(wrapper.get('[data-qa="action-form-selected-count"]').text()).toBe("0 of 2 selected");
            expect(wrapper.get('[data-qa="model-action-form-banner-desc"]').text()).toBe(
                "None of the selected purchase orders can move to Submitted.",
            );
            const confirm = wrapper.get('[data-qa="action-form-buttons"] button[type="submit"]');
            expect(confirm.attributes("disabled")).toBeDefined();
        });
    });
});
