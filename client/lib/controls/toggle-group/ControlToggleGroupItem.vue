<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ToggleGroupItem, useForwardProps } from "reka-ui";
import { computed, inject, reactive } from "vue";

/**
 * An individual toggle button inside a ToggleGroup.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** @type {'default' | 'outline'} */
    variant: { type: String, default: undefined },
    /** @type {'default' | 'sm' | 'lg'} */
    size: { type: String, default: undefined },
    /** The value of this item. */
    value: { type: String, default: undefined },
    /** Whether this item is disabled. */
    disabled: { type: Boolean, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const context = inject("toggleGroup");

const delegatedProps = reactiveOmit(props, "class", "size", "variant", "themeOverride");
const forwardedProps = useForwardProps(delegatedProps);

const theme = useTheme(
    "ControlToggleGroupItem",
    props,
    reactive({
        variant: computed(() => context?.variant || props.variant),
        size: computed(() => context?.size || props.size),
    }),
);
</script>

<template>
    <ToggleGroupItem
        v-slot="slotProps"
        data-slot="toggle-group-item"
        :data-variant="context?.variant || variant"
        :data-size="context?.size || size"
        :data-spacing="context?.spacing"
        v-bind="forwardedProps"
        :class="[theme('root'), props.class]"
    >
        <slot v-bind="slotProps" />
    </ToggleGroupItem>
</template>
