<script setup>
import { ArraiPreview } from "@arrai-innovations/vitepress-theme";
import { withBase } from "vitepress";
import { VPImage } from "vitepress/theme-without-fonts";
</script>

<template>
    <ArraiPreview label="Widget Warehouse" description="Example application">
        <VPImage
            class="screenshot"
            :image="{
                light: '/assets/homepage-list-preview-light.png',
                dark: '/assets/homepage-list-preview-dark.png',
                alt: 'Widget Warehouse widget list with sidebar navigation, filter and sort controls, search, and a table of widget records.',
            }"
            width="1440"
            height="720"
            fetchpriority="high"
        />
        <template #caption>
            <span>A VUEDA application, from navigation to records.</span>
            <a :href="withBase('/reference/components/views-crudl.html')"
                >Explore the views <span aria-hidden="true">→</span></a
            >
        </template>
    </ArraiPreview>
</template>

<style scoped>
.screenshot {
    width: 100%;
    height: auto;
}
</style>
