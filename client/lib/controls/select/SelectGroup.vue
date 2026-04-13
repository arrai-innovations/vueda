<script setup>
import { SelectGroup } from "reka-ui";

/**
 * Groups related SelectItem elements within SelectContent.
 */
defineOptions({});

const props = defineProps({
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});
</script>

<template>
    <SelectGroup data-slot="select-group" v-bind="props">
        <slot />
    </SelectGroup>
</template>
