<script setup>
import EmailDisplay from "@vueda/display/email-display/EmailDisplay.vue";
import ColumnText from "@vueda/objects-grid/ColumnText.vue";
import { fieldChoiceOptions } from "@vueda/utils/choiceLabels.js";
import { computed } from "vue";

/**
 * Email list column adapter. Wraps {@link EmailDisplay} in its inline form, binding the cell's raw
 * `value`, so a cell shows an email address as a `mailto:` link.
 *
 * Two values keep the {@link ColumnText} rendering. An array, from a many-valued field, has no
 * single link to show. A field with static choices shows each stored value's label, which
 * `ColumnText` looks up.
 *
 * The cell holds its own link, so `ViewList` does not wrap this adapter in the record's
 * detail link.
 *
 * Receives the ObjectsGrid `value` slot props and reads `value` and `field`.
 * `inheritAttrs` is disabled so the remaining cell context props (`formatted`, `obj`, etc.)
 * are not leaked as DOM attributes onto the EmailDisplay root. `ColumnText` receives them all.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    /** Raw cell value: the stored address. A many-valued field supplies an array. */
    value: {
        type: [String, Array],
        default: undefined,
    },
    /** The column's field descriptor. Its `displayChoices` or `choices` select the text rendering. */
    field: {
        type: Object,
        default: undefined,
    },
});

const showsText = computed(() => Array.isArray(props.value) || fieldChoiceOptions(props.field).length > 0);
</script>
<template>
    <column-text v-if="showsText" v-bind="$attrs" :field="field" />
    <email-display v-else :value="value" inline />
</template>
