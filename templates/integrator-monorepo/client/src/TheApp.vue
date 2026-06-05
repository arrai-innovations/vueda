<script setup>
import PageTitle from "@vueda/components/PageTitle.vue";
import Sonner from "@vueda/feedback/toast/Sonner.vue";
import { usePageTitle } from "@vueda/use/usePageTitle.js";

// Establish the page-title context above both the title display and the routed views, so each view
// can contribute its title via usePageTitle and its page actions via PageActions.
usePageTitle();
</script>

<template>
    <PageTitle />
    <RouterView />
    <Sonner />
</template>
