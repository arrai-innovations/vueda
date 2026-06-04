<script setup>
import "@vueda/theme/vueda-tailwind/navigation/ContextMenuCheckboxItem.theme.js";
import { useForwardPropsEmits } from "@vueda/use/useForwardPropsEmits.js";
import { useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ContextMenuCheckboxItem, ContextMenuItemIndicator } from "reka-ui";

/**
 * A checkable item within a context menu.
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
    /** When true, prevents the user from interacting with the item. */
    disabled: { type: Boolean, default: undefined },
    /** Optional text used for typeahead purposes. */
    textValue: { type: String, default: undefined },
    /** The controlled checked state of the item. */
    modelValue: { type: [Boolean, String], default: undefined },
});

const emits = defineEmits({
    /** Emitted when an item is selected. */
    select: null,
    /** Emitted when the value changes. */
    "update:modelValue": null,
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("ContextMenuCheckboxItem", props);
const icon = useIcons("ContextMenuCheckboxItem");
</script>

<template>
    <ContextMenuCheckboxItem
        data-slot="context-menu-checkbox-item"
        v-bind="forwarded"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <span :class="theme('indicator')">
            <ContextMenuItemIndicator>
                <slot name="check-icon">
                    <component
                        :is="icon('check').component"
                        v-if="icon('check')"
                        v-bind="icon('check').props"
                        aria-hidden="true"
                    />
                </slot>
            </ContextMenuItemIndicator>
        </span>
        <slot />
    </ContextMenuCheckboxItem>
</template>
