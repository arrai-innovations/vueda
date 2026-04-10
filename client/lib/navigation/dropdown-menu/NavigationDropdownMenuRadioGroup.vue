<script setup>
import { DropdownMenuRadioGroup, useForwardPropsEmits } from "reka-ui";

/**
 * Groups radio items within a dropdown menu.
 */
defineOptions({});

const props = defineProps({
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
    /** The value of the selected radio item. */
    modelValue: { type: [String, Number, Boolean, Object], default: undefined },
});

const emits = defineEmits(["update:modelValue"]);

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
    <DropdownMenuRadioGroup data-slot="dropdown-menu-radio-group" v-bind="forwarded">
        <slot />
    </DropdownMenuRadioGroup>
</template>
