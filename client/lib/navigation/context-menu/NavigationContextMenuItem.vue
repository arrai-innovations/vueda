<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ContextMenuItem, useForwardPropsEmits } from "reka-ui";

/**
 * An individual action item within a context menu.
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
    /** When true, adds left padding to align with items that have an icon. */
    inset: { type: Boolean, default: undefined },
    /** The visual style variant of the item. */
    variant: { type: String, default: "default" },
});

const emits = defineEmits(["select"]);

const delegatedProps = reactiveOmit(props, "class", "themeOverride", "inset", "variant");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("NavigationContextMenuItem", props);
</script>

<template>
    <ContextMenuItem
        data-slot="context-menu-item"
        :data-inset="inset ? '' : undefined"
        :data-variant="variant"
        v-bind="forwarded"
        :class="[theme('root'), props.class]"
    >
        <slot />
    </ContextMenuItem>
</template>
