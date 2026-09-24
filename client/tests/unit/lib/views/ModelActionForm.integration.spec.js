import { scopedIt } from "@tests/unit/utils.js";
import { flushPromises, mount } from "@vue/test-utils";
import { useForm } from "@vueda/use/useForm.js";
import ModelActionForm from "@vueda/views/ModelActionForm.vue";
import { defineComponent, effectScope, h, reactive } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

// Keep the real form, fields, and read-only widget. Only metadata, lookup transport,
// and link routing are isolated from the consuming application's setup.
vi.mock("@vueda/use/useModelConfig.js", () => ({
    useModelConfig: () => ({
        loading: false,
        info: { pk: "id", verboseName: "Order", verboseNamePlural: "Orders" },
        config: { fetchFields: [], expand: [], actionRedirects: {} },
    }),
}));
vi.mock("@vueda/use/useResolvedLookupObject.js", () => ({
    useResolvedLookupObject: () => ({ object: {}, loading: false, effectScope: effectScope() }),
}));
const RecordLink = defineComponent({
    props: ["app", "model", "pk", "view", "label"],
    setup: (props) => () => h("a", { href: `/${props.app}/${props.model}/${props.view}/${props.pk}` }, props.label),
});
const records = [
    { id: 4, formatted_name: "PO-1044" },
    { id: 5, formatted_name: "PO-1045" },
];

async function renderConfirmation({ objects = records, slots = {} } = {}) {
    let form;
    const fetchState = reactive({
        loading: false,
        objectsMap: new Map(objects.map((object) => [String(object.id), object])),
    });
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/", component: { template: "<div />" } }],
    });
    await router.push("/");
    const wrapper = mount(
        defineComponent({
            setup() {
                form = useForm({});
                return () =>
                    h(
                        ModelActionForm,
                        {
                            app: "catalog",
                            model: "order",
                            action: "destroy",
                            pk: ["4", "5"],
                            enableDryRun: false,
                            fetchState,
                        },
                        slots,
                    );
            },
        }),
        { attachTo: document.body, global: { plugins: [router], stubs: { LinkModelView: RecordLink } } },
    );
    await flushPromises();
    return { wrapper, form, fetchState };
}
const rowSelector = '[data-qa="action-form-list-item"]';

