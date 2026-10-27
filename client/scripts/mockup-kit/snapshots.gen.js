/**
 * Renders VUEDA views against the docs' offline fixtures and writes each one's
 * HTML, so the mockup kit's snapshots come from the real components.
 *
 * Runs under vitest (jsdom) through `vitest.config.js` in this folder, driven
 * by `build.mjs`, which sets three environment variables:
 *
 * - `MOCKUP_KIT_OUT`: the skill directory. The snapshots and their catalog go
 *   in its `snapshots/` folder, beside `page.html` and `gallery.html`.
 * - `MOCKUP_KIT_BASE_CSS`: the kit stylesheet compiled without named classes,
 *   which decides which class tokens are utilities.
 * - `MOCKUP_KIT_COMPONENTS_CSS`: file that the named-class rules are written to.
 */
import DemoPageChrome from "../../../docs/.vitepress/theme/components/DemoPageChrome.vue";
import { bootDemoSubApp, installDefaultCrud } from "../../../docs/.vitepress/theme/components/demoSubApp.js";
import { registerDemoRoutes } from "../../../docs/.vitepress/theme/fixtures/demoApi.js";
import { customerModelInfo } from "../../../docs/.vitepress/theme/fixtures/showcaseCustomer.js";
import { fieldTypesModelInfo } from "../../../docs/.vitepress/theme/fixtures/showcaseFieldTypes.js";
import {
    CUSTOMER_RECORDS,
    FIELD_TYPE_RECORDS,
    customerScenario,
    fieldTypesScenario,
} from "../../../docs/.vitepress/theme/fixtures/showcaseRecords.js";
import { hoistClasses, hoistedClassesCss, utilityClassNames } from "./hoistClasses.js";
import { galleryPage, starterPage } from "./pages.js";
import fontAwesomeFreeIcons from "@vueda/theme/vueda-tailwind/icons/fontAwesomeFree.js";
import "@vueda/theme/vueda-tailwind/index.js";
import { setIcons } from "@vueda/use/useIcons.js";
import flushPromises from "flush-promises";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { format } from "prettier";
import { afterAll, beforeAll, describe, test } from "vitest";

setIcons(fontAwesomeFreeIcons);

// Route table mirroring makeCRUDRoutes, as in the docs' ModelDemo harness.
const NOOP = { render: () => null };
const ROUTES = [
    { path: "/:app/:model/:action/:pk", name: "actionrouter.detailview", component: NOOP, meta: { detail: true } },
    { path: "/:app/:model/:action/", name: "actionrouter.listview", component: NOOP },
    { path: "/", name: "welcome", component: NOOP },
    { path: "/sign-in", name: "sign-in", component: NOOP },
    { path: "/not-found", name: "not-found", component: NOOP },
    { path: "/:pathMatch(.*)*", name: "catch-all", component: NOOP },
];

const LIST_ROWS = 8;

// The field-type model's `serverIp` field has no widget, on purpose: the docs
// use it to show the unmapped-widget error. The kit leaves it out.
const FIELD_TYPE_FIELDS = [
    "releaseDate",
    "publishedAt",
    "campaignWindow",
    "opensAt",
    "serviceWindow",
    "leadTime",
    "regions",
    "expedited",
    "metadata",
    "datasheet",
    "heroImage",
];
const FIELD_TYPE_VIEW_CONFIGS = {
    list: { displayFields: FIELD_TYPE_FIELDS },
    read: { displayFields: FIELD_TYPE_FIELDS },
    update: { displayFields: FIELD_TYPE_FIELDS },
};

/** Frame width for snapshots of the narrow card layout. */
const NARROW_WIDTH = 420;
const WIDE_WIDTH = 1280;

/**
 * One snapshot. Each takes its own app label, because the demo API matches
 * routes globally in registration order. `title` describes the snapshot in
 * the catalog and the gallery.
 */
