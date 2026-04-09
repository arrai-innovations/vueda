<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { DialogDescription } from "reka-ui";

/**
 * A description rendered inside a Sheet to provide context to screen readers.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const theme = useTheme("ShellSheetDescription", props);
</script>

<template>
    <DialogDescription data-slot="sheet-description" :class="[theme('root'), props.class]" v-bind="delegatedProps">
        <slot />
    </DialogDescription>
</template>
