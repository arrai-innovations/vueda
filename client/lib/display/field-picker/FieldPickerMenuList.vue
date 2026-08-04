<script setup>
import "@vueda/theme/vueda-tailwind/display/FieldPickerMenuList.theme.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * The list step shared by the sort and filter add-menus: an eyebrow, a scrollable
 * list of pickable fields, and an empty state. Picking a row emits `pick` with the
 * field value; the host decides what happens next (the sort menu appends the field,
 * the filter menu drills into that field's form). Centralizes the field-row styling
 * so the two menus cannot drift.
 */
defineOptions({});

const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
    ...THEME_OVERRIDE_PROPS,
    /** Pickable options: `{ value, label }`. */
    items: {
        type: Array,
        default: () => [],
    },
    /** Eyebrow heading above the list. */
    eyebrow: {
        type: String,
        default: "",
    },
    /** Message shown when there are no pickable fields left. */
    emptyText: {
        type: String,
        default: "",
    },
    /** Optional trailing icon-registry key per row (e.g. `"chevronRight"` to signal a drill-in). */
    itemIcon: {
        type: String,
        default: null,
    },
    /** `data-qa` base; rows get `${qa}-item`, the empty state gets `${qa}-empty`. */
    qa: {
        type: String,
        default: "field-picker",
    },
});
const emit = defineEmits([
    /** Emitted with the picked field value when a row is clicked. */
    "pick",
]);

const theme = useTheme("FieldPickerMenuList", props);
const icon = useIcons("FieldPickerMenuList", props);
</script>

<template>
    <div :class="theme('eyebrow')">{{ eyebrow }}</div>
    <div :class="theme('list')">
        <button
            v-for="opt in items"
            :key="opt.value"
            type="button"
            :class="theme('item')"
            :data-qa="`${qa}-item`"
            @click="emit('pick', opt.value)"
        >
            {{ opt.label }}
            <component
                :is="icon(itemIcon).component"
                v-if="itemIcon && icon(itemIcon)"
                v-bind="icon(itemIcon).props"
                class="ml-auto"
                aria-hidden="true"
            />
        </button>
        <div v-if="!items.length" :class="theme('empty')" :data-qa="`${qa}-empty`">
            {{ emptyText }}
        </div>
    </div>
</template>
