<script setup>
defineProps({
    title: { type: String, default: "" },
    description: { type: String, default: "" },
});
</script>

<template>
    <section class="flex flex-col gap-3 border border-dashed border-border/60 p-4">
        <header v-if="title" class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {{ title
            }}<template v-if="description">
                <span class="font-normal normal-case">{{ description }}</span></template
            >
        </header>
        <slot />
        <footer v-if="$slots.footer" class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <slot name="footer" />
        </footer>
    </section>
</template>