const SNAPSHOTS = [
    {
        file: "view-list-table.html",
        title: "Customer list, table layout",
        modelInfo: customerModelInfo,
        view: () => import("@vueda/views/ViewList.vue"),
        scenario: customerScenario({ app: "kitlisttable", records: CUSTOMER_RECORDS.slice(0, LIST_ROWS) }),
        action: "list",
        viewProps: { tableBreakpoint: "xs" },
    },
    {
        // jsdom matches no media query, so the default breakpoint renders cards.
        file: "view-list-cards.html",
        title: "Customer list, card layout for narrow screens",
        modelInfo: customerModelInfo,
        width: NARROW_WIDTH,
        view: () => import("@vueda/views/ViewList.vue"),
        scenario: customerScenario({ app: "kitlistcards", records: CUSTOMER_RECORDS.slice(0, 4) }),
        action: "list",
    },
    {
        file: "view-read.html",
        title: "Customer read view",
        modelInfo: customerModelInfo,
        view: () => import("@vueda/views/ViewRead.vue"),
        scenario: customerScenario({ app: "kitread" }),
        action: "read",
        pk: "1",
    },
    {
        file: "view-create.html",
        title: "Customer create form",
        modelInfo: customerModelInfo,
        view: () => import("@vueda/views/ViewCreate.vue"),
        scenario: customerScenario({ app: "kitcreate" }),
        action: "create",
    },
    {
        file: "view-update.html",
        title: "Customer update form",
        modelInfo: customerModelInfo,
        view: () => import("@vueda/views/ViewUpdate.vue"),
        scenario: customerScenario({ app: "kitupdate" }),
        action: "update",
        pk: "1",
    },
    {
        file: "view-destroy.html",
        title: "Delete confirmation for two customers",
        modelInfo: customerModelInfo,
        view: () => import("@vueda/views/ViewDestroy.vue"),
        scenario: customerScenario({ app: "kitdestroy" }),
        action: "destroy",
        pk: ["2", "5"],
        viewProps: {
            confirmText: "delete 2 customers",
            linkedObjectCounts: [
                { count: 26, verboseNamePlural: "contacts" },
                { count: 112, verboseNamePlural: "invoices" },
            ],
        },
    },
    {
        file: "fields-list-table.html",
        title: "List cells for each field type",
        modelInfo: fieldTypesModelInfo,
        view: () => import("@vueda/views/ViewList.vue"),
        scenario: fieldTypesScenario({
            app: "kitfieldslist",
            records: FIELD_TYPE_RECORDS.slice(0, 3),
            viewConfigs: FIELD_TYPE_VIEW_CONFIGS,
        }),
        action: "list",
        viewProps: { tableBreakpoint: "xs" },
    },
    {
        file: "fields-read.html",
        title: "Read-only display for each field type",
        modelInfo: fieldTypesModelInfo,
        view: () => import("@vueda/views/ViewRead.vue"),
        scenario: fieldTypesScenario({ app: "kitfieldsread", viewConfigs: FIELD_TYPE_VIEW_CONFIGS }),
        action: "read",
        pk: String(FIELD_TYPE_RECORDS[0].id),
    },
    {
        file: "fields-update.html",
        title: "Form widget for each field type",
        modelInfo: fieldTypesModelInfo,
        view: () => import("@vueda/views/ViewUpdate.vue"),
        scenario: fieldTypesScenario({ app: "kitfieldsupdate", viewConfigs: FIELD_TYPE_VIEW_CONFIGS }),
        action: "update",
        pk: String(FIELD_TYPE_RECORDS[0].id),
    },
];

/**
 * Whether a component declares `name` as a prop, as in the docs' ModelDemo.
 *
 * @param {import('vue').Component} component - The resolved view component.
 * @param {string} name - Prop name to look for.
 * @returns {boolean} True when the component declares that prop.
 */
function declaresProp(component, name) {
    const declared = component?.props;
    return Array.isArray(declared) ? declared.includes(name) : !!declared && name in declared;
}

const SETTLE_POLL_MS = 50;
const SETTLE_STABLE_POLLS = 6;
const SETTLE_TIMEOUT_MS = 15000;

