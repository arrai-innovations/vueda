<script setup>
defineProps({
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
