<script setup>
import "@vueda/theme/vueda-tailwind/shell/AlertDialogTitle.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { AlertDialogTitle } from "reka-ui";

/**
 * The title inside an AlertDialog.
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
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const theme = useTheme("AlertDialogTitle", props);
</script>

<template>
    <AlertDialogTitle
        data-slot="alert-dialog-title"
        v-bind="delegatedProps"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <slot />
    </AlertDialogTitle>
</template>
