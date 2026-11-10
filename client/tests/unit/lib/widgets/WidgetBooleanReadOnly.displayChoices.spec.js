import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { reactive, ref } from "vue";

// Mocks for the WidgetReadOnly chrome. BooleanDisplay and WidgetReadOnly render for real.
const useWidget = vi.fn();
vi.mock("@vueda/use/useWidget.js", () => ({ WIDGET_EMITS: [], WIDGET_PROPS: {}, useWidget }));
const useWidgetTheme = vi.fn(() => () => "theme");
vi.mock("@vueda/use/useWidgetTheme.js", () => ({ useWidgetTheme }));
const useModelConfig = vi.fn();
vi.mock("@vueda/use/useModelConfig.js", () => ({ useModelConfig }));
const useResolvedLookupObject = vi.fn();
vi.mock("@vueda/use/useResolvedLookupObject.js", () => ({ useResolvedLookupObject }));
const useIsActive = vi.fn(() => ref(true));
vi.mock("@vueda/use/useIsActive.js", () => ({ useIsActive }));
const useSlotNameResolver = vi.fn(() => ({ name: ref("n"), exists: ref(false) }));
vi.mock("@vueda/use/useSlotNameResolver.js", () => ({ useSlotNameResolver }));

describe("lib/widgets/WidgetBooleanReadOnly.vue", () => {
    describe("Rendered option labels", () => {
        let WidgetBooleanReadOnly;

        const mountOptions = {
            global: {
                provide: {
                    [FieldContextSymbol]: { state: { fieldId: "test-field-id" } },
                },
            },
        };

        const displayChoices = [
            { label: "Submitted", value: true },
            { label: "-", value: false },
            { label: "Unknown", value: null },
        ];

        beforeEach(async () => {
            WidgetBooleanReadOnly = (await import("@vueda/widgets/WidgetBooleanReadOnly.vue")).default;
        });

        afterEach(() => {
            vi.clearAllMocks();
        });

        scopedIt.each([
            ["true", true, "Submitted"],
            ["false", false, "-"],
            ["null", null, "Unknown"],
        ])("shows the displayChoices label for %s", (_label, combinedValue, expected) => {
            useWidget.mockReturnValue({
                state: reactive({ formModelName: "fm", combinedValue, combinedName: "submitted" }),
            });

            const wrapper = mount(WidgetBooleanReadOnly, { props: { options: displayChoices }, ...mountOptions });

            expect(wrapper.get('[data-qa="boolean-display-value"]').text()).toBe(expected);
        });

        scopedIt("shows the true word for a field without choices", () => {
            useWidget.mockReturnValue({
                state: reactive({ formModelName: "fm", combinedValue: true, combinedName: "is_active" }),
            });

            // `buildForm` passes a field's `choices: false` as `options`.
            const wrapper = mount(WidgetBooleanReadOnly, { props: { options: false }, ...mountOptions });

            expect(wrapper.get('[data-qa="boolean-display-value"]').text()).toBe("Yes");
        });

        scopedIt("shows the true word without options", () => {
            useWidget.mockReturnValue({
                state: reactive({ formModelName: "fm", combinedValue: true, combinedName: "submitted" }),
            });

            const wrapper = mount(WidgetBooleanReadOnly, mountOptions);

            expect(wrapper.get('[data-qa="boolean-display-value"]').text()).toBe("Yes");
        });
    });
});
