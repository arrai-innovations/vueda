<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ComboboxItem, useForwardPropsEmits } from "reka-ui";

/**
 * A selectable option within ControlComboboxList.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The value submitted with the form. */
    value: { type: [String, Number, Boolean, Object], required: true },
    /** When true, prevents user interaction. */
    disabled: { type: Boolean, default: undefined },
    /** Plain-text representation used for autocomplete matching. */
    textValue: { type: String, default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});
const emits = defineEmits(["select"]);

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const forwarded = useForwardPropsEmits(delegatedProps, emits);

const theme = useTheme("ControlComboboxItem", props);
</script>

<template>
    <ComboboxItem data-slot="combobox-item" v-bind="forwarded" :class="[theme('root'), props.class]">
        <slot />
    </ComboboxItem>
</template>
