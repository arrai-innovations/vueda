<script setup>
import { ControlInput } from "@vueda/controls/input";
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

const theme = useTheme("ControlInputGroupInput", props);
</script>

<template>
    <ControlInput data-slot="input-group-control" :class="[theme('root'), props.class]" />
</template>
