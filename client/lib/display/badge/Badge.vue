<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { Primitive } from "reka-ui";
import { reactive, toRef } from "vue";

/**
 * A badge component built on Reka UI's Primitive, supporting variant styles.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Visual style variant.
     * @type {('default'|'secondary'|'destructive'|'outline')}
     */
    variant: { type: String, default: undefined },
    /**
     * Render as a numeric badge (count / digit). Switches to a fixed-width mono recipe so
     * single-, double-, and triple-digit values align across rows.
     */
    numeric: { type: Boolean, default: false },
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const theme = useTheme(
    "Badge",
    props,
    reactive({ variant: toRef(props, "variant"), numeric: toRef(props, "numeric") }),
);
</script>

<template>
    <Primitive data-slot="badge" :class="[theme('root'), props.class]" v-bind="delegatedProps">
        <slot />
    </Primitive>
</template>
