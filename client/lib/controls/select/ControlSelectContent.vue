<script setup>
import ControlSelectScrollDownButton from "./ControlSelectScrollDownButton.vue";
import ControlSelectScrollUpButton from "./ControlSelectScrollUpButton.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { SelectContent, SelectPortal, SelectViewport, useForwardPropsEmits } from "reka-ui";
import { reactive, toRef } from "vue";

/**
 * Dropdown content panel for ControlSelect, rendered in a portal with scroll buttons.
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
     * @type {'item-aligned' | 'popper'}
     */
    position: { type: String, default: "popper" },
    /** Whether to force mount the content. */
    forceMount: { type: Boolean, default: undefined },
});
const emits = defineEmits(["escapeKeyDown", "pointerDownOutside", "closeAutoFocus"]);

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const forwarded = useForwardPropsEmits(delegatedProps, emits);

const theme = useTheme(
    "ControlSelectContent",
    props,
    reactive({
        position: toRef(props, "position"),
    }),
);
</script>

<template>
    <SelectPortal>
        <SelectContent
            data-slot="select-content"
            v-bind="{ ...$attrs, ...forwarded }"
            :class="[theme('root'), props.class]"
        >
            <ControlSelectScrollUpButton />
            <SelectViewport :class="[theme('viewport')]">
                <slot />
            </SelectViewport>
            <ControlSelectScrollDownButton />
        </SelectContent>
    </SelectPortal>
</template>
