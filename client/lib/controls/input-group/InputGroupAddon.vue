<script setup>
import "@vueda/theme/vueda-tailwind/controls/InputGroupAddon.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactive, toRef } from "vue";

/**
 * An addon element placed at the start, end, or above/below an input group, with optional click-to-focus behavior.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** The alignment of the addon relative to the input. */
    align: { type: String, default: "inline-start" },
    /** Additional CSS classes to apply to the addon element. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme(
    "InputGroupAddon",
    props,
    reactive({
        align: toRef(props, "align"),
    }),
);

function handleInputGroupAddonClick(e) {
    const currentTarget = e.currentTarget;
    const target = e.target;
    if (target && target.closest("button")) {
        return;
    }
    if (currentTarget && currentTarget.parentElement) {
        currentTarget.parentElement.querySelector("input")?.focus();
    }
}
</script>

<template>
    <div
        role="group"
        data-slot="input-group-addon"
        :data-align="props.align"
        v-bind="$attrs"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        @click="handleInputGroupAddonClick"
    >
        <slot />
    </div>
</template>
