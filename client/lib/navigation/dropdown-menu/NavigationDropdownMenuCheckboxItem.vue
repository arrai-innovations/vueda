<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { DropdownMenuCheckboxItem, DropdownMenuItemIndicator, useForwardPropsEmits } from "reka-ui";

/**
 * A checkable item within a dropdown menu.
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
    /** The controlled checked state of the item. */
    modelValue: { type: [Boolean, String], default: undefined },
});

const emits = defineEmits(["select", "update:modelValue"]);

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("NavigationDropdownMenuCheckboxItem", props);
</script>

<template>
    <DropdownMenuCheckboxItem
        data-slot="dropdown-menu-checkbox-item"
        v-bind="forwarded"
        :class="[theme('root'), props.class]"
    >
        <span class="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
            <DropdownMenuItemIndicator>
                <slot name="check-icon">✓</slot>
            </DropdownMenuItemIndicator>
        </span>
        <slot />
    </DropdownMenuCheckboxItem>
</template>
