<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { SearchIcon } from "lucide-vue-next";
import { ComboboxInput, useForwardPropsEmits } from "reka-ui";

/**
 * The search input for ControlCombobox, rendered with a search icon.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The controlled search value. Can be bound with v-model. */
    modelValue: { type: String, default: undefined },
    /** Whether to focus the input on mount. */
    autoFocus: { type: Boolean, default: undefined },
    /** When true, prevents user interaction. */
    disabled: { type: Boolean, default: undefined },
    /** Function that returns the display string for the selected value. */
    displayValue: { type: Function, default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});
const emits = defineEmits(["update:modelValue"]);

const delegatedProps = reactiveOmit(props, "class");

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
    <div data-slot="combobox-input-wrapper" class="flex h-9 items-center gap-2 border-b px-3">
        <SearchIcon class="size-4 shrink-0 opacity-50" />
        <ComboboxInput
            data-slot="combobox-input"
            :class="
                cn(
                    'placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
                    props.class,
                )
            "
            v-bind="{ ...$attrs, ...forwarded }"
        >
            <slot />
        </ComboboxInput>
    </div>
</template>
