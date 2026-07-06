<script setup>
import FieldPickerMenuList from "@vueda/display/field-picker/FieldPickerMenuList.vue";
import ResponsiveMenu from "@vueda/display/responsive-menu/ResponsiveMenu.vue";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import { addSortField, parseSortField } from "@vueda/utils/sortedFields.js";
import { computed } from "vue";

/**
 * Toolbar entry point for multi-field sorting. The trigger opens an add-field
 * menu of the sortable fields not yet in the sort, presented by
 * {@api vue:component:ResponsiveMenu} (a popover on desktop, a full-screen dialog
 * on mobile). Picking a field appends it to the sort; the menu stays open so
 * several fields can be added in a row. Reordering, direction, and removal happen
 * on the active-sort chips (see {@api vue:component:SortGroup} /
 * {@api vue:component:SortChip}), so this control is add-only. The trigger
 * teleports into a toolbar zone supplied by the host view. This is the
 * layout-independent companion to column-header sorting; both write the same
 * `sorted` array.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Array of field names that can be added as sort criteria. */
    sortables: {
        type: Array,
        default: () => [],
    },
    /** Currently active sort fields; prefix a field name with `-` to indicate descending order. */
    sorted: {
        type: Array,
        default: () => [],
    },
    /** Map of field name to field metadata (e.g. `{ label }`) used to derive human-readable labels. */
    fieldDetails: {
        type: Object,
        default: () => ({}),
    },
    /** Element (or selector) the trigger teleports into. When falsy, the trigger renders in place. */
    triggerTarget: {
        type: [Object, String],
        default: null,
    },
    /** Trigger label text. */
    label: {
        type: String,
        default: "Sort",
    },
});
const emit = defineEmits([
    /** Emitted when the active sort array changes. */
    "update:sorted",
]);

const fieldLabel = (field) => props.fieldDetails?.[field]?.label || memoizedStartCase(field);
// Fields not yet in the sort, in their declared order, as labeled options for the add menu.
const activeBases = computed(() => props.sorted.map((field) => parseSortField(field).base));
const availableSortableOptions = computed(() =>
    props.sortables
        .filter((sortable) => !activeBases.value.includes(sortable))
        .map((field) => ({ label: fieldLabel(field), value: field })),
);
// Append a field to the sort. The menu stays open so several fields can be added
// without reopening it; it empties to its end state once every field is sorted.
const pickAddField = (field) => {
    if (!field || activeBases.value.includes(field) || !props.sortables.includes(field)) {
        return;
    }
    emit("update:sorted", addSortField(props.sorted, field));
};
</script>

<template>
    <ResponsiveMenu
        icon="sort"
        :label="label"
        title="Add sort"
        :trigger-target="triggerTarget"
        trigger-qa="sort-control-trigger"
        content-qa="sort-control-content"
    >
        <FieldPickerMenuList
            :items="availableSortableOptions"
            eyebrow="Add sort"
            empty-text="All fields sorted."
            qa="sort-add-menu"
            @pick="pickAddField"
        />
    </ResponsiveMenu>
</template>
