<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A styled wrapper for the native `<option>` element used inside NativeSelect.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the option element. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("NativeSelectOption", props);
</script>

<template>
    <option data-slot="native-select-option" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value">
        <slot />
    </option>
</template>