/**
 * Wait until the mocked requests and lazily loaded widgets have finished, which
 * is when the DOM stops changing across several polls in a row.
 *
 * @param {Element} root - The subtree to watch.
 * @returns {Promise<void>}
 */
async function settle(root) {
    const deadline = Date.now() + SETTLE_TIMEOUT_MS;
    let previous = null;
    let stablePolls = 0;
    while (stablePolls < SETTLE_STABLE_POLLS) {
        if (Date.now() > deadline) {
            throw new Error(`Snapshot did not settle within ${SETTLE_TIMEOUT_MS} ms.`);
        }
        await flushPromises();
        await new Promise((resolve) => setTimeout(resolve, SETTLE_POLL_MS));
        const current = root.innerHTML;
        stablePolls = current === previous ? stablePolls + 1 : 0;
        previous = current;
    }
}

/**
 * Copy form state that lives in DOM properties into attributes, so it survives
 * serialization. Run it on the live DOM, before cloning.
 *
 * @param {Element} root - The rendered subtree; modified in place.
 * @returns {void}
 */
function persistFormState(root) {
    for (const input of root.querySelectorAll("input")) {
        if (input.type === "checkbox" || input.type === "radio") {
            input.toggleAttribute("checked", input.checked);
        } else if (input.type !== "file" && input.value !== "") {
            input.setAttribute("value", input.value);
        }
    }
    for (const textarea of root.querySelectorAll("textarea")) {
        textarea.textContent = textarea.value;
    }
    for (const option of root.querySelectorAll("option")) {
        option.toggleAttribute("selected", option.selected);
    }
}

// Fixture file URLs use the reserved .invalid domain, so images get a neutral
// placeholder instead of a broken-image icon.
const PLACEHOLDER_IMAGE =
    "data:image/svg+xml," +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90" viewBox="0 0 160 90">' +
            '<rect width="160" height="90" fill="#e5e5e5"/></svg>',
    );

/**
 * Point images on the fixtures' unresolvable hosts at a placeholder.
 *
 * @param {Element} root - The rendered subtree; modified in place.
 * @returns {void}
 */
function replaceFixtureImages(root) {
    for (const image of root.querySelectorAll("img[src]")) {
        let host = "";
        try {
            host = new URL(image.getAttribute("src"), "http://localhost/").hostname;
        } catch {
            continue;
        }
        if (host.endsWith(".invalid")) {
            image.setAttribute("src", PLACEHOLDER_IMAGE);
        }
    }
}

const GENERATED_ID = /^(reka-|v-)/;
const ID_REFERENCES = ["aria-controls", "aria-labelledby", "aria-describedby", "for"];

/**
 * Remove what only matters to a running app: comments, generated ids and the
 * attributes that point at them, and empty class and style attributes. Also
 * remove attributes whose value is `[object Object]`: an object prop that fell
 * through to the DOM, which no page can use.
 *
 * @param {Element} root - The rendered subtree; modified in place.
 * @returns {void}
 */
function stripRuntimeDetail(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
    const comments = [];
    while (walker.nextNode()) {
        comments.push(walker.currentNode);
    }
    comments.forEach((node) => node.remove());

    for (const element of [root, ...root.querySelectorAll("*")]) {
        element.removeAttribute("data-v-app");
        for (const { name, value } of [...element.attributes]) {
            if (value === "[object Object]") {
                element.removeAttribute(name);
            }
        }
        if (GENERATED_ID.test(element.id)) {
            element.removeAttribute("id");
        }
        for (const name of ID_REFERENCES) {
            const value = element.getAttribute(name);
            if (value !== null && value.split(/\s+/).every((ref) => ref === "" || GENERATED_ID.test(ref))) {
                element.removeAttribute(name);
            }
        }
        for (const name of ["class", "style"]) {
            if (element.getAttribute(name)?.trim() === "") {
                element.removeAttribute(name);
            }
        }
    }
}

