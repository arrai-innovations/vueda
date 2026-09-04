<script setup>
import "@vueda/theme/vueda-tailwind/display/SortChip.theme.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import { parseSortField } from "@vueda/utils/sortedFields.js";
import { computed, reactive, toRef } from "vue";

/**
 * Renders a single active sort field as a removable pill. A leading priority
 * ordinal (shown only when `showOrdinal` is set) doubles as the drag handle for
 * reordering within the host strip. The label segment shows the field's human
 * label and a direction glyph; clicking it toggles ascending/descending. The
 * trailing segment removes the field from the sort, and is present only when
 * `removable` is set. This is the sort-side
 * counterpart to {@api vue:component:FilterChip}: neutral-tinted, since ordering
 * is not a predicate and the accent is reserved for filters, actions, and selection.
 */
defineOptions({});

const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
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
    /**
     * Show the priority ordinal. The ordinal doubles as the drag handle, so it is
     * shown only when reordering is meaningful (more than one active sort field).
     * The host strip ({@api vue:component:SortGroup}) passes `false` for a lone chip.
     */
    showOrdinal: {
        type: Boolean,
        default: true,
    },
    /**
     * Show the remove ("x") control. The host strip
     * ({@api vue:component:SortGroup}) passes `false` for a lone chip, so the
     * last active sort field can't be removed from the chip itself — clearing it
     * would leave the strip with no chips to read the sort from, while the server
     * would still sort by its own default. Reset sort is the way back instead.
     */
    removable: {
        type: Boolean,
        default: true,
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

const theme = useTheme("SortChip", props, reactive({ showOrdinal: toRef(props, "showOrdinal") }));
const icon = useIcons("SortChip", props);
</script>

<template>
    <span :class="theme('root')" data-qa="sort-chip">
        <!-- Drag handle: a visible grip glyph plus the priority ordinal. Shown only
             when reordering is meaningful (more than one sort), so a lone chip has
             nothing to grab. The grip is the touch-discoverable affordance; the
             whole segment carries `.drag-handle` so it is the reorder grip. -->
        <span
            v-if="showOrdinal"
            :class="theme('handle')"
            data-qa="sort-chip-handle"
            :aria-label="`Priority ${index + 1}, drag to reorder`"
        >
            <!-- @slot Override the drag-handle glyph. -->
            <slot name="drag-handle">
                <component
                    :is="icon('gripVertical').component"
                    v-if="icon('gripVertical')"
                    v-bind="icon('gripVertical').props"
                    :class="theme('grip')"
                    aria-hidden="true"
                />
                <span v-else :class="theme('grip')" aria-hidden="true">⋮</span>
            </slot>
            <span :class="theme('ordinal')" data-qa="sort-chip-ordinal">{{ index + 1 }}</span>
        </span>
        <button
            type="button"
            :class="theme('label')"
            :aria-label="`Sort ${label} ${descending ? 'ascending' : 'descending'} (currently ${
                descending ? 'descending' : 'ascending'
            })`"
            data-qa="sort-chip-toggle"
            @click="emit('toggle')"
        >
            <span :class="theme('field')">{{ label }}</span>
            <component
                :is="icon('sortDown').component"
                v-if="icon('sortDown')"
                v-bind="icon('sortDown').props"
                :class="[theme('direction'), { 'rotate-180': !descending }]"
                aria-hidden="true"
            />
            <span v-else :class="theme('direction')" aria-hidden="true">{{ descending ? "↓" : "↑" }}</span>
        </button>
        <template v-if="removable">
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
        </template>
    </span>
</template>
