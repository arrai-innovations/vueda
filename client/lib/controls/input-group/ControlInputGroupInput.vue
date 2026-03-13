<script setup>
import { ControlInput } from "@vueda/controls/input";
import { cn } from "@vueda/utils/cn.js";

/**
 * A borderless input element styled for seamless placement inside an input group.
 */
defineOptions({});

const props = defineProps({
    /** Additional CSS classes to apply to the input element. */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <ControlInput
        data-slot="input-group-control"
        :class="
            cn(
                'flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent',
                props.class,
            )
        "
    />
</template>
