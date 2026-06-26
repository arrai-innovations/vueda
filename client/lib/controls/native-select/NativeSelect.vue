<script setup>
import "@vueda/theme/vueda-tailwind/controls/NativeSelect.theme.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit, useVModel } from "@vueuse/core";

/**
 * A styled native `<select>` element with a custom chevron icon overlay.
 * Supports v-model binding and forwards all extra attributes to the underlying select.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
    ...THEME_OVERRIDE_PROPS,
    /** The current value of the select. */
    modelValue: { type: [String, Number, Boolean, Array, Object], default: undefined },
    /** Additional CSS classes to apply to the select element. */
    class: { type: [String, Array, Object], default: undefined },
});

const emit = defineEmits({
    /** Emitted when the value changes. */
    "update:modelValue": null,
});

const modelValue = useVModel(props, "modelValue", emit, {
    passive: true,
    defaultValue: "",
});

const delegatedProps = reactiveOmit(props, "iconOverride", "class", "themeOverride");

const theme = useTheme("NativeSelect", props);
const icon = useIcons("NativeSelect", props);
</script>

<template>
    <div class="group/native-select relative w-fit has-[select:disabled]:opacity-50" data-slot="native-select-wrapper">
        <select
            v-bind="{ ...$attrs, ...delegatedProps }"
            v-model="modelValue"
            data-slot="native-select"
            :class="[theme('root'), props.class]"
            :style="theme.hideStyle?.value"
        >
            <slot />
        </select>
        <!-- Replaces the dropdown chevron icon; receives no slot props. -->
        <slot name="icon">
            <span
                class="text-muted-foreground pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-center leading-4 opacity-50"
                aria-hidden="true"
                data-slot="native-select-icon"
            >
                <component
                    :is="icon('caretDown').component"
                    v-if="icon('caretDown')"
                    v-bind="icon('caretDown').props"
                />
            </span>
        </slot>
    </div>
</template>