/**
 * Mark each form and read field with the name of the field that it shows, the
 * way list cells already carry `data-field`. The name comes from the anchor
 * that each field renders for scrolling to it.
 *
 * @param {Element} root - The rendered subtree; modified in place.
 * @returns {void}
 */
function markFields(root) {
    for (const field of root.querySelectorAll('[data-slot="field"]')) {
        const anchor = field.querySelector(':scope > [data-slot="field-content"] > a[name]');
        if (anchor) {
            field.setAttribute("data-field", anchor.getAttribute("name"));
        }
    }
}

/**
 * Describe the widget that a field renders, by the `data-qa` of its root.
 *
 * @param {Element} field
 * @returns {string}
 */
function widgetOf(field) {
    return field.querySelector('[data-qa^="widget-"]')?.getAttribute("data-qa") ?? "";
}

/**
 * @param {string} value
 * @returns {string}
 */
function tableCell(value) {
    return String(value ?? "").replace(/\|/g, "\\|");
}

/**
 * Write the catalog: what each snapshot shows, and for every field, its types
 * and the widget that it renders in each snapshot that contains it.
 *
 * @param {{ file: string, title: string, action: string, modelInfo: object, snapshot: Element }[]} captured
 * @returns {string}
 */
function catalog(captured) {
    const lines = [
        "# Snapshot catalog",
        "",
        "Generated by `client/scripts/mockup-kit`. Do not edit.",
        "",
        "## Files",
        "",
        "| File | Shows | Model | View action |",
        "| --- | --- | --- | --- |",
        ...captured.map(
            ({ file, title, modelInfo, action }) =>
                `| \`${file}\` | ${tableCell(title)} | \`${modelInfo.appLabel}.${modelInfo.model}\` | ${action} |`,
        ),
    ];

    const models = [...new Map(captured.map(({ modelInfo }) => [modelInfo.model, modelInfo])).values()];
    for (const modelInfo of models) {
        const snapshots = captured.filter((entry) => entry.modelInfo === modelInfo);
        lines.push(
            "",
            `## Fields of \`${modelInfo.appLabel}.${modelInfo.model}\``,
            "",
            "Each field's element carries `data-field` with the field name in every snapshot.",
            "The widget column gives the `data-qa` of the widget root in the snapshots listed.",
            "",
            "| Field | Label | Serializer type | Model type | Notes | Widget |",
            "| --- | --- | --- | --- | --- | --- |",
        );
        for (const [name, field] of Object.entries(modelInfo.fields)) {
            const widgets = snapshots
                .map(({ file, snapshot }) => {
                    const element = snapshot.querySelector(`[data-slot="field"][data-field="${name}"]`);
                    const widget = element && widgetOf(element);
                    return widget ? `\`${widget}\` (${file})` : null;
                })
                .filter(Boolean);
            if (!widgets.length) {
                continue;
            }
            const notes = [
                field.required && "required",
                field.readOnly && "read-only",
                field.many && "many",
                field.choices && "choices",
            ].filter(Boolean);
            lines.push(
                `| \`${name}\` | ${tableCell(field.label)} | ${field.typeSerializer} | ${field.typeModel} | ${notes.join(", ")} | ${widgets.join("<br>")} |`,
            );
        }
    }
    return `${lines.join("\n")}\n`;
}

// Elements whose stylesheet sets `white-space: pre`, so reindenting their
// contents would change what they display.
const WHITESPACE_SENSITIVE = ".cm-editor";
const PRETTIER_IGNORE = "prettier-ignore";

/**
 * Format a snapshot for reading and diffing, leaving whitespace-sensitive
 * subtrees as they rendered.
 *
 * @param {Element} snapshot - The cleaned snapshot; modified in place.
 * @returns {Promise<string>} The formatted HTML.
 */
async function formatSnapshot(snapshot) {
    for (const element of snapshot.querySelectorAll(WHITESPACE_SENSITIVE)) {
        element.before(document.createComment(` ${PRETTIER_IGNORE} `));
    }
    const html = await format(snapshot.innerHTML, { parser: "html", printWidth: 120, useTabs: true });
    return html.replace(new RegExp(`^\\s*<!-- ${PRETTIER_IGNORE} -->\\n`, "gm"), "");
}

