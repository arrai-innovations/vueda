<script setup>
import "@vueda/theme/vueda-tailwind/display/BooleanDisplay.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed } from "vue";

/**
 * Presents a boolean as a word rather than its stored literal, so a read view says "Yes"
 * instead of `true`. A null or absent value renders the same dash {@link DateTimeDisplay}
 * uses for an empty date, which is the third state a `NullBooleanField` can hold.
 *
 * A serializer that sends `1`, `0`, `"true"`, or `"false"` still lands on a word; only
 * null, undefined, and the empty string read as "no value recorded" and take the dash.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** The value to present. `null`, `undefined`, and `""` render the dash. */
    value: {
        // `String` leads on purpose: Vue casts an empty-string prop to `true` when
        // `Boolean` comes first, which would turn a blank value into a "Yes".
        type: [String, Boolean, Number],
        default: undefined,
    },
    /** Word shown for a true value. */
    trueLabel: {
        type: String,
        default: "Yes",
    },
    /** Word shown for a false value. */
    falseLabel: {
        type: String,
        default: "No",
    },
    /** Renders without a wrapping element, for use inside an existing text row. */
    inline: {
        type: Boolean,
        default: false,
    },
    /**
     * Additional CSS classes applied to the root.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("BooleanDisplay", props);

const isEmpty = computed(() => props.value === null || props.value === undefined || props.value === "");

// "false" arrives as a string from a form value or a query parameter, where Boolean() would
// read it as true.
const asBoolean = computed(() => (props.value === "false" ? false : Boolean(props.value)));

const label = computed(() => (asBoolean.value ? props.trueLabel : props.falseLabel));
</script>

<template>
    <component :is="inline ? 'span' : 'div'" v-bind="$attrs" :class="[theme('root'), props.class]">
        <span v-if="isEmpty" :class="theme('dash')" data-qa="boolean-display-dash">-</span>
        <span v-else :class="theme('value')" data-qa="boolean-display-value">{{ label }}</span>
    </component>
</template>
