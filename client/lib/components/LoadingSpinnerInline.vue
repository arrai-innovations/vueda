<script setup>
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";

/**
 * Renders the configured inline loading icon. The icon entry is resolved from
 * `useIcons("LoadingSpinnerInline", props)`, falling back to `Default.loading`.
 */
defineOptions({});

const props = defineProps({ ...ICON_OVERRIDE_PROPS });

const icon = useIcons("LoadingSpinnerInline", props);
</script>

<template>
    <span v-if="icon('loading')" role="status" aria-label="Loading">
        <component :is="icon('loading').component" v-bind="icon('loading').props" aria-hidden="true" />
    </span>
</template>
