<script setup>
import "@vueda/theme/vueda-tailwind/display/DurationDisplay.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { normalizeDuration } from "@vueda/utils/duration.js";
import { computed } from "vue";

/**
 * Presents a duration in named units rather than its stored literal, so a read view says
 * "730 days" instead of `730 00:00:00`. A null or absent value renders the same dash
 * {@link DateTimeDisplay} uses for an empty date.
 *
 * Both serialized shapes are accepted: the Django duration string DRF's `DurationField`
 * sends (`[-]D HH:MM:SS[.ffffff]`) and the number of seconds VUEDA's
 * `DurationSecondsField` sends. Units that hold zero are left out, so a value only names
 * the parts it has. A duration of zero names the smallest unit ("0 seconds"), which is a
 * recorded value and not the same as no value at all. Sub-second precision is dropped.
 */
defineOptions({
    inheritAttrs: false,
});

const UNITS = [
    { key: "days", one: "day", many: "days", short: "d" },
    { key: "hours", one: "hour", many: "hours", short: "h" },
    { key: "minutes", one: "minute", many: "minutes", short: "m" },
    { key: "seconds", one: "second", many: "seconds", short: "s" },
];

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** The value to present, as a Django duration string or a number of seconds. `null`, `undefined`, and `""` render the dash. */
    value: {
        type: [String, Number],
        default: undefined,
    },
    /** `"long"` names each unit in full ("2 hours, 30 minutes"); `"short"` abbreviates it ("2h 30m"). */
    format: {
        type: String,
        default: "long",
        validator: (value) => ["long", "short"].includes(value),
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

const theme = useTheme("DurationDisplay", props);

const parts = computed(() => normalizeDuration(props.value));

const label = computed(() => {
    if (!parts.value) {
        return "";
    }
    const { negative, ...units } = parts.value;
    const shown = UNITS.filter((unit) => units[unit.key] > 0);
    // Every unit is zero, so the value is a recorded duration of no length rather than an
    // absent one. Name the smallest unit so it still reads as a measurement.
    const named = shown.length ? shown : [UNITS[UNITS.length - 1]];
    const words = named.map((unit) => {
        const count = units[unit.key];
        return props.format === "short" ? `${count}${unit.short}` : `${count} ${count === 1 ? unit.one : unit.many}`;
    });
    return `${negative ? "-" : ""}${words.join(props.format === "short" ? " " : ", ")}`;
});
</script>

<template>
    <component :is="inline ? 'span' : 'div'" v-bind="$attrs" :class="[theme('root'), props.class]">
        <span v-if="!parts" :class="theme('dash')" data-qa="duration-display-dash">-</span>
        <span v-else :class="theme('value')" data-qa="duration-display-value">{{ label }}</span>
    </component>
</template>
