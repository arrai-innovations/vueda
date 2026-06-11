import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { reactive } from "vue";

const QA = "widget-json";
const QA_SEL = `[data-qa='${QA}']`;

const makeDoc = (value) => ({
    length: value.length,
    toString: () => value,
});

const editorViewInstances = [];

class MockEditorView {
    static lineWrapping = { extension: "lineWrapping" };

    static theme = vi.fn((spec) => ({ extension: "theme", spec }));

    static editable = {
        of: vi.fn((editable) => ({ editable })),
    };

    static updateListener = {
        of: vi.fn((listener) => ({ listener })),
    };

    constructor(config) {
        this.parent = config.parent;
        this.state = config.state;
        this.contentDOM = document.createElement("div");
        this.destroy = vi.fn();
        this.hasFocus = false;
        this.dispatch = vi.fn((transaction) => {
            if (transaction.changes) {
                this.state = {
                    ...this.state,
                    doc: makeDoc(transaction.changes.insert),
                };
            }
        });
        this.listenerExtension = this.state.extensions.find((extension) => extension.listener);
        this.parent.appendChild(this.contentDOM);
        editorViewInstances.push(this);
    }

    simulateDocChange(value) {
        this.state = {
            ...this.state,
            doc: makeDoc(value),
        };
        this.listenerExtension.listener({
            docChanged: true,
            focusChanged: false,
            state: this.state,
            view: this,
        });
    }

    simulateFocus(focused) {
        this.hasFocus = focused;
        this.listenerExtension.listener({
            docChanged: false,
            focusChanged: true,
            state: this.state,
            view: this,
        });
    }
}

vi.mock("@codemirror/lang-json", () => ({
    json: vi.fn(() => ({ extension: "json" })),
}));

vi.mock("@codemirror/language", () => ({
    HighlightStyle: { define: vi.fn((spec) => ({ highlightStyle: spec })) },
    syntaxHighlighting: vi.fn((style) => ({ extension: "syntaxHighlighting", style })),
}));

vi.mock("@codemirror/state", () => ({
    Compartment: class {
        of(extension) {
            return extension;
        }

        reconfigure(extension) {
            return { reconfigured: extension };
        }
    },
    EditorState: {
        create: vi.fn((config) => ({
            doc: makeDoc(config.doc),
            extensions: config.extensions,
        })),
    },
}));

vi.mock("@codemirror/view", () => ({
    EditorView: MockEditorView,
}));

vi.mock("@vueda/use/useWidgetTheme.js", () => ({
    useWidgetTheme: vi.fn(() => (key) => key),
}));

let widgetContext;
const mockedUseWidget = vi.fn(() => {
    widgetContext = {
        state: reactive({
            combinedValue: { sku: "ABC", count: 2 },
            disabled: false,
            validationState: reactive({ invalid: false }),
            combinedName: "metadata",
            required: false,
        }),
        blur: vi.fn(),
        focus: vi.fn(),
    };
    return widgetContext;
});

vi.mock("@vueda/use/useWidget.js", () => ({
    WIDGET_EMITS: ["update:modelValue"],
    WIDGET_PROPS: {},
    useWidget: mockedUseWidget,
}));

const importComponent = () => import("@vueda/widgets/WidgetJson.vue");

