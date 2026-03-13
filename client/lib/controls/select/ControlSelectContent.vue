<script setup>
import ControlSelectScrollDownButton from "./ControlSelectScrollDownButton.vue";
import ControlSelectScrollUpButton from "./ControlSelectScrollUpButton.vue";
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { SelectContent, SelectPortal, SelectViewport, useForwardPropsEmits } from "reka-ui";

/**
 * Dropdown content panel for ControlSelect, rendered in a portal with scroll buttons.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /**
     * Positioning mode.
     * @type {'item-aligned' | 'popper'}
     */
    position: { type: String, default: "popper" },
    /** Whether to force mount the content. */
    forceMount: { type: Boolean, default: undefined },
});
const emits = defineEmits(["escapeKeyDown", "pointerDownOutside", "closeAutoFocus"]);

const delegatedProps = reactiveOmit(props, "class");

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
    <SelectPortal>
        <SelectContent
            data-slot="select-content"
            v-bind="{ ...$attrs, ...forwarded }"
            :class="
                cn(
                    'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--reka-select-content-available-height) min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-md border shadow-md',
                    position === 'popper' &&
                        'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
                    props.class,
                )
            "
        >
            <ControlSelectScrollUpButton />
            <SelectViewport
                :class="
                    cn(
                        'p-1',
                        position === 'popper' &&
                            'h-[var(--reka-select-trigger-height)] w-full min-w-[var(--reka-select-trigger-width)] scroll-my-1',
                    )
                "
            >
                <slot />
            </SelectViewport>
            <ControlSelectScrollDownButton />
        </SelectContent>
    </SelectPortal>
</template>
