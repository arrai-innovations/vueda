<script setup>
/**
 * A navigation breadcrumb root element.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <nav aria-label="breadcrumb" data-slot="breadcrumb" :class="props.class">
        <slot />
    </nav>
</template>
