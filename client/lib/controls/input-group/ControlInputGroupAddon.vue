<script setup>
import { inputGroupAddonVariants } from ".";
import { cn } from "@vueda/utils/cn.js";

/**
 * An addon element placed at the start, end, or above/below an input group, with optional click-to-focus behavior.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps({
    /** The alignment of the addon relative to the input. */
    align: { type: String, default: "inline-start" },
    /** Additional CSS classes to apply to the addon element. */
    class: { type: [String, Array, Object], default: undefined },
});

function handleInputGroupAddonClick(e) {
    const currentTarget = e.currentTarget;
    const target = e.target;
    if (target && target.closest("button")) {
        return;
    }
    if (currentTarget && currentTarget.parentElement) {
        currentTarget.parentElement.querySelector("input")?.focus();
    }
}
</script>

<template>
    <div
        role="group"
        data-slot="input-group-addon"
        :data-align="props.align"
        v-bind="$attrs"
        :class="cn(inputGroupAddonVariants({ align: props.align }), props.class)"
        @click="handleInputGroupAddonClick"
    >
        <slot />
    </div>
</template>
