<script setup>
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";

/**
 * Renders the configured loading icon for block-level loading placeholders. The
 * icon entry is resolved from `useIcons("LoadingSpinnerBlock", props)`, falling back
 * to `Default.loading`.
 */
defineOptions({});

const props = defineProps({ ...ICON_OVERRIDE_PROPS });

const icon = useIcons("LoadingSpinnerBlock", props);
</script>

<template>
    <span v-if="icon('loading')" role="status" aria-label="Loading">
        <component :is="icon('loading').component" v-bind="icon('loading').props" aria-hidden="true" />
    </span>
</template>
