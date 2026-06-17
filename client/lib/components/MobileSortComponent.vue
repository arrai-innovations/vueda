<script setup>
import SortEditor from "@vueda/components/SortEditor.vue";
import Button from "@vueda/controls/button/Button.vue";
import Drawer from "@vueda/shell/drawer/Drawer.vue";
import DrawerContent from "@vueda/shell/drawer/DrawerContent.vue";
import DrawerHeader from "@vueda/shell/drawer/DrawerHeader.vue";
import DrawerTitle from "@vueda/shell/drawer/DrawerTitle.vue";
import "@vueda/theme/vueda-tailwind/display/MobileSortComponent.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed } from "vue";

/**
 * A mobile-optimized sort control: a bottom-drawer shell hosting the shared
 * `SortEditor` body. Owns only the trigger button and the drawer open/close
 * state; add / reorder / direction / remove / clear behaviour lives in
 * `SortEditor`.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Whether the sort drawer is open. */
    open: {
        type: Boolean,
        default: false,
    },
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
});
const emit = defineEmits([
    /** Emitted when the drawer open/close state changes. */
    "update:open",
    /** Emitted when the active sort array changes. */
    "update:sorted",
]);
const internalOpen = computed({
    get: () => props.open,
    set: (value) => {
        emit("update:open", value);
    },
});
const sortedCount = computed(() => props.sorted.length);
const sortedCountBadge = computed(() => (sortedCount.value ? String(sortedCount.value) : undefined));
const theme = useTheme("MobileSortComponent", props);
</script>
<template>
    <!-- TODO: theme.hideStyle requires a single themed root -->
    <!-- Button that opens the sort drawer; receives `label`, `size`, and `badge` as slot props. -->
    <slot name="toggle-drawer-button" label="sort" size="small" :badge="sortedCountBadge" @click="internalOpen = true">
        <Button size="sm" @click="internalOpen = true">
            Sort
            <span
                v-if="sortedCountBadge"
                class="ml-1 inline-flex items-center justify-center rounded-full bg-primary-foreground text-primary text-xs size-5"
            >
                {{ sortedCountBadge }}
            </span>
        </Button>
    </slot>
    <Drawer
        v-model:open="internalOpen"
        :modal="true"
        direction="bottom"
        data-qa="sort-component-drawer"
        v-bind="$attrs"
    >
        <DrawerContent :class="theme('drawer')">
            <DrawerHeader class="sr-only">
                <DrawerTitle>Sort</DrawerTitle>
            </DrawerHeader>
            <SortEditor
                :sortables="props.sortables"
                :sorted="props.sorted"
                :field-details="props.fieldDetails"
                @update:sorted="emit('update:sorted', $event)"
            >
                <!-- Forward only the body slots the consumer actually supplied, so SortEditor's own
                     defaults still apply for the rest. `toggle-drawer-button` is this shell's own slot;
                     SortEditor ignores it. -->
                <template v-for="(_, name) in $slots" #[name]="slotProps">
                    <slot :name="name" v-bind="slotProps" />
                </template>
            </SortEditor>
        </DrawerContent>
    </Drawer>
</template>
