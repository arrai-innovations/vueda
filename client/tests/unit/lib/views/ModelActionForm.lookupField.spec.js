import { scopedIt } from "@tests/unit/utils.js";
import { flushPromises, mount } from "@vue/test-utils";
import { useForm } from "@vueda/use/useForm.js";
import { setupDefaultListCrud } from "@vueda/utils/listCrud.js";
import ModelActionForm from "@vueda/views/ModelActionForm.vue";
import { defineComponent, effectScope, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

// A model whose viewset sets `lookup_field = "sage_id"`. The route names its rows by `sage_id`, and each row carries
// its primary key under `id`.
vi.mock("@vueda/use/useModelConfig.js", () => ({
    useModelConfig: () => ({
        loading: false,
        info: {
            pk: "id",
            lookupField: "sage_id",
            verboseName: "Order",
            verboseNamePlural: "Orders",
            actions: [{ name: "archive", detail: true, bulk: true, methodNames: ["put"], urlPath: "archive" }],
        },
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
    { id: 4, sage_id: "SAGE-4", formatted_name: "PO-1044" },
    { id: 5, sage_id: "SAGE-5", formatted_name: "PO-1045" },
];

async function renderConfirmation() {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/", component: { template: "<div />" } }],
    });
    await router.push("/");
    const wrapper = mount(
        defineComponent({
            setup() {
                useForm({});
                return () =>
                    h(ModelActionForm, {
                        app: "catalog",
                        model: "order",
                        action: "archive",
                        pk: ["SAGE-4", "SAGE-5"],
                        enableDryRun: false,
                    });
            },
        }),
        { attachTo: document.body, global: { plugins: [router], stubs: { LinkModelView: RecordLink } } },
    );
    await flushPromises();
    return wrapper;
}

describe("lib/views/ModelActionForm.vue for a model with a custom lookup field", () => {
    let originalFetch;
    beforeEach(() => {
        originalFetch = global.fetch;
    });
    afterEach(() => {
        global.fetch = originalFetch;
    });

    scopedIt("loads the rows by lookup value and links each one by its lookup value", async () => {
        global.fetch = vi.fn(
            async () => new Response(JSON.stringify({ results: records, totalPages: 1 }), { status: 200 }),
        );
        const wrapper = await renderConfirmation();
        try {
            await flushPromises();
            const [url] = global.fetch.mock.calls[0];
            expect(new URL(String(url), "http://domain.invalid").searchParams.getAll("lookup")).toEqual([
                "SAGE-4",
                "SAGE-5",
            ]);
            const links = wrapper.findAll('[data-qa="action-form-list-item"] a');
            expect(links.map((link) => link.attributes("href"))).toEqual([
                "/catalog/order/read/SAGE-4",
                "/catalog/order/read/SAGE-5",
            ]);
            expect(wrapper.text()).not.toContain("was not found");
        } finally {
            wrapper.unmount();
        }
    });

    scopedIt("names and links each warned record by its lookup value", async () => {
        // The bulk action request goes through the default list adaptors that an application installs.
        setupDefaultListCrud();
        global.fetch = vi.fn(async (url, options = {}) => {
            if ((options.method ?? "GET") === "GET") {
                return new Response(JSON.stringify({ results: records, totalPages: 1 }), { status: 200 });
            }
            // The server keys each warning by the record's primary key.
            const warnings = { 4: { non_field_errors: ["Order 4 is overdue."] } };
            return new Response(JSON.stringify({ confirmation_required: true, digest: "d1", warnings }), {
                status: 409,
            });
        });
        const wrapper = await renderConfirmation();
        try {
            await flushPromises();
            await wrapper.get('[data-qa="action-form-buttons"] button[type="submit"]').trigger("click");
            await flushPromises();

            const group = document.body.querySelector('[data-qa="model-action-form-confirm-warning-group"] a');
            expect(group?.textContent).toBe("PO-1044");
            expect(group?.getAttribute("href")).toBe("/catalog/order/read/SAGE-4");
        } finally {
            wrapper.unmount();
        }
    });

    scopedIt("labels a record without a formatted name by its lookup value", async () => {
        const unnamed = records.map(({ formatted_name: _name, ...record }) => record);
        global.fetch = vi.fn(
            async () => new Response(JSON.stringify({ results: unnamed, totalPages: 1 }), { status: 200 }),
        );
        const wrapper = await renderConfirmation();
        try {
            await flushPromises();
            const labels = wrapper.findAll('[data-qa="action-form-list-item-pk"]').map((label) => label.text());
            expect(labels).toEqual(["SAGE-4", "SAGE-5"]);
        } finally {
            wrapper.unmount();
        }
    });

    scopedIt("shows the error of a failed row request and blocks confirm", async () => {
        global.fetch = vi.fn(
            async () => new Response(JSON.stringify({ lookup: ["Invalid query parameter."] }), { status: 400 }),
        );
        const wrapper = await renderConfirmation();
        try {
            await flushPromises();
            expect(wrapper.text()).toContain("There was an error while");
            const confirm = wrapper.get('[data-qa="action-form-buttons"] button[type="submit"]');
            expect(confirm.attributes("disabled")).toBeDefined();
        } finally {
            wrapper.unmount();
        }
    });
});
