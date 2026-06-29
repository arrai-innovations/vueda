<script setup>
import "@vueda/theme/vueda-tailwind/navigation/ContextMenuRadioItem.theme.js";
import { useForwardPropsEmits } from "@vueda/use/useForwardPropsEmits.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ContextMenuItemIndicator, ContextMenuRadioItem } from "reka-ui";

/**
 * A radio item within a context menu radio group.
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
    /** The unique value of this radio item. */
    value: { type: [String, Number, Boolean, Object], required: true },
});

const emits = defineEmits({
    /** Emitted when an item is selected. */
    select: null,
});

const delegatedProps = reactiveOmit(props, "iconOverride", "class", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("ContextMenuRadioItem", props);
const icon = useIcons("ContextMenuRadioItem", props);
</script>

<template>
    <ContextMenuRadioItem
        data-slot="context-menu-radio-item"
        v-bind="forwarded"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <span :class="theme('indicator')">
            <ContextMenuItemIndicator>
                <slot name="indicator">
                    <component
                        :is="icon('circle').component"
                        v-if="icon('circle')"
                        v-bind="icon('circle').props"
                        aria-hidden="true"
                    />
                </slot>
            </ContextMenuItemIndicator>
        </span>
        <slot />
    </ContextMenuRadioItem>
</template>
