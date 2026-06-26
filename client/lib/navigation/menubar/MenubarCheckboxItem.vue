<script setup>
import "@vueda/theme/vueda-tailwind/navigation/MenubarCheckboxItem.theme.js";
import { useForwardPropsEmits } from "@vueda/use/useForwardPropsEmits.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { MenubarCheckboxItem, MenubarItemIndicator } from "reka-ui";

/**
 * A checkable item within a menubar menu.
 */
defineOptions({});

const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
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

const delegatedProps = reactiveOmit(props, "iconOverride", "class", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("MenubarCheckboxItem", props);
const icon = useIcons("MenubarCheckboxItem", props);
</script>

<template>
    <MenubarCheckboxItem
        data-slot="menubar-checkbox-item"
        v-bind="forwarded"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <span :class="theme('indicator')">
            <MenubarItemIndicator>
                <component
                    :is="icon('check').component"
                    v-if="icon('check')"
                    v-bind="icon('check').props"
                    aria-hidden="true"
                />
            </MenubarItemIndicator>
        </span>
        <slot />
    </MenubarCheckboxItem>
</template>
