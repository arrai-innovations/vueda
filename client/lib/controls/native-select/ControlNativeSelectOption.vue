<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A styled wrapper for the native `<option>` element used inside ControlNativeSelect.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the option element. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ControlNativeSelectOption", props);
</script>

<template>
    <option data-slot="native-select-option" :class="[theme('root'), props.class]">
        <slot />
    </option>
</template>
