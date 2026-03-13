<script setup>
import { ControlTextarea } from "@vueda/controls/textarea";
import { cn } from "@vueda/utils/cn.js";

/**
 * A borderless textarea element styled for seamless placement inside an input group.
 */
defineOptions({});

const props = defineProps({
    /** Additional CSS classes to apply to the textarea element. */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <ControlTextarea
        data-slot="input-group-control"
        :class="
            cn(
                'flex-1 resize-none rounded-none border-0 bg-transparent py-3 shadow-none focus-visible:ring-0 dark:bg-transparent',
                props.class,
            )
        "
    />
</template>
