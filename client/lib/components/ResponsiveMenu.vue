<script setup>
import Button from "@vueda/controls/button/Button.vue";
import Dialog from "@vueda/shell/dialog/Dialog.vue";
import DialogContent from "@vueda/shell/dialog/DialogContent.vue";
import DialogHeader from "@vueda/shell/dialog/DialogHeader.vue";
import DialogTitle from "@vueda/shell/dialog/DialogTitle.vue";
import DialogTrigger from "@vueda/shell/dialog/DialogTrigger.vue";
import Popover from "@vueda/shell/popover/Popover.vue";
import PopoverContent from "@vueda/shell/popover/PopoverContent.vue";
import PopoverTrigger from "@vueda/shell/popover/PopoverTrigger.vue";
import { keepOpenOverNestedPopper } from "@vueda/shell/popover/keepOpenOverNestedPopper.js";
import "@vueda/theme/vueda-tailwind/display/ResponsiveMenu.theme.js";
import { useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { breakpointsVueda } from "@vueda/utils/breakpoints.js";
import { useBreakpoints } from "@vueuse/core";
import { computed } from "vue";

/**
 * Responsive menu shell for a toolbar control: a teleported trigger button
 * (leading icon, label, caret) that opens its slotted content as a popover on
 * desktop and a full-screen dialog on mobile. Shared by the sort add-menu
 * ({@api vue:component:SortControl}) and the filter add-menu
 * ({@api vue:component:FilterMenu}) so both pick their surface by viewport the
 * same way. Presentational: the host supplies the menu body via the default
 * slot and owns what the menu does; this component owns only the trigger,
 * open/close state, and the popover/dialog choice. `keepOpenOverNestedPopper`
 * is applied so a nested popper (a Select or date picker inside the body) does
 * not dismiss the menu.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Icon-registry key for the leading trigger glyph (e.g. `"sort"`, `"filter"`). */
    icon: {
        type: String,
        default: null,
    },
    /** Trigger button label. */
    label: {
        type: String,
        default: "",
    },
    /** Mobile dialog heading; defaults to `label`. */
    title: {
        type: String,
        default: null,
    },
    /** Element (or selector) the trigger teleports into. When falsy, the trigger renders in place. */
    triggerTarget: {
        type: [Object, String],
        default: null,
    },
    /** `data-qa` for the trigger button. */
    triggerQa: {
        type: String,
        default: "responsive-menu-trigger",
    },
    /** `data-qa` for the popover content / dialog body wrapper. */
    contentQa: {
        type: String,
        default: "responsive-menu-content",
    },
});

/** Open state; exposed so the host can close the menu programmatically (e.g. after applying). */
const open = defineModel("open", {
    type: Boolean,
    default: false,
});

const breakpoints = useBreakpoints(breakpointsVueda);
// Below the `md` (768px) breakpoint we present the menu in a full-screen dialog; at
// or above it, a popover. Matches the sidebar's mobile boundary.
const isMobile = breakpoints.smaller("md");
const heading = computed(() => props.title ?? props.label);

const theme = useTheme("ResponsiveMenu", props);
const icons = useIcons("ResponsiveMenu");
</script>

<template>
    <!-- Desktop: popover anchored to the teleported trigger. -->
    <Popover v-if="!isMobile" v-model:open="open">
        <Teleport :to="triggerTarget" :disabled="!triggerTarget">
            <PopoverTrigger as-child>
                <Button size="sm" variant="outline" aria-haspopup="dialog" :data-qa="triggerQa">
                    <component
                        :is="icons(props.icon).component"
                        v-if="props.icon && icons(props.icon)"
                        v-bind="icons(props.icon).props"
                        aria-hidden="true"
                    />
                    {{ label }}
                    <component
                        :is="icons('caretDown').component"
                        v-if="icons('caretDown')"
                        v-bind="icons('caretDown').props"
                        aria-hidden="true"
                    />
                </Button>
            </PopoverTrigger>
        </Teleport>
        <PopoverContent :data-qa="contentQa" @interact-outside="keepOpenOverNestedPopper">
            <slot />
        </PopoverContent>
    </Popover>
    <!-- Mobile: full-screen dialog; the teleported trigger toggles it open. -->
    <Dialog v-else v-model:open="open">
        <Teleport :to="triggerTarget" :disabled="!triggerTarget">
            <DialogTrigger as-child>
                <Button size="sm" variant="outline" aria-haspopup="dialog" :data-qa="triggerQa" @click="open = true">
                    <component
                        :is="icons(props.icon).component"
                        v-if="props.icon && icons(props.icon)"
                        v-bind="icons(props.icon).props"
                        aria-hidden="true"
                    />
                    {{ label }}
                    <component
                        :is="icons('caretDown').component"
                        v-if="icons('caretDown')"
                        v-bind="icons('caretDown').props"
                        aria-hidden="true"
                    />
                </Button>
            </DialogTrigger>
        </Teleport>
        <DialogContent full-screen :class="theme('dialog')">
            <DialogHeader :class="theme('dialogHeader')">
                <DialogTitle>{{ heading }}</DialogTitle>
            </DialogHeader>
            <div :class="theme('dialogBody')" :data-qa="contentQa">
                <slot />
            </div>
        </DialogContent>
    </Dialog>
</template>
