<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { TagsInputRoot, useForwardPropsEmits } from "reka-ui";

/**
 * Root of a tags input control allowing users to add and remove tag values.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The controlled value of the tags input. Can be bound with v-model. */
    modelValue: { type: Array, default: undefined },
    /** The initial value when uncontrolled. */
    defaultValue: { type: Array, default: undefined },
    /** When true, allow adding tags on paste. Works with the delimiter prop. */
    addOnPaste: { type: Boolean, default: undefined },
    /** When true, allow adding tags on Tab keydown. */
    addOnTab: { type: Boolean, default: undefined },
    /** When true, allow adding tags on input blur. */
    addOnBlur: { type: Boolean, default: undefined },
    /** When true, allow duplicated tags. */
    duplicate: { type: Boolean, default: undefined },
    /** When true, prevents user interaction. */
    disabled: { type: Boolean, default: undefined },
    /** The character or regular expression to trigger addition of a new tag. Also used to split tags on paste. */
    delimiter: { type: [String, Object], default: undefined },
    /** The reading direction of the tags input. */
    dir: { type: String, default: undefined },
    /** Maximum number of tags. */
    max: { type: Number, default: undefined },
    /** The name submitted with the form. */
    name: { type: String, default: undefined },
    /** When true, the field is required. */
    required: { type: Boolean, default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});
const emits = defineEmits(["update:modelValue", "invalid", "addTag", "removeTag"]);

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const forwarded = useForwardPropsEmits(delegatedProps, emits);

const theme = useTheme("ControlTagsInput", props);
</script>

<template>
    <TagsInputRoot v-slot="slotProps" data-slot="tags-input" v-bind="forwarded" :class="[theme('root'), props.class]">
        <slot v-bind="slotProps" />
    </TagsInputRoot>
</template>
