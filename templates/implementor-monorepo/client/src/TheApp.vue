<script setup>
import { FeedbackToaster } from "@vueda/feedback/toast";
import ConfirmDialog from "primevue/confirmdialog";
</script>

<template>
    <FeedbackToaster />
    <ConfirmDialog />
    <RouterView />
</template>
