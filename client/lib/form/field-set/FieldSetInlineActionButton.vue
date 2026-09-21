<script setup>
import Button from "@vueda/controls/button/Button.vue";

/**
 * Default non-destroy action button shared by stacked and tabular inline rows.
 * Invokes the configured callback with the layout's row context, the action,
 * and the click event. Appearance comes from the shared Button theme.
 */
defineOptions({});

const props = defineProps({
    /** Action entry containing a label and an `action(context)` callback. */
    action: {
        type: Object,
        required: true,
    },
    /** Layout-specific callback context, including `fieldSetContextState` and `rowValueName`. */
    actionContext: {
        type: Object,
        required: true,
    },
});
</script>

<template>
    <Button
        type="button"
        emphasis="outline"
        size="sm"
        @click="props.action.action({ ...actionContext, action, event: $event })"
    >
        {{ action.label }}
    </Button>
</template>
