<script setup>
import "@vueda/theme/vueda-tailwind/controls/ComboboxInput.theme.js";
import { useForwardPropsEmits } from "@vueda/use/useForwardPropsEmits.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ComboboxInput } from "reka-ui";

/**
 * The search input for Combobox, rendered with a search icon.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The controlled search value. Can be bound with v-model. */
    modelValue: { type: String, default: undefined },
    /** Whether to focus the input on mount. */
    autoFocus: { type: Boolean, default: undefined },
    /** When true, prevents user interaction. */
    disabled: { type: Boolean, default: undefined },
    /** Function that returns the display string for the selected value. */
    displayValue: { type: Function, default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});
const emits = defineEmits({
    /** Emitted when the value changes. */
    "update:modelValue": null,
});

const delegatedProps = reactiveOmit(props, "iconOverride", "class", "themeOverride");

const forwarded = useForwardPropsEmits(delegatedProps, emits);

const theme = useTheme("ComboboxInput", props);
const icon = useIcons("ComboboxInput", props);
</script>

<template>
    <div data-slot="combobox-input-wrapper" class="flex h-9 items-center gap-2 border-b px-3">
        <component
            :is="icon('search').component"
            v-if="icon('search')"
            v-bind="icon('search').props"
            aria-hidden="true"
            class="size-4 shrink-0 text-center leading-4 opacity-50 select-none"
        />
        <span v-else aria-hidden="true" class="size-4 shrink-0 text-center leading-4 opacity-50 select-none">⚲</span>
        <ComboboxInput
            data-slot="combobox-input"
            :class="[theme('root'), props.class]"
            :style="theme.hideStyle?.value"
            v-bind="{ ...$attrs, ...forwarded }"
        >
            <slot />
        </ComboboxInput>
    </div>
</template>
