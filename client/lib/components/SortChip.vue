<script setup>
import "@vueda/theme/vueda-tailwind/display/SortChip.theme.js";
import { useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import { parseSortField } from "@vueda/utils/sortedFields.js";
import { computed } from "vue";

/**
 * Renders a single active sort field as a removable pill. The label segment
 * shows the field's priority ordinal, its human label, and a direction glyph;
 * clicking it toggles ascending/descending. The trailing segment removes the
 * field from the sort. This is the sort-side counterpart to
 * {@api vue:component:FilterChip}: neutral-tinted, since ordering is not a
 * predicate and the accent is reserved for filters, actions, and selection.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Sort entry to render, e.g. `"updated"` (ascending) or `"-updated"` (descending). */
    field: {
        type: String,
        required: true,
    },
    /** Zero-based position in the sort order; the displayed priority ordinal is `index + 1`. */
    index: {
        type: Number,
        required: true,
    },
    /** Map of field name to field metadata (e.g. `{ label }`) used to derive the human label. */
    fieldDetails: {
        type: Object,
        default: () => ({}),
    },
});
const emit = defineEmits([
    /** Emitted when the label segment is clicked to flip this field's direction. */
    "toggle",
    /** Emitted when the remove segment is clicked. */
    "remove",
]);

const parsed = computed(() => parseSortField(props.field));
const base = computed(() => parsed.value.base);
const descending = computed(() => parsed.value.descending);
const label = computed(() => props.fieldDetails?.[base.value]?.label || memoizedStartCase(base.value));

const theme = useTheme("SortChip", props);
const icon = useIcons("SortChip");
</script>

<template>
    <span :class="theme('root')" data-qa="sort-chip">
        <button
            type="button"
            :class="theme('label')"
            :aria-label="`Sort ${label} ${descending ? 'ascending' : 'descending'} (currently ${
                descending ? 'descending' : 'ascending'
            })`"
            data-qa="sort-chip-toggle"
            @click="emit('toggle')"
        >
            <span :class="theme('ordinal')" data-qa="sort-chip-ordinal">{{ index + 1 }}</span>
            <span :class="theme('field')">{{ label }}</span>
            <!-- @slot Override the direction glyph. Receives `field`, `base`, `descending`, and `ascending`. -->
            <slot name="sort-icon" :field="field" :base="base" :descending="descending" :ascending="!descending">
                <component
                    :is="icon('sortDown').component"
                    v-if="icon('sortDown')"
                    v-bind="icon('sortDown').props"
                    :class="[theme('direction'), { 'rotate-180': !descending }]"
                    aria-hidden="true"
                />
                <span v-else :class="theme('direction')" aria-hidden="true">{{ descending ? "↓" : "↑" }}</span>
            </slot>
        </button>
        <span :class="theme('divider')" aria-hidden="true" />
        <button
            type="button"
            :class="theme('remove')"
            :aria-label="`Remove sort: ${label}`"
            data-qa="sort-chip-remove"
            @click="emit('remove')"
        >
            <component
                :is="icon('close').component"
                v-if="icon('close')"
                v-bind="icon('close').props"
                aria-hidden="true"
            />
            <span v-else aria-hidden="true">&times;</span>
        </button>
    </span>
</template>
