<script setup>
import SortEditor from "@vueda/components/SortEditor.vue";
import Button from "@vueda/controls/button/Button.vue";
import Dialog from "@vueda/shell/dialog/Dialog.vue";
import DialogContent from "@vueda/shell/dialog/DialogContent.vue";
import DialogHeader from "@vueda/shell/dialog/DialogHeader.vue";
import DialogTitle from "@vueda/shell/dialog/DialogTitle.vue";
import DialogTrigger from "@vueda/shell/dialog/DialogTrigger.vue";
import "@vueda/theme/vueda-tailwind/display/MobileSortComponent.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed } from "vue";

/**
 * A mobile-optimized sort control: a full-screen dialog hosting the shared
 * `SortEditor` body. Owns only the trigger button and the dialog open/close
 * state; add / reorder / direction / remove / clear behaviour lives in
 * `SortEditor`.
 *
 * @deprecated Superseded by {@api vue:component:SortControl}, which hosts the same
 * `SortEditor` body and picks a popover (desktop) or full-screen dialog (mobile) by viewport,
 * giving a layout-independent sort entry point. `ViewList` now renders `SortControl`.
 * This component remains for back-compat and direct consumers.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Whether the sort dialog is open. */
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
    /** Emitted when the dialog open/close state changes. */
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
    <Dialog v-model:open="internalOpen" data-qa="sort-component-dialog" v-bind="$attrs">
        <!-- Button that opens the sort dialog; receives `label`, `size`, and `badge` as slot props. -->
        <DialogTrigger as-child>
            <slot
                name="toggle-drawer-button"
                label="sort"
                size="small"
                :badge="sortedCountBadge"
                @click="internalOpen = true"
            >
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
        </DialogTrigger>
        <DialogContent full-screen :class="theme('dialog')">
            <DialogHeader :class="theme('dialogHeader')">
                <DialogTitle>Sort</DialogTitle>
            </DialogHeader>
            <div :class="theme('dialogBody')" data-qa="sort-component-dialog-body">
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
            </div>
        </DialogContent>
    </Dialog>
</template>
