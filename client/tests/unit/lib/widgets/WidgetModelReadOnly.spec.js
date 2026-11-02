import { scopedIt } from "@tests/unit/utils.js";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import flushPromises from "flush-promises";
import { createPinia, setActivePinia } from "pinia";
import { KeepAlive, computed, defineComponent, h, inject, reactive } from "vue";

// Mocks
// The widget reads its value from the field context. The mocked context of the inner
// WidgetReadOnly reads its value the way the real useWidget does: from the field unless the widget
// is contextless or outside a field, otherwise from `modelValue`.
const fieldState = reactive({ fieldId: "test-field-id", value: undefined });
const useWidget = vi.fn((props) => {
    const fieldContext = props.contextless ? null : inject(FieldContextSymbol, null);
    return {
        state: reactive({
            formModelName: "fm",
            combinedValue: computed(() => (fieldContext ? fieldContext.state.value : props.modelValue)),
            combinedName: "state_province",
        }),
    };
});
// WidgetReadOnly declares its props from WIDGET_PROPS, so the two that the mocked useWidget reads
// must be declared here, or they reach the widget as attrs.
vi.mock("@vueda/use/useWidget.js", () => ({
    WIDGET_EMITS: [],
    WIDGET_PROPS: {
        contextless: { type: Boolean, default: false },
        modelValue: { type: [String, Number, Boolean, Array, Object], default: undefined },
    },
    useWidget,
}));
const useWidgetTheme = vi.fn(() => () => "theme");
vi.mock("@vueda/use/useWidgetTheme.js", () => ({ useWidgetTheme }));
const useModelConfig = vi.fn();
vi.mock("@vueda/use/useModelConfig.js", () => ({ useModelConfig }));
const useResolvedLookupObject = vi.fn();
vi.mock("@vueda/use/useResolvedLookupObject.js", () => ({ useResolvedLookupObject }));
const useSlotNameResolver = vi.fn(() => ({ name: undefined, exists: undefined }));
vi.mock("@vueda/use/useSlotNameResolver.js", () => ({ useSlotNameResolver }));
const fetchHelper = vi.fn();
vi.mock("@vueda/utils/fetchSupport.js", () => ({ fetchHelper }));
const userStore = reactive({ identityGeneration: 0 });
vi.mock("@vueda/stores/storeUser.js", () => ({ storeUser: () => userStore }));

