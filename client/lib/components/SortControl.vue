<script setup>
import SortEditor from "@vueda/components/SortEditor.vue";
import Button from "@vueda/controls/button/Button.vue";
import Drawer from "@vueda/shell/drawer/Drawer.vue";
import DrawerContent from "@vueda/shell/drawer/DrawerContent.vue";
import DrawerHeader from "@vueda/shell/drawer/DrawerHeader.vue";
import DrawerTitle from "@vueda/shell/drawer/DrawerTitle.vue";
import Popover from "@vueda/shell/popover/Popover.vue";
import PopoverContent from "@vueda/shell/popover/PopoverContent.vue";
import PopoverTrigger from "@vueda/shell/popover/PopoverTrigger.vue";
import { keepOpenOverNestedPopper } from "@vueda/shell/popover/keepOpenOverNestedPopper.js";
import "@vueda/theme/vueda-tailwind/display/SortControl.theme.js";
import { useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { breakpointsVueda } from "@vueda/utils/breakpoints.js";
import { useBreakpoints } from "@vueuse/core";
import { computed, ref, useSlots } from "vue";

/**
 * Toolbar entry point for multi-field sorting. The trigger shows the active-sort
 * count and opens the shared {@api vue:component:SortEditor}: a popover on desktop,
 * a bottom drawer on mobile. The trigger teleports into a toolbar zone supplied by
 * the host view so the button sits in the under-actions bar while the editor's
 * state and surface stay anchored to it. This is the layout-independent companion
 * to column-header sorting; both write the same `sorted` array.
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

const open = ref(false);
const breakpoints = useBreakpoints(breakpointsVueda);
// Below the `md` (768px) breakpoint we present the editor in a bottom drawer; at
// or above it, a popover. Matches the sidebar's mobile boundary.
const isMobile = breakpoints.smaller("md");

const sortedCount = computed(() => props.sorted.length);

const theme = useTheme("SortControl", props);
const icon = useIcons("SortControl");
const slots = useSlots();
</script>

<template>
    <!-- Desktop: popover anchored to the teleported trigger. -->
    <Popover v-if="!isMobile" v-model:open="open">
        <Teleport :to="triggerTarget" :disabled="!triggerTarget">
            <PopoverTrigger as-child>
                <Button size="sm" variant="outline" aria-haspopup="dialog" data-qa="sort-control-trigger">
                    <component
                        :is="icon('sort').component"
                        v-if="icon('sort')"
                        v-bind="icon('sort').props"
                        aria-hidden="true"
                    />
                    {{ label }}
                    <span v-if="sortedCount" :class="theme('badge')" data-qa="sort-control-count">{{
                        sortedCount
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
        <PopoverContent size="sm" data-qa="sort-control-content" @interact-outside="keepOpenOverNestedPopper">
            <SortEditor
                :sortables="props.sortables"
                :sorted="props.sorted"
                :field-details="props.fieldDetails"
                @update:sorted="emit('update:sorted', $event)"
            >
                <template v-for="(_, name) in slots" #[name]="slotProps">
                    <slot :name="name" v-bind="slotProps || {}" />
                </template>
            </SortEditor>
        </PopoverContent>
    </Popover>
    <!-- Mobile: bottom drawer; the teleported trigger toggles it open. -->
    <template v-else>
        <Teleport :to="triggerTarget" :disabled="!triggerTarget">
            <Button
                size="sm"
                variant="outline"
                aria-haspopup="dialog"
                data-qa="sort-control-trigger"
                @click="open = true"
            >
                <component
                    :is="icon('sort').component"
                    v-if="icon('sort')"
                    v-bind="icon('sort').props"
                    aria-hidden="true"
                />
                {{ label }}
                <span v-if="sortedCount" :class="theme('badge')" data-qa="sort-control-count">{{ sortedCount }}</span>
                <component
                    :is="icon('caretDown').component"
                    v-if="icon('caretDown')"
                    v-bind="icon('caretDown').props"
                    aria-hidden="true"
                />
            </Button>
        </Teleport>
        <Drawer v-model:open="open" :modal="true" direction="bottom" data-qa="sort-control-drawer">
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
                    <template v-for="(_, name) in slots" #[name]="slotProps">
                        <slot :name="name" v-bind="slotProps || {}" />
                    </template>
                </SortEditor>
            </DrawerContent>
        </Drawer>
    </template>
</template>
