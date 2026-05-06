<script setup>
import { useIcons } from "@vueda/use/useIcons.js";

/**
 * Renders the configured inline loading icon. The icon entry is resolved from
 * `useIcons("LoadingSpinnerInline")`, falling back to `Default.loading`.
 */
defineOptions({});

const icon = useIcons("LoadingSpinnerInline");
</script>

<template>
    <span v-if="icon('loading')" role="status" aria-label="Loading">
        <component :is="icon('loading').component" v-bind="icon('loading').props" aria-hidden="true" />
    </span>
</template>