describe("lib/widgets/WidgetModelReadOnly.vue", () => {
    let WidgetModelReadOnly, storeModelChoices;

    // Every test drives the same mocked widget state, so a widget left mounted by an earlier test
    // would react to the next test's value and send requests of its own.
    enableAutoUnmount(afterEach);

    const mountOptions = {
        props: { fieldApp: "geo", fieldModel: "address", fieldName: "stateProvince" },
        global: {
            provide: {
                [FieldContextSymbol]: { state: fieldState },
            },
        },
    };

    const shownValue = (wrapper) => wrapper.get('[data-qa="widget-read-only-value"]').text();

    beforeEach(async () => {
        setActivePinia(createPinia());
        vi.useFakeTimers();
        WidgetModelReadOnly = (await import("@vueda/widgets/WidgetModelReadOnly.vue")).default;
        ({ storeModelChoices } = await import("@vueda/stores/storeModelChoices.js"));
        fieldState.value = undefined;
        userStore.identityGeneration = 0;
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    async function settle() {
        await vi.runAllTimersAsync();
        await flushPromises();
    }

    describe("Label lookup", () => {
        scopedIt("shows the label that the choices endpoint returns for the value", async () => {
            fieldState.value = "CT";
            fetchHelper.mockResolvedValue({ results: [{ label: "Connecticut", value: "CT" }] });

            const wrapper = mount(WidgetModelReadOnly, mountOptions);
            await settle();

            expect(shownValue(wrapper)).toBe("Connecticut");
            expect(fetchHelper.mock.calls[0][0]).toContain("value=CT");
        });

        scopedIt("reads the label from a complete option list without a request", async () => {
            fieldState.value = "ON";
            storeModelChoices().setChoices("geo", "address", "stateProvince", {
                results: [{ label: "Ontario", value: "ON" }],
                totalRecords: 1,
            });

            const wrapper = mount(WidgetModelReadOnly, mountOptions);
            await settle();

            expect(shownValue(wrapper)).toBe("Ontario");
            expect(fetchHelper).not.toHaveBeenCalled();
        });

        scopedIt("joins the labels of a many-related value", async () => {
            fieldState.value = ["CT", "ON"];
            fetchHelper.mockResolvedValue({
                results: [
                    { label: "Connecticut", value: "CT" },
                    { label: "Ontario", value: "ON" },
                ],
            });

            const wrapper = mount(WidgetModelReadOnly, mountOptions);
            await settle();

            expect(shownValue(wrapper)).toBe("Connecticut, Ontario");
        });

        scopedIt("shows the raw value when no option matches", async () => {
            fieldState.value = "XX";
            fetchHelper.mockResolvedValue({ results: [] });

            const wrapper = mount(WidgetModelReadOnly, mountOptions);
            await settle();

            expect(shownValue(wrapper)).toBe("XX");
        });

        scopedIt("joins the raw values of a many-related value when no label is known", async () => {
            fieldState.value = ["CT", "ON"];
            const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
            fetchHelper.mockRejectedValue(new Error("network"));

            const wrapper = mount(WidgetModelReadOnly, mountOptions);
            await settle();

            expect(shownValue(wrapper)).toBe("CT, ON");
            consoleError.mockRestore();
        });

        scopedIt("keeps showing a value with no option while a refresh runs", async () => {
            fieldState.value = "XX";
            fetchHelper.mockResolvedValueOnce({ results: [], totalRecords: 0 });
            const wrapper = mount(WidgetModelReadOnly, mountOptions);
            await settle();

            // the refresh waits in its batch window, since the fake timers do not advance
            userStore.identityGeneration += 1;
            await flushPromises();

            expect(shownValue(wrapper)).toBe("XX");
        });

        scopedIt("shows the raw value and logs the error when the request fails", async () => {
            fieldState.value = "CT";
            const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
            fetchHelper.mockRejectedValue(new Error("network"));

            const wrapper = mount(WidgetModelReadOnly, mountOptions);
            await settle();

            expect(shownValue(wrapper)).toBe("CT");
            expect(consoleError).toHaveBeenCalled();
            consoleError.mockRestore();
        });

        scopedIt("sends no request for an empty value", async () => {
            fieldState.value = null;

            mount(WidgetModelReadOnly, mountOptions);
            await settle();

            expect(fetchHelper).not.toHaveBeenCalled();
        });

        scopedIt("shows the label of modelValue outside a field", async () => {
            fetchHelper.mockResolvedValue({ results: [{ label: "Ontario", value: "ON" }] });

            const wrapper = mount(WidgetModelReadOnly, { props: { ...mountOptions.props, modelValue: "ON" } });
            await settle();

            expect(fetchHelper).toHaveBeenCalledTimes(1);
            expect(fetchHelper.mock.calls[0][0]).toContain("value=ON");
            expect(shownValue(wrapper)).toBe("Ontario");
        });

        scopedIt("shows the label of modelValue, not the field's value, when contextless", async () => {
            fieldState.value = "CT";
            fetchHelper.mockResolvedValue({ results: [{ label: "Ontario", value: "ON" }] });

            const wrapper = mount(WidgetModelReadOnly, {
                ...mountOptions,
                props: { ...mountOptions.props, contextless: true, modelValue: "ON" },
            });
            await settle();

            expect(fetchHelper).toHaveBeenCalledTimes(1);
            expect(fetchHelper.mock.calls[0][0]).toContain("value=ON");
            expect(fetchHelper.mock.calls[0][0]).not.toContain("value=CT");
            expect(shownValue(wrapper)).toBe("Ontario");
        });
    });

    describe("Request sharing", () => {
        scopedIt("sends one request for widgets that show values of the same field", async () => {
            fieldState.value = "CT";
            fetchHelper.mockResolvedValue({ results: [{ label: "Connecticut", value: "CT" }] });

            const first = mount(WidgetModelReadOnly, mountOptions);
            const second = mount(WidgetModelReadOnly, mountOptions);
            await settle();

            expect(fetchHelper).toHaveBeenCalledTimes(1);
            expect(shownValue(first)).toBe("Connecticut");
            expect(shownValue(second)).toBe("Connecticut");
        });

        scopedIt("fetches again under the new user when the authenticated user changes", async () => {
            fieldState.value = "CT";
            fetchHelper.mockResolvedValue({ results: [{ label: "Connecticut", value: "CT" }] });
            const wrapper = mount(WidgetModelReadOnly, mountOptions);
            await settle();

            storeModelChoices().clearAuthScoped();
            userStore.identityGeneration += 1;
            fetchHelper.mockResolvedValue({ results: [{ label: "Connecticut (renamed)", value: "CT" }] });
            await settle();

            expect(fetchHelper).toHaveBeenCalledTimes(2);
            expect(shownValue(wrapper)).toBe("Connecticut (renamed)");
        });
    });

    describe("KeepAlive", () => {
        scopedIt("waits until a cached view is shown again before it fetches", async () => {
            fieldState.value = "CT";
            fetchHelper.mockResolvedValue({ results: [{ label: "Connecticut", value: "CT" }] });
            const Host = defineComponent({
                props: { shown: Boolean },
                setup(hostProps) {
                    return () =>
                        h(KeepAlive, null, [hostProps.shown ? h(WidgetModelReadOnly, mountOptions.props) : h("span")]);
                },
            });
            const wrapper = mount(Host, { props: { shown: true }, global: mountOptions.global });
            await settle();
            expect(fetchHelper).toHaveBeenCalledTimes(1);

            await wrapper.setProps({ shown: false });
            userStore.identityGeneration += 1;
            await settle();
            expect(fetchHelper).toHaveBeenCalledTimes(1);

            await wrapper.setProps({ shown: true });
            await settle();
            expect(fetchHelper).toHaveBeenCalledTimes(2);
        });
    });

    describe("Without a choices endpoint", () => {
        scopedIt("renders with the props it was given and sends no request", async () => {
            fieldState.value = "CA";

            const wrapper = mount(WidgetModelReadOnly, {
                global: mountOptions.global,
                attrs: { options: [{ label: "Canada", value: "CA" }] },
            });
            await settle();

            expect(shownValue(wrapper)).toBe("Canada");
            expect(fetchHelper).not.toHaveBeenCalled();
        });
    });

    describe("Read-only presentation", () => {
        scopedIt("does not look up the related model or link to it", async () => {
            fieldState.value = "CT";
            fetchHelper.mockResolvedValue({ results: [{ label: "Connecticut", value: "CT" }] });

            const wrapper = mount(WidgetModelReadOnly, {
                ...mountOptions,
                attrs: { app: "geo", model: "stateprovince", type: "select", editable: true },
            });
            await settle();

            expect(useModelConfig).not.toHaveBeenCalled();
            expect(useResolvedLookupObject).not.toHaveBeenCalled();
            expect(wrapper.find("a").exists()).toBe(false);
            expect(wrapper.get('[data-qa="widget-read-only-value"]').attributes("type")).toBeUndefined();
        });
    });
});
