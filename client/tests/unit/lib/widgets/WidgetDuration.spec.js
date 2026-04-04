import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive, ref } from "vue";

const clickSpies = {};

const InputNumberStub = defineComponent({
    name: "InputNumberStub",
    props: ["modelValue"],
    emits: ["update:model-value"],
    setup(props, { emit, attrs, expose }) {
        const label = attrs["aria-label"];
        const onClick = vi.fn();
        clickSpies[label] = onClick;
        expose({ onClick });
        return () =>
            h("input", {
                "data-qa": "input-number",
                "data-label": label,
                value: props.modelValue ?? "",
                onInput: (e) => emit("update:model-value", Number(e.target.value)),
                onClick,
            });
    },
});

vi.mock("primevue/inputnumber", () => ({ default: InputNumberStub }));
vi.mock("@vueda/use/useWidgetTheme.js", () => ({ useWidgetTheme: () => () => "" }));
vi.mock("@vueda/use/useWarningClass.js", () => ({ useWarningClass: () => ref({}), PASSTHROUGH_OPTION_PROPS: {} }));

let WidgetDuration;

const fieldContext = {
    state: reactive({
        fieldId: "test-field-id",
        dependencyValues: {},
        value: undefined,
        required: false,
        errors: {},
        name: "duration",
    }),
    registerDependencyValues: vi.fn(),
    unregisterDependencyValues: vi.fn(),
    setTouched: vi.fn(),
    clearTouched: vi.fn(),
    focus: vi.fn(),
    blur: vi.fn(),
};
const mountOptions = {
    global: {
        provide: {
            [FieldContextSymbol]: fieldContext,
        },
    },
};

beforeEach(async () => {
    WidgetDuration = (await import("@vueda/widgets/WidgetDuration.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("lib/widgets/WidgetDuration.vue", () => {
    scopedIt("renders minutes input by default", () => {
        fieldContext.state.value = { minutes: 1 };
        const wrapper = mount(WidgetDuration, { props: { modelValue: { minutes: 1 } }, ...mountOptions });
        expect(wrapper.findAllComponents(InputNumberStub).length).toBe(1);
        expect(wrapper.find('input[data-label="minutes"]').exists()).toBe(true);
        expect(wrapper.find('input[data-label="hours"]').exists()).toBe(false);
        expect(wrapper.find('input[data-label="days"]').exists()).toBe(false);
    });

    scopedIt("focuses first input and emits updates", async () => {
        fieldContext.state.value = { days: 1, hours: 2, minutes: 3 };
        const wrapper = mount(WidgetDuration, {
            props: {
                modelValue: { days: 1, hours: 2, minutes: 3 },
                showDays: true,
                showHours: true,
            },
            ...mountOptions,
        });
        // The inner div now has the click handler (previously on WidgetLabel)
        await wrapper.get('[data-qa="widget-duration-inner"]').trigger("click");
        expect(clickSpies.days).toHaveBeenCalled();

        await wrapper.find('input[data-label="hours"]').setValue("5");
        expect(fieldContext.state.value).toEqual({ days: 1, hours: 5, minutes: 3, seconds: undefined });
    });
});
