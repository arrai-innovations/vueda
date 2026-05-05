<script setup>
import { useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * An ellipsis indicator for collapsed breadcrumb items.
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

const theme = useTheme("BreadcrumbEllipsis", props);
const icon = useIcons("BreadcrumbEllipsis");
</script>

<template>
    <span data-slot="breadcrumb-ellipsis" role="presentation" aria-hidden="true" :class="[theme('root'), props.class]">
        <slot name="icon">
            <component :is="icon('ellipsis').component" v-if="icon('ellipsis')" v-bind="icon('ellipsis').props" />
        </slot>
        <span :class="theme('label')">More</span>
    </span>
</template>
