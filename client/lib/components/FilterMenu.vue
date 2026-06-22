<script setup>
import FilterFieldForm from "@vueda/components/FilterFieldForm.vue";
import Button from "@vueda/controls/button/Button.vue";
import Popover from "@vueda/shell/popover/Popover.vue";
import PopoverContent from "@vueda/shell/popover/PopoverContent.vue";
import PopoverTrigger from "@vueda/shell/popover/PopoverTrigger.vue";
import { keepOpenOverNestedPopper } from "@vueda/shell/popover/keepOpenOverNestedPopper.js";
import "@vueda/theme/vueda-tailwind/form/FilterMenu.theme.js";
import { useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed, ref, useSlots, watch } from "vue";

/**
 * Toolbar entry point for adding filters. The trigger shows the active-filter
 * count and opens a popover listing the fields not yet applied; picking one
 * drills the popover in place to that field's {@api vue:component:FilterFieldForm},
 * with a back affordance returning to the list. The trigger teleports into a
 * toolbar zone supplied by the host view so the button sits in the under-actions
 * bar while the menu's state and popover stay anchored to it.
 */
defineOptions({});

const props = defineProps({
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

const activeCount = computed(() => addedFilters.value.length);
const inactiveFilterables = computed(() =>
    (props.filterables || []).filter((field) => !addedFilters.value.some((filter) => filter.field === field)),
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

// Reset the drill-in whenever the popover closes so it reopens on the field list.
watch(open, (isOpen) => {
    if (!isOpen) {
        pickedField.value = null;
    }
});

const theme = useTheme("FilterMenu", props);
const icon = useIcons("FilterMenu");
const slots = useSlots();
</script>

<template>
    <Popover v-model:open="open">
        <Teleport :to="triggerTarget" :disabled="!triggerTarget">
            <PopoverTrigger as-child>
                <Button size="sm" variant="outline" aria-haspopup="menu" data-qa="filter-menu-trigger">
                    <component
                        :is="icon('filter').component"
                        v-if="icon('filter')"
                        v-bind="icon('filter').props"
                        aria-hidden="true"
                    />
                    {{ label }}
                    <span v-if="activeCount" :class="theme('badge')" data-qa="filter-menu-count">{{
                        activeCount
                    }}</span>
                    <component
                        :is="icon('caretDown').component"
                        v-if="icon('caretDown')"
                        v-bind="icon('caretDown').props"
                        aria-hidden="true"
                    />
                </Button>
            </PopoverTrigger>
        </Teleport>
        <PopoverContent data-qa="filter-menu-content" @interact-outside="keepOpenOverNestedPopper">
            <template v-if="!pickedField">
                <div :class="theme('eyebrow')">Add filter</div>
                <button
                    v-for="field in inactiveFilterables"
                    :key="field"
                    type="button"
                    :class="theme('item')"
                    data-qa="filter-menu-item"
                    @click="pickField(field)"
                >
                    {{ filterableDetails[field]?.label ?? field }}
                    <component
                        :is="icon('chevronRight').component"
                        v-if="icon('chevronRight')"
                        v-bind="icon('chevronRight').props"
                        class="ml-auto"
                        aria-hidden="true"
                    />
                </button>
                <div v-if="!inactiveFilterables.length" :class="theme('empty')" data-qa="filter-menu-empty">
                    All filters added.
                </div>
            </template>
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
        </PopoverContent>
    </Popover>
</template>
