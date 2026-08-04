<script setup>
import Sonner from "@vueda/feedback/toast/Sonner.vue";
import PageTitle from "@vueda/shell/page-title/PageTitle.vue";
import StickyStackProvider from "@vueda/shell/sticky/StickyStackProvider.vue";
import { usePageTitle } from "@vueda/use/usePageTitle.js";

// Establish the page-title context above both the title display and the routed views, so each view
// can contribute its title via usePageTitle and its page actions via PageActions.
usePageTitle();
</script>

<template>
    <StickyStackProvider>
        <template #top>
            <PageTitle />
        </template>
        <RouterView />
    </StickyStackProvider>
    <Sonner />
</template>
