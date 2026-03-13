<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { ComboboxContent, ComboboxPortal, useForwardPropsEmits } from "reka-ui";

/**
 * The dropdown list panel for ControlCombobox, rendered in a portal.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /**
     * Positioning mode.
     * @type {'popper' | 'item-aligned'}
     */
    position: { type: String, default: "popper" },
    /** Preferred alignment relative to the anchor. */
    align: { type: String, default: "center" },
    /** Distance in pixels from the anchor. */
    sideOffset: { type: Number, default: 4 },
    /** Whether to force mount the content. */
    forceMount: { type: Boolean, default: undefined },
});
const emits = defineEmits(["escapeKeyDown", "pointerDownOutside", "closeAutoFocus"]);

const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
    <ComboboxPortal>
        <ComboboxContent
            data-slot="combobox-list"
            v-bind="{ ...$attrs, ...forwarded }"
            :class="
                cn(
                    'z-50 w-[200px] rounded-md border bg-popover text-popover-foreground origin-(--reka-combobox-content-transform-origin) overflow-hidden shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
                    props.class,
                )
            "
        >
            <slot />
        </ComboboxContent>
    </ComboboxPortal>
</template>
