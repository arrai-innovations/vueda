<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { MenubarRoot, useForwardPropsEmits } from "reka-ui";

/**
 * A horizontal menu bar containing a set of menus.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The controlled value of the open menu. */
    modelValue: { type: String, default: undefined },
    /** The value of the menu that should be open when initially rendered. */
    defaultValue: { type: String, default: undefined },
    /** The reading direction of the menubar. */
    dir: { type: String, default: undefined },
    /** When true, keyboard navigation will loop from last item to first, and vice versa. */
    loop: { type: Boolean, default: undefined },
});

const emits = defineEmits({
    /** Emitted when the value changes. */
    "update:modelValue": null,
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("NavigationMenubar", props);
</script>

<template>
    <MenubarRoot v-slot="slotProps" data-slot="menubar" v-bind="forwarded" :class="[theme('root'), props.class]">
        <slot v-bind="slotProps" />
    </MenubarRoot>
</template>