/**
 * Read a required environment variable.
 *
 * @param {string} name
 * @returns {string}
 */
function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Set ${name}; run the kit through client/scripts/mockup-kit/build.mjs.`);
    }
    return value;
}

describe("mockup kit snapshots", () => {
    /** @type {{ file: string, title: string, action: string, width: number, modelInfo: object, snapshot: Element }[]} */
    const captured = [];

    beforeAll(async () => {
        await installDefaultCrud();
    });

    test.each(SNAPSHOTS)("$file", async (entry) => {
        const { file, title, modelInfo, width = WIDE_WIDTH, view, scenario, action, pk, viewProps = {} } = entry;
        const unregister = registerDemoRoutes(scenario.api);
        const headBefore = new Set(document.head.children);
        const mountPoint = document.createElement("div");
        document.body.replaceChildren(mountPoint);
        const routePk = Array.isArray(pk) ? pk.join(",") : pk;
        const app = await bootDemoSubApp({
            mountPoint,
            view,
            viewProps: (ViewComponent) => ({
                app: scenario.app,
                model: scenario.model,
                ...(pk === undefined ? {} : { pk }),
                ...(declaresProp(ViewComponent, "action") ? { action } : {}),
                ...viewProps,
            }),
            routes: ROUTES,
            initialRoute: {
                name: pk === undefined ? "actionrouter.listview" : "actionrouter.detailview",
                params: {
                    app: scenario.app,
                    model: scenario.model,
                    action,
                    ...(routePk === undefined ? {} : { pk: routePk }),
                },
            },
            seed: scenario.seed,
            chrome: DemoPageChrome,
        });
        try {
            await settle(document.body);
            persistFormState(document.body);
            const snapshot = document.body.cloneNode(true);
            stripRuntimeDetail(snapshot);
            replaceFixtureImages(snapshot);
            markFields(snapshot);
            // Styles that components add at runtime (CodeMirror's, for one) are
            // not in the kit stylesheet, so each snapshot carries its own. Font
            // Awesome's runtime copy is skipped, because kit.css imports it.
            const runtimeStyles = [...document.head.children].filter(
                (node) =>
                    node.tagName === "STYLE" && !headBefore.has(node) && !node.textContent.includes("--fa-font-solid"),
            );
            snapshot.prepend(...runtimeStyles.map((node) => node.cloneNode(true)));
            captured.push({ file, title, action, width, modelInfo, snapshot });
        } finally {
            app.unmount();
            unregister();
        }
    });

    // Naming runs once over every snapshot, so a class string gets the same
    // name in each file.
    afterAll(async () => {
        if (captured.length !== SNAPSHOTS.length) {
            return;
        }
        const out = requireEnv("MOCKUP_KIT_OUT");
        const utilities = utilityClassNames(readFileSync(requireEnv("MOCKUP_KIT_BASE_CSS"), "utf8"));
        const hoisted = hoistClasses(
            captured.map(({ snapshot }) => snapshot),
            utilities,
        );
        // The catalog reads the snapshots before formatting marks them up.
        const catalogText = catalog(captured);

        // Recreate the folder, so a snapshot dropped from the list leaves no file.
        const snapshotsDir = join(out, "snapshots");
        rmSync(snapshotsDir, { recursive: true, force: true });
        mkdirSync(snapshotsDir, { recursive: true });
        const sections = [];
        for (const { file, title, width, snapshot } of captured) {
            const html = await formatSnapshot(snapshot);
            writeFileSync(join(snapshotsDir, file), html);
            sections.push({ file, title, width, html });
        }
        writeFileSync(join(snapshotsDir, "catalog.md"), catalogText);
        writeFileSync(join(out, "page.html"), starterPage());
        writeFileSync(join(out, "gallery.html"), galleryPage(sections));
        writeFileSync(requireEnv("MOCKUP_KIT_COMPONENTS_CSS"), hoistedClassesCss(hoisted));
    });
});
