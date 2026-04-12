<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ComboboxContent, ComboboxPortal, useForwardPropsEmits } from "reka-ui";

/**
 * The dropdown list panel for ControlCombobox, rendered in a portal.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /**
     * Positioning mode.
     * @type {'popper' | 'item-aligned'}
     */
    position: { type: String, default: "popper" },
    /** Preferred alignment relative to the anchor. */
    align: { type: String, default: "center" },
    /** Distance in pixels from the anchor. */
    sideOffset: { type: Number, default: 4 },
    /** Whether to force mount the content. */
    forceMount: { type: Boolean, default: undefined },
});
const emits = defineEmits(["escapeKeyDown", "pointerDownOutside", "closeAutoFocus"]);

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);

const theme = useTheme("ControlComboboxList", props);
</script>

<template>
    <ComboboxPortal>
        <ComboboxContent
            data-slot="combobox-list"
            v-bind="{ ...$attrs, ...forwarded }"
            :class="[theme('root'), props.class]"
        >
            <slot />
        </ComboboxContent>
    </ComboboxPortal>
</template>
