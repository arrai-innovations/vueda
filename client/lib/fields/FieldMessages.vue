<script setup>
defineProps({
    messages: {
        type: Array,
        default: () => [],
    },
});
</script>
<template>
    <div v-if="messages?.length">
        <ul>
            <li v-for="message in messages" :key="message">
                {{ message }}
            </li>
        </ul>
    </div>
</template>
