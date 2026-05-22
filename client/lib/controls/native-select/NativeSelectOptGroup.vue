<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A styled wrapper for the native `<optgroup>` element used inside NativeSelect.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the optgroup element. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("NativeSelectOptGroup", props);
</script>

<template>
    <optgroup data-slot="native-select-optgroup" :class="[theme('root'), props.class]">
        <slot />
    </optgroup>
</template>
