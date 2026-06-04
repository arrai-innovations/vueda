<script setup>
import "@vueda/theme/vueda-tailwind/controls/InputGroup.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A container that groups an input with inline addons, buttons, or text, with coordinated focus and error states.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the input group container. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("InputGroup", props);
</script>

<template>
    <div
        data-slot="input-group"
        role="group"
        v-bind="$attrs"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <slot />
    </div>
</template>
