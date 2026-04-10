<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ContextMenuRadioGroup, useForwardPropsEmits } from "reka-ui";

/**
 * Groups radio items within a context menu.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
    /** The value of the selected radio item. */
    modelValue: { type: [String, Number, Boolean, Object], default: undefined },
});

const emits = defineEmits(["update:modelValue"]);

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("NavigationContextMenuRadioGroup", props);
</script>

<template>
    <ContextMenuRadioGroup
        data-slot="context-menu-radio-group"
        v-bind="forwarded"
        :class="[theme('root'), props.class]"
    >
        <slot />
    </ContextMenuRadioGroup>
</template>
