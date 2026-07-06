<script setup>
/**
 * Renders a single navigation item as a list element. If the item has a link
 * it renders a router-link; otherwise it renders a plain span. Recursively
 * renders child items when the item has children.
 */
defineProps({
    /** The navigation item to render, including its name, optional link, and optional children. */
    item: {
        type: Object,
        required: true,
    },
});
</script>
<template>
    <li>
        <router-link v-if="item.link" :to="item.link">{{ item.name }}</router-link>
        <span v-else>{{ item.name }}</span>
        <ul v-if="item.children && item.children.length">
            <NavigationItem v-for="(child, index) in item.children" :key="index" :item="child" />
        </ul>
    </li>
</template>
