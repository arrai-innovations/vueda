<script setup>
import ControlTextarea from "@vueda/controls/textarea/ControlTextarea.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A borderless textarea element styled for seamless placement inside an input group.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the textarea element. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ControlInputGroupTextarea", props);
</script>

<template>
    <ControlTextarea data-slot="input-group-control" :class="[theme('root'), props.class]" />
</template>
