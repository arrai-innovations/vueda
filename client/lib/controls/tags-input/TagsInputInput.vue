<script setup>
import "@vueda/theme/vueda-tailwind/controls/TagsInputInput.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { TagsInputInput, useForwardProps } from "reka-ui";

/**
 * The text input field within TagsInput where users type new tags.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** Placeholder text shown when the input is empty. */
    placeholder: { type: String, default: undefined },
    /** When true, focuses the input on mount. */
    autoFocus: { type: Boolean, default: undefined },
    /** Maximum number of characters allowed. */
    maxLength: { type: Number, default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const forwardedProps = useForwardProps(delegatedProps);

const theme = useTheme("TagsInputInput", props);
</script>

<template>
    <TagsInputInput
        data-slot="tags-input-input"
        v-bind="forwardedProps"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    />
</template>