describe("lib/views/ModelActionForm.vue", () => {
    describe("selected record names and feedback", () => {
        scopedIt("shows fetched names as visible links with one trailing ID and no duplicate field label", async () => {
            const { wrapper, fetchState } = await renderConfirmation();
            try {
                const rows = wrapper.findAll(rowSelector);
                expect(rows).toHaveLength(2);
                for (const [index, row] of rows.entries()) {
                    const record = records[index];
                    expect(row.get("a").isVisible()).toBe(true);
                    expect(row.get("a").text()).toBe(record.formatted_name);
                    expect(row.get("a").attributes("href")).toBe(`/catalog/order/read/${record.id}`);
                    expect(row.find("label").exists()).toBe(false);
                    expect(row.get('[data-qa="action-form-list-item-pk"]').text()).toBe(String(record.id));
                }
                fetchState.objectsMap.set("4", { id: 4, formatted_name: "Renamed order" });
                await flushPromises();
                expect(rows[0].get("a").text()).toBe("Renamed order");
            } finally {
                wrapper.unmount();
            }
        });

        scopedIt("keeps each record's errors and warnings visible beside its name", async () => {
            const { wrapper, form } = await renderConfirmation();
            try {
                form.handleServerFormValidationError({
                    errors: { 4: "This order cannot be deleted." },
                    messages: { 5: "Check the related deliveries." },
                });
                form.setAllTouched();
                await flushPromises();
                const rows = wrapper.findAll(rowSelector);
                expect(rows[0].text()).toContain("PO-1044");
                expect(rows[0].text()).toContain("This order cannot be deleted.");
                expect(rows[1].text()).not.toContain("This order cannot be deleted.");
                expect(rows[1].text()).toContain("Check the related deliveries.");
                expect(rows[0].findAll("[hidden]")).toHaveLength(0);
            } finally {
                wrapper.unmount();
            }
        });

        scopedIt("shows no validation summary for a per-record rejection its chip already shows", async () => {
            const { wrapper, form } = await renderConfirmation();
            try {
                form.handleServerFormValidationError({
                    errors: { 4: "This order cannot be deleted.", 5: "This order is already closed." },
                    messages: {},
                });
                form.setAllTouched();
                await flushPromises();
                // Each record's chip is a rendered FormField reporting its own error beside the
                // record's name, so the summary above the form has nothing left to report. A
                // bulk action over many records gets no second index of the rejected ones.
                const rows = wrapper.findAll(rowSelector);
                expect(rows[0].text()).toContain("This order cannot be deleted.");
                expect(rows[1].text()).toContain("This order is already closed.");
                expect(wrapper.find('[data-qa="action-form-validation"]').exists()).toBe(false);
                expect(wrapper.text().split("This order cannot be deleted.")).toHaveLength(2);
            } finally {
                wrapper.unmount();
            }
        });

        scopedIt("keeps one visible ID when no fetched name is available", async () => {
            const { wrapper } = await renderConfirmation({ objects: [] });
            try {
                expect(wrapper.findAll(rowSelector).map((row) => row.text())).toEqual(["4", "5"]);
            } finally {
                wrapper.unmount();
            }
        });

        scopedIt("renders custom record links visibly with the same record identity", async () => {
            const { wrapper } = await renderConfirmation({
                slots: { "link-item": ({ pk, label }) => h("a", { href: `/orders/${pk}` }, `Open ${label}`) },
            });
            try {
                const link = wrapper.findAll(rowSelector)[0].get("a");
                expect(link.isVisible()).toBe(true);
                expect(link.text()).toBe("Open PO-1044");
                expect(link.attributes("href")).toBe("/orders/4");
            } finally {
                wrapper.unmount();
            }
        });
    });

    describe("success redirect", () => {
        scopedIt("sends one non-dry-run request when confirm is used again before the view is replaced", async () => {
            const runAction = vi.fn(async () => ({}));
            const router = createRouter({
                history: createMemoryHistory(),
                routes: [
                    { path: "/", component: { template: "<div />" } },
                    { path: "/done", component: { template: "<div />" } },
                ],
            });
            await router.push("/?returnPath=/done");
            // Mounted outside a RouterView, the form stays on screen after navigation, as it does while
            // ViewActionRouter resolves the destination.
            const wrapper = mount(
                defineComponent({
                    setup() {
                        useForm({});
                        return () =>
                            h(ModelActionForm, {
                                app: "catalog",
                                model: "order",
                                action: "submit",
                                pk: "4",
                                enableDryRun: false,
                                fetchState: reactive({ loading: false, objectsMap: new Map() }),
                                runAction,
                            });
                    },
                }),
                { attachTo: document.body, global: { plugins: [router], stubs: { LinkModelView: RecordLink } } },
            );
            try {
                await flushPromises();
                const confirm = wrapper.get('[data-qa="action-form-buttons"] button[type="submit"]');
                const cancel = wrapper.get('[data-qa="action-form-buttons"] button[type="button"]');

                await confirm.trigger("click");
                await flushPromises();

                expect(router.currentRoute.value.path).toBe("/done");
                expect(confirm.attributes("disabled")).toBeDefined();
                expect(cancel.attributes("disabled")).toBeDefined();

                // A disabled button ignores clicks, so submit the form directly, as the Enter key would.
                await wrapper.get("form").trigger("submit");
                await flushPromises();

                expect(runAction).toHaveBeenCalledTimes(1);
                expect(runAction).toHaveBeenCalledWith(expect.objectContaining({ dryRun: false }));
            } finally {
                wrapper.unmount();
            }
        });
    });
});
