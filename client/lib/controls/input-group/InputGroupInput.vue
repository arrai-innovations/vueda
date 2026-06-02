<script setup>
import Input from "@vueda/controls/input/Input.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A borderless input element styled for seamless placement inside an input group.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the input element. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("InputGroupInput", props);
</script>

<template>
    <Input data-slot="input-group-control" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value" />
</template>
