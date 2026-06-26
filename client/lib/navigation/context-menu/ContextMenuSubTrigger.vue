<script setup>
import "@vueda/theme/vueda-tailwind/navigation/ContextMenuSubTrigger.theme.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ContextMenuSubTrigger, useForwardProps } from "reka-ui";

/**
 * The trigger that opens a context submenu.
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
    /** When true, prevents the user from interacting with the trigger. */
    disabled: { type: Boolean, default: undefined },
    /** Optional text used for typeahead purposes. */
    textValue: { type: String, default: undefined },
    /** When true, adds left padding to align with items that have an icon. */
    inset: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "iconOverride", "class", "themeOverride", "inset");
const forwardedProps = useForwardProps(delegatedProps);
const theme = useTheme("ContextMenuSubTrigger", props);
const icon = useIcons("ContextMenuSubTrigger", props);
</script>

<template>
    <ContextMenuSubTrigger
        data-slot="context-menu-sub-trigger"
        :data-inset="inset ? '' : undefined"
        v-bind="forwardedProps"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <slot />
        <span :class="theme('iconWrapper')" aria-hidden="true"
            ><slot name="icon">
                <component
                    :is="icon('chevronRight').component"
                    v-if="icon('chevronRight')"
                    v-bind="icon('chevronRight').props"
                /> </slot
        ></span>
    </ContextMenuSubTrigger>
</template>
