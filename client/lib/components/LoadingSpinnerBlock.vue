<script setup>
import { useIcons } from "@vueda/use/useIcons.js";

/**
 * Renders the configured loading icon for block-level loading placeholders. The
 * icon entry is resolved from `useIcons("LoadingSpinnerBlock")`, falling back
 * to `Default.loading`.
 */
defineOptions({});

const icon = useIcons("LoadingSpinnerBlock");
</script>

<template>
    <span v-if="icon('loading')" role="status" aria-label="Loading">
        <component :is="icon('loading').component" v-bind="icon('loading').props" aria-hidden="true" />
    </span>
</template>
