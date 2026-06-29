<script setup>
import FieldPickerMenuList from "@vueda/components/FieldPickerMenuList.vue";
import FilterFieldForm from "@vueda/components/FilterFieldForm.vue";
import ResponsiveMenu from "@vueda/components/ResponsiveMenu.vue";
import "@vueda/theme/vueda-tailwind/form/FilterMenu.theme.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed, ref, useSlots, watch } from "vue";

/**
 * Toolbar entry point for adding filters. The trigger opens a menu listing the
 * fields not yet applied (a popover on desktop, a full-screen dialog on mobile,
 * via {@api vue:component:ResponsiveMenu}); picking one drills the menu in place
 * to that field's {@api vue:component:FilterFieldForm}, with a back affordance
 * returning to the list. The trigger teleports into a toolbar zone supplied by
 * the host view.
 */
defineOptions({});

const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
    ...THEME_OVERRIDE_PROPS,
    /** Valid filterable field names (those with a `typeFilter`). */
    filterables: {
        type: Array,
        default: () => [],
    },
    /** Per-field filter configuration, keyed by field name. */
    filterableDetails: {
        type: Object,
        default: () => ({}),
    },
    /** Current URL query, forwarded to the drill-in form. */
    query: {
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
        default: "Filters",
    },
});

/** The shared active-filter list; the drill-in form mutates it. */
const addedFilters = defineModel({
    type: Array,
    required: true,
});
const emit = defineEmits(["hide-filter-form"]);

const open = ref(false);
const pickedField = ref(null);

const inactiveOptions = computed(() =>
    (props.filterables || [])
        .filter((field) => !addedFilters.value.some((filter) => filter.field === field))
        .map((field) => ({ value: field, label: props.filterableDetails[field]?.label ?? field })),
);

const pickField = (field) => {
    pickedField.value = field;
};
const back = () => {
    pickedField.value = null;
};
const onHideFilterForm = (name) => {
    open.value = false;
    emit("hide-filter-form", name);
};

// Reset the drill-in whenever the menu closes so it reopens on the field list.
watch(open, (isOpen) => {
    if (!isOpen) {
        pickedField.value = null;
    }
});

const theme = useTheme("FilterMenu", props);
const icon = useIcons("FilterMenu", props);
const slots = useSlots();
</script>

<template>
    <ResponsiveMenu
        v-model:open="open"
        icon="filter"
        :label="label"
        title="Add filter"
        :trigger-target="triggerTarget"
        trigger-qa="filter-menu-trigger"
        content-qa="filter-menu-content"
    >
        <FieldPickerMenuList
            v-if="!pickedField"
            :items="inactiveOptions"
            eyebrow="Add filter"
            empty-text="All filters added."
            item-icon="chevronRight"
            qa="filter-menu"
            @pick="pickField"
        />
        <template v-else>
            <button type="button" :class="theme('back')" data-qa="filter-menu-back" @click="back">
                <component
                    :is="icon('chevronLeft').component"
                    v-if="icon('chevronLeft')"
                    v-bind="icon('chevronLeft').props"
                    aria-hidden="true"
                />
                Add filter
            </button>
            <div :class="theme('separator')" aria-hidden="true" />
            <div :class="theme('drillIn')">
                <FilterFieldForm
                    v-model="addedFilters"
                    :filter-name="pickedField"
                    :filter-details="filterableDetails[pickedField] ?? {}"
                    :query="query"
                    :open="true"
                    :show-remove="false"
                    @hide-filter-form="onHideFilterForm"
                >
                    <template v-for="(_, slot) in slots" #[slot]="slotProps">
                        <slot :name="slot" v-bind="slotProps || {}" />
                    </template>
                </FilterFieldForm>
            </div>
        </template>
    </ResponsiveMenu>
</template>
