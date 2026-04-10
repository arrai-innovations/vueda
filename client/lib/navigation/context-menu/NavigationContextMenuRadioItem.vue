<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ContextMenuItemIndicator, ContextMenuRadioItem, useForwardPropsEmits } from "reka-ui";

/**
 * A radio item within a context menu radio group.
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
    /** When true, prevents the user from interacting with the item. */
    disabled: { type: Boolean, default: undefined },
    /** Optional text used for typeahead purposes. */
    textValue: { type: String, default: undefined },
    /** The unique value of this radio item. */
    value: { type: [String, Number, Boolean, Object], required: true },
});

const emits = defineEmits(["select"]);

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("NavigationContextMenuRadioItem", props);
</script>

<template>
    <ContextMenuRadioItem data-slot="context-menu-radio-item" v-bind="forwarded" :class="[theme('root'), props.class]">
        <span :class="theme('indicator')">
            <ContextMenuItemIndicator>
                <slot name="indicator">•</slot>
            </ContextMenuItemIndicator>
        </span>
        <slot />
    </ContextMenuRadioItem>
</template>
