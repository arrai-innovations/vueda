<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { TagsInputItemText, useForwardProps } from "reka-ui";

/**
 * Displays the text content of a ControlTagsInputItem tag.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const forwardedProps = useForwardProps(delegatedProps);

const theme = useTheme("ControlTagsInputItemText", props);
</script>

<template>
    <TagsInputItemText data-slot="tags-input-item-text" v-bind="forwardedProps" :class="[theme('root'), props.class]">
        <slot />
    </TagsInputItemText>
</template>
