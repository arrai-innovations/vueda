<script setup>
import "@vueda/theme/vueda-tailwind/display/JsonDisplay.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed } from "vue";

/**
 * Presents a `JSON` value as formatted text. The block form indents it over several
 * lines, so nesting is readable rather than one long line; the inline form keeps it
 * compact for a table cell and truncates it past `maxLength`. A null or absent value
 * renders the same dash {@link DateTimeDisplay} uses for an empty date.
 *
 * An empty object or array is a recorded value, not an absent one, so it renders as `{}`
 * or `[]`. The empty string is the `JSON` string scalar here and renders as `""`, unlike
 * {@link BooleanDisplay} and {@link DurationDisplay}, whose serializers send `""` to mean
 * a blank field. A value that cannot be serialized (a circular structure) falls back to
 * plain coercion rather than rendering nothing.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** The value to present. `null` and `undefined` render the dash. */
    value: {
        type: [String, Number, Boolean, Object, Array],
        default: undefined,
    },
    /** Renders compact, on one line, for use inside a table cell or an existing text row. */
    inline: {
        type: Boolean,
        default: false,
    },
    /** Spaces per nesting level in the block form. */
    indent: {
        type: Number,
        default: 2,
    },
    /** Character cap for the inline form, past which the text is truncated. `0` removes the cap. The block form is never capped: a read view exists to show the whole value. */
    maxLength: {
        type: Number,
        default: 200,
    },
    /**
     * Additional CSS classes applied to the root.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("JsonDisplay", props);

const isEmpty = computed(() => props.value === null || props.value === undefined);

const text = computed(() => {
    if (isEmpty.value) {
        return "";
    }
    let json;
    try {
        json = JSON.stringify(props.value, null, props.inline ? 0 : props.indent);
    } catch {
        // Circular or otherwise non-serializable.
        return String(props.value);
    }
    if (json === undefined) {
        return String(props.value);
    }
    if (!props.inline || props.maxLength <= 0 || json.length <= props.maxLength) {
        return json;
    }
    return `${json.slice(0, props.maxLength - 1)}…`;
});
</script>

<template>
    <component
        :is="inline ? 'span' : 'pre'"
        v-bind="$attrs"
        :class="[theme('root'), props.class]"
        :data-inline="inline || undefined"
    >
        <span v-if="isEmpty" :class="theme('dash')" data-qa="json-display-dash">-</span>
        <span v-else :class="theme('value')" data-qa="json-display-value">{{ text }}</span>
    </component>
</template>
