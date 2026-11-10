import toManyPayloads from "../../../../../server/tests/fixtures/to-many-list-payloads.json";
import { scopedIt } from "@tests/unit/utils.js";
import { flushPromises, mount } from "@vue/test-utils";
import { computed, ref } from "vue";

// The viewer can open the read view of these related objects only, keyed `model:pk`. LinkModelView
// renders the others as plain text, which is the rule that `useLinkModelView` applies.
let openable;
vi.mock("@vueda/use/useLinkModelView.js", () => ({
    useLinkModelView: (props) => ({
        view: computed(() => props.view),
        linkable: computed(() => openable.has(`${props.model}:${props.pk}`)),
        href: computed(() => `/${props.app}/${props.model}/${props.pk}`),
        navigate: vi.fn(),
        actionDisabled: ref(false),
        actionDetail: ref(undefined),
    }),
}));

let ColumnModelLinks;
beforeEach(async () => {
    openable = new Set();
    ColumnModelLinks = (await import("@vueda/objects-grid/ColumnModelLinks.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
});

// The model-info entry camelCased, as `storeModelInfo` hands it to the list.
const fieldOf = (payload) => ({
    name: payload.field,
    typeSerializer: payload.model_info.type_serializer,
    typeModel: payload.model_info.type_model,
    many: payload.model_info.many,
    appLabel: payload.model_info.app_label,
    model: payload.model_info.model,
});

const mountCell = (payload, rows, rowId, props = {}) => {
    const row = rows.find((candidate) => candidate.id === rowId);
    return mount(ColumnModelLinks, {
        props: { value: row[payload.field], field: fieldOf(payload), view: "read", ...props },
        attachTo: document.body,
    });
};

// The browser collapses runs of whitespace when it draws the cell, so the text checks do too.
const cellText = (wrapper) => wrapper.text().replace(/\s+/g, " ");
const links = (root) => root.findAll("a");
const linkTexts = (root) => links(root).map((link) => link.text());
const moreButton = (wrapper) => wrapper.find('[data-qa="column-model-links-more"]');
const popoverList = () => document.querySelector('[data-qa="column-model-links-popover"]');

const openPopover = async (wrapper) => {
    await moreButton(wrapper).trigger("click");
    await flushPromises();
    return popoverList();
};

describe("lib/objects-grid/ColumnModelLinks.vue", () => {
    describe.each(toManyPayloads)("$scenario: $field", (payload) => {
        const relatedModel = payload.model_info.model;
        const fullRowId = payload.row_ids.at(-1);
        const emptyRowId = payload.row_ids[0];
        const expandedFull = payload.expanded_rows.find((row) => row.id === fullRowId)[payload.field];
        const labels = expandedFull.map((related) => related.formatted_name);
        const openAll = () => expandedFull.forEach((related) => openable.add(`${relatedModel}:${related.id}`));

        scopedIt("shows the first three labels as links when the viewer can open them", () => {
            openAll();
            const wrapper = mountCell(payload, payload.expanded_rows, fullRowId);

            expect(linkTexts(wrapper)).toEqual(labels.slice(0, 3));
            expect(links(wrapper)[0].attributes("href")).toBe(
                `/${payload.model_info.app_label}/${relatedModel}/${expandedFull[0].id}`,
            );
            expect(cellText(wrapper)).toContain(`${labels[0]}, ${labels[1]}, ${labels[2]}`);
            wrapper.unmount();
        });

        scopedIt("shows a label as plain text when the viewer cannot open its view", () => {
            openable.add(`${relatedModel}:${expandedFull[1].id}`);
            const wrapper = mountCell(payload, payload.expanded_rows, fullRowId);

            expect(linkTexts(wrapper)).toEqual([labels[1]]);
            expect(cellText(wrapper)).toContain(labels[0]);
            expect(cellText(wrapper)).toContain(labels[2]);
            wrapper.unmount();
        });

        scopedIt("shows a +N more button for the labels past the first three", () => {
            const wrapper = mountCell(payload, payload.expanded_rows, fullRowId);

            const button = moreButton(wrapper);
            expect(button.element.tagName).toBe("BUTTON");
            expect(button.text()).toBe(`+${labels.length - 3} more`);
            expect(cellText(wrapper)).not.toContain(labels[3]);
            wrapper.unmount();
        });

        scopedIt("opens a popover that lists the remaining labels and links the ones the viewer can open", async () => {
            openable.add(`${relatedModel}:${expandedFull[3].id}`);
            const wrapper = mountCell(payload, payload.expanded_rows, fullRowId);

            const list = await openPopover(wrapper);

            expect([...list.querySelectorAll("li")].map((item) => item.textContent.trim())).toEqual(labels.slice(3));
            expect([...list.querySelectorAll("a")].map((link) => link.textContent.trim())).toEqual([labels[3]]);
            wrapper.unmount();
        });

        scopedIt("opens the popover from a focusable native button, which keyboard and touch activate", async () => {
            const wrapper = mountCell(payload, payload.expanded_rows, fullRowId);
            const button = moreButton(wrapper);

            // A browser fires `click` on a native button for Enter, Space, and a tap.
            expect(button.element.tagName).toBe("BUTTON");
            expect(button.element.disabled).toBe(false);
            button.element.focus();
            expect(document.activeElement).toBe(button.element);
            expect(button.attributes("aria-expanded")).toBe("false");

            const list = await openPopover(wrapper);

            expect(button.attributes("aria-expanded")).toBe("true");
            expect(list).not.toBeNull();
            wrapper.unmount();
        });

        scopedIt("opens the popover when the viewer cannot open the row's own read view", async () => {
            openAll();
            const row = payload.expanded_rows.find((candidate) => candidate.id === fullRowId);
            const wrapper = mountCell(payload, payload.expanded_rows, fullRowId, {
                obj: { ...row, available_actions: [] },
                pk: row.id,
            });

            const list = await openPopover(wrapper);

            expect([...list.querySelectorAll("a")].map((link) => link.textContent.trim())).toEqual(labels.slice(3));
            wrapper.unmount();
        });

        scopedIt("shows the count of related objects when the value is not expanded", () => {
            const row = payload.unexpanded_rows.find((candidate) => candidate.id === fullRowId);
            const wrapper = mountCell(payload, payload.unexpanded_rows, fullRowId);

            expect(cellText(wrapper)).toBe(`${row[payload.field].length} items`);
            expect(links(wrapper)).toHaveLength(0);
            wrapper.unmount();
        });

        scopedIt.each(["unexpanded_rows", "expanded_rows"])(
            "renders an empty cell for an empty relation (%s)",
            (key) => {
                const wrapper = mountCell(payload, payload[key], emptyRowId);

                expect(cellText(wrapper)).toBe("");
                wrapper.unmount();
            },
        );
    });

    describe("labels and counts", () => {
        const [payload] = toManyPayloads;

        scopedIt("names a single unexpanded object as 1 item", () => {
            const wrapper = mount(ColumnModelLinks, { props: { value: [3], field: fieldOf(payload) } });

            expect(cellText(wrapper)).toBe("1 item");
            wrapper.unmount();
        });

        scopedIt("shows every label with no button when the relation fits", () => {
            const wrapper = mountCell(payload, payload.expanded_rows, payload.row_ids[1]);

            expect(cellText(wrapper)).toBe("Fragile");
            expect(moreButton(wrapper).exists()).toBe(false);
            wrapper.unmount();
        });

        scopedIt("shows at least one label when maxVisible is below one", () => {
            const fullRowId = payload.row_ids.at(-1);
            const wrapper = mountCell(payload, payload.expanded_rows, fullRowId, { maxVisible: 0 });

            expect(cellText(wrapper)).toContain("Alcohol");
            expect(moreButton(wrapper).text()).toBe("+4 more");
            wrapper.unmount();
        });

        scopedIt("falls back to name, then id, when an object has no formatted_name", () => {
            const wrapper = mount(ColumnModelLinks, {
                props: { value: [{ id: 1, name: "Acme" }, { id: 2 }], field: fieldOf(payload) },
            });

            expect(cellText(wrapper)).toBe("Acme, 2");
            wrapper.unmount();
        });

        scopedIt("renders plain labels when no related model is known", () => {
            openable.add("undefined:1");
            const wrapper = mount(ColumnModelLinks, {
                props: { value: [{ id: 1, formatted_name: "Acme" }], field: {} },
            });

            expect(links(wrapper)).toHaveLength(0);
            expect(cellText(wrapper)).toBe("Acme");
            wrapper.unmount();
        });

        scopedIt("takes the related model from the app and model props when the field omits it", () => {
            openable.add("supplier:1");
            const wrapper = mount(ColumnModelLinks, {
                props: { value: [{ id: 1, formatted_name: "Acme" }], app: "catalog", model: "supplier" },
            });

            expect(links(wrapper)[0].attributes("href")).toBe("/catalog/supplier/1");
            wrapper.unmount();
        });
    });
});