describe("lib/widgets/WidgetJson.vue", () => {
    let WidgetJson;
    let fieldContext;

    beforeEach(async () => {
        editorViewInstances.length = 0;
        WidgetJson = (await importComponent()).default;
        mockedUseWidget.mockClear();
        fieldContext = {
            state: reactive({ fieldId: "field-json" }),
            updateError: vi.fn(),
            deleteError: vi.fn(),
        };
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    function mountWidget(options = {}) {
        return mount(WidgetJson, {
            global: { provide: { [FieldContextSymbol]: fieldContext } },
            ...options,
        });
    }

    describe("Rendering", () => {
        scopedIt("renders the JSON widget root", async () => {
            const wrapper = mountWidget();
            expect(wrapper.get(QA_SEL).exists()).toBe(true);
            expect(editorViewInstances).toHaveLength(1);
        });

        scopedIt("initializes CodeMirror with pretty JSON", async () => {
            mountWidget();
            expect(editorViewInstances[0].state.doc.toString()).toBe('{\n  "sku": "ABC",\n  "count": 2\n}');
        });

        scopedIt("applies field accessibility attributes to the editable element", async () => {
            mountWidget();
            expect(editorViewInstances[0].contentDOM.id).toBe("field-json");
            expect(editorViewInstances[0].contentDOM.getAttribute("role")).toBe("textbox");
            expect(editorViewInstances[0].contentDOM.getAttribute("aria-multiline")).toBe("true");
        });
    });

    describe("JSON value handling", () => {
        scopedIt("parses valid JSON and writes the parsed value to the widget context", async () => {
            mountWidget();
            editorViewInstances[0].simulateDocChange('{"sku":"DEF","count":3}');
            expect(widgetContext.state.combinedValue).toEqual({ sku: "DEF", count: 3 });
            expect(fieldContext.deleteError).toHaveBeenCalledWith("invalidJson");
        });

        scopedIt("maps empty text to null", async () => {
            mountWidget();
            editorViewInstances[0].simulateDocChange("");
            expect(widgetContext.state.combinedValue).toBeNull();
            expect(fieldContext.deleteError).toHaveBeenCalledWith("invalidJson");
        });

        scopedIt("sets a field error and preserves the last valid value for invalid JSON", async () => {
            mountWidget();
            const previous = widgetContext.state.combinedValue;
            editorViewInstances[0].simulateDocChange('{"sku":');
            expect(widgetContext.state.combinedValue).toBe(previous);
            expect(fieldContext.updateError).toHaveBeenCalledWith("invalidJson", "Enter valid JSON.");
            expect(editorViewInstances[0].contentDOM.getAttribute("aria-invalid")).toBe("true");
        });

        scopedIt("does not overwrite invalid in-progress text when the field value changes externally", async () => {
            mountWidget();
            editorViewInstances[0].simulateDocChange('{"sku":');
            widgetContext.state.combinedValue = { sku: "GHI" };
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(editorViewInstances[0].state.doc.toString()).toBe('{"sku":');
        });

        scopedIt("syncs external valid values into the editor text", async () => {
            mountWidget();
            widgetContext.state.combinedValue = { sku: "GHI" };
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(editorViewInstances[0].dispatch).toHaveBeenCalledWith({
                changes: {
                    from: 0,
                    to: 32,
                    insert: '{\n  "sku": "GHI"\n}',
                },
            });
        });
    });

    describe("Interaction", () => {
        scopedIt("calls focus and blur hooks from CodeMirror focus changes", async () => {
            mountWidget();
            editorViewInstances[0].simulateFocus(true);
            editorViewInstances[0].simulateFocus(false);
            expect(widgetContext.focus).toHaveBeenCalledTimes(1);
            expect(widgetContext.blur).toHaveBeenCalledTimes(1);
        });

        scopedIt("formats valid JSON on blur by default", async () => {
            mountWidget();
            editorViewInstances[0].simulateDocChange('{"sku":"JKL"}');
            editorViewInstances[0].simulateFocus(false);
            expect(editorViewInstances[0].state.doc.toString()).toBe('{\n  "sku": "JKL"\n}');
        });

        scopedIt("keeps compact JSON on blur when formatOnBlur is false", async () => {
            mountWidget({ props: { formatOnBlur: false } });
            editorViewInstances[0].simulateDocChange('{"sku":"JKL"}');
            editorViewInstances[0].simulateFocus(false);
            expect(editorViewInstances[0].state.doc.toString()).toBe('{"sku":"JKL"}');
        });

        scopedIt("reconfigures editability when disabled changes", async () => {
            mountWidget();
            widgetContext.state.disabled = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(editorViewInstances[0].dispatch).toHaveBeenCalledWith({
                effects: { reconfigured: { editable: false } },
            });
        });
    });

    describe("Cleanup", () => {
        scopedIt("destroys the editor and clears JSON errors on unmount", async () => {
            const wrapper = mountWidget();
            const view = editorViewInstances[0];
            wrapper.unmount();
            expect(fieldContext.deleteError).toHaveBeenCalledWith("invalidJson");
            expect(view.destroy).toHaveBeenCalledTimes(1);
        });
    });
});
