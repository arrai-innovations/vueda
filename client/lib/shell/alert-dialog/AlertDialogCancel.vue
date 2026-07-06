<script setup>
import Button from "@vueda/controls/button/Button.vue";
import "@vueda/theme/vueda-tailwind/shell/AlertDialogCancel.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { AlertDialogCancel } from "reka-ui";

/**
 * The cancel button inside an AlertDialog, rendered through Button while preserving AlertDialog cancel behavior.
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
    /**
     * Color axis passed to the underlying Button.
     * @type {'neutral' | 'primary' | 'destructive'}
     */
    tone: { type: String, default: "neutral" },
    /**
     * Structure axis passed to the underlying Button.
     * @type {'fill' | 'outline' | 'ghost' | 'link'}
     */
    emphasis: { type: String, default: "ghost" },
    /**
     * Size axis passed to the underlying Button.
     * @type {'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg'}
     */
    size: { type: String, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride", "as", "asChild", "tone", "emphasis", "size");
const theme = useTheme("AlertDialogCancel", props);
</script>

<template>
    <AlertDialogCancel v-bind="delegatedProps" as-child>
        <Button
            :as="props.as"
            :as-child="props.asChild"
            :tone="props.tone"
            :emphasis="props.emphasis"
            :size="props.size"
            :class="[theme('root'), props.class]"
            :style="theme.hideStyle?.value"
        >
            <slot />
        </Button>
    </AlertDialogCancel>
</template>
