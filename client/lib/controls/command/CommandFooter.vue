<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A chin below CommandList that surfaces keyboard-navigation hints and custom
 * action labels. The default slot replaces the layout entirely; the named
 * `start` and `end` slots fill the leading hint group and the trailing hint.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("CommandFooter", props);
</script>

<template>
    <div data-slot="command-footer" :class="[theme('root'), props.class]">
        <slot>
            <span :class="theme('hints')">
                <!-- @slot start Leading hint group; render any number of `kbd` and label spans. -->
                <slot name="start" />
            </span>
            <!-- @slot end Trailing hint, typically the dismiss affordance. -->
            <slot name="end" />
        </slot>
    </div>
</template>
