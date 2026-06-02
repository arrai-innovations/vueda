<script setup>
import { useForwardPropsEmits } from "@vueda/use/useForwardPropsEmits.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ToggleGroupRoot } from "reka-ui";
import { provide } from "vue";

/**
 * A group of toggle buttons that share variant and size context.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /**
     * Visual style variant.
     * @type {'default' | 'outline'}
     */
    variant: { type: String, default: undefined },
    /**
     * Size variant.
     * @type {'default' | 'sm' | 'lg'}
     */
    size: { type: String, default: undefined },
    /** The gap spacing between items (0 = flush/no-gap). */
    spacing: { type: Number, default: 0 },
    /** The selection type: 'single' or 'multiple'. */
    type: { type: String, default: undefined },
    /** The controlled value. */
    modelValue: { type: [String, Array], default: undefined },
    /** The default value. */
    defaultValue: { type: [String, Array], default: undefined },
    /** Whether the group is disabled. */
    disabled: { type: Boolean, default: undefined },
    /** The reading direction. */
    dir: { type: String, default: undefined },
    /** Whether to loop keyboard navigation. */
    loop: { type: Boolean, default: undefined },
    /** The orientation. */
    orientation: { type: String, default: undefined },
    /** Whether to allow deselection of a single value. */
    rovingFocus: { type: Boolean, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const emits = defineEmits({
    /** Emitted when the value changes. */
    "update:modelValue": null,
});

provide("toggleGroup", {
    variant: props.variant,
    size: props.size,
    spacing: props.spacing,
});

const delegatedProps = reactiveOmit(props, "class", "size", "variant", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);

const theme = useTheme("ToggleGroup", props);
</script>

<template>
    <ToggleGroupRoot
        v-slot="slotProps"
        data-slot="toggle-group"
        :data-size="size"
        :data-variant="variant"
        :data-spacing="spacing"
        :style="[{ '--gap': spacing }, theme.hideStyle?.value]"
        v-bind="forwarded"
        :class="[theme('root'), props.class]"
    >
        <slot v-bind="slotProps" />
    </ToggleGroupRoot>
</template>
