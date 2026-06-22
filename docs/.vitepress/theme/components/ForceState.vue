<script setup>
/**
 * Wraps showcase content so the docs-only forced-state CSS shim
 * (showcase.css `.force-state-*`) paints hover / focus / disabled
 * visuals on real vueda components without requiring real interaction.
 *
 * Used by docs/components/* state-matrix sections. Not part of the
 * vueda public API.
 */
defineOptions({});

defineProps({
    /** @type {'hover' | 'focus' | 'disabled' | 'active'} */
    state: { type: String, required: true },
    /** @type {'inline-flex' | 'flex' | 'grid' | 'block'} */
    as: { type: String, default: "inline-flex" },
});
</script>

<template>
    <div :class="[`force-state-${state}`, as === 'inline-flex' ? 'inline-flex items-center gap-2' : as]">
        <slot />
    </div>
</template>
