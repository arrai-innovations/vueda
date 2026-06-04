<script setup>
import "@vueda/theme/vueda-tailwind/navigation/MenubarRadioItem.theme.js";
import { useForwardPropsEmits } from "@vueda/use/useForwardPropsEmits.js";
import { useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { MenubarItemIndicator, MenubarRadioItem } from "reka-ui";

/**
 * A radio item within a menubar menu radio group.
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
    /** The unique value of this radio item. */
    value: { type: [String, Number, Boolean, Object], required: true },
});

const emits = defineEmits({
    /** Emitted when an item is selected. */
    select: null,
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("MenubarRadioItem", props);
const icon = useIcons("MenubarRadioItem");
</script>

<template>
    <MenubarRadioItem
        data-slot="menubar-radio-item"
        v-bind="forwarded"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <span :class="theme('indicator')">
            <MenubarItemIndicator>
                <slot name="indicator">
                    <component
                        :is="icon('circle').component"
                        v-if="icon('circle')"
                        v-bind="icon('circle').props"
                        aria-hidden="true"
                    />
                </slot>
            </MenubarItemIndicator>
        </span>
        <slot />
    </MenubarRadioItem>
</template>
