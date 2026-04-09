<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactive, toRef } from "vue";

/**
 * An alert box supporting variant styles.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** @type {'default' | 'destructive' | 'warning' | 'info' | 'success'} */
    variant: { type: String, default: undefined },
});

const theme = useTheme("FeedbackAlert", props, reactive({ variant: toRef(props, "variant") }));
</script>

<template>
    <div data-slot="alert" :class="[theme('root'), props.class]" role="alert">
        <slot />
    </div>
</template>
