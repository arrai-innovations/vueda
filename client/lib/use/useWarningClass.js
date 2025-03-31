// useWarningClass.js
import { getPrimeVuePreset } from "@vueda/theme/register.js";
import { usePassThrough } from "primevue/passthrough";
import { computed, ref, watchEffect } from "vue";

export const PASSTHROUGH_OPTION_PROPS = {
    pt: {
        type: Object,
        /* v8 ignore next 1 */
        default: () => ({}),
    },
    mergeSections: {
        type: Boolean,
        default: true,
    },
    mergeProps: {
        type: Boolean,
        default: true,
    },
};

/**
 * A composable function for adding a warning class using primevue's passthrough, and continuing to support outside
 *  passthroughs.
 *
 * @param {import("vue").PropType<PassthroughOptions>} props - The props for the passthrough.
 * @param {import("@vueda/use/useWidget.js").WidgetState} widgetState - The widget context.
 */
export function useWarningClass(props, widgetState) {
    const basePreset = getPrimeVuePreset();
    const basePt = usePassThrough(
        basePreset,
        {
            root: {
                class: computed(() => ({
                    "p-warning": widgetState.validationState.warning,
                })),
            },
        },
        {
            mergeSections: true,
            mergeProps: true,
        },
    );

    const effectivePt = ref(basePt);

    watchEffect(() => {
        if (props.pt && Object.keys(props.pt).length) {
            effectivePt.value = usePassThrough(basePt, props.pt, {
                mergeSections: props.mergeSections,
                mergeProps: props.mergeProps,
            });
        } else {
            effectivePt.value = basePt;
        }
    });

    return effectivePt;
}
