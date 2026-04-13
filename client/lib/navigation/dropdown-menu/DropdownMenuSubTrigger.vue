<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { DropdownMenuSubTrigger, useForwardProps } from "reka-ui";

/**
 * The trigger that opens a dropdown submenu.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
    /** When true, prevents the user from interacting with the trigger. */
    disabled: { type: Boolean, default: undefined },
    /** Optional text used for typeahead purposes. */
    textValue: { type: String, default: undefined },
    /** When true, adds left padding to align with items that have an icon. */
    inset: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride", "inset");
const forwardedProps = useForwardProps(delegatedProps);
const theme = useTheme("DropdownMenuSubTrigger", props);
</script>

<template>
    <DropdownMenuSubTrigger
        data-slot="dropdown-menu-sub-trigger"
        :data-inset="inset ? '' : undefined"
        v-bind="forwardedProps"
        :class="[theme('root'), props.class]"
    >
        <slot />
        <span :class="theme('iconWrapper')" aria-hidden="true"><slot name="icon">›</slot></span>
    </DropdownMenuSubTrigger>
</template>
