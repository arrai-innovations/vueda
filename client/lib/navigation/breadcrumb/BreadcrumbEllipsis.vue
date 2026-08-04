<script setup>
import "@vueda/theme/vueda-tailwind/navigation/BreadcrumbEllipsis.theme.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactive, toRef } from "vue";

/**
 * An ellipsis indicator for collapsed breadcrumb items. Defaults to an
 * ornamental span; set `interactive` to render a focusable button suitable
 * for triggering a dropdown of collapsed trail levels.
 */
defineOptions({});

const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /**
     * When true, the ellipsis renders as a `<button>` with hover and
     * focus-visible styling, intended as the trigger for a collapsed-trail
     * dropdown. When false (default), it renders as an ornamental `<span>`.
     */
    interactive: { type: Boolean, default: false },
});

const theme = useTheme("BreadcrumbEllipsis", props, reactive({ interactive: toRef(props, "interactive") }));
const icon = useIcons("BreadcrumbEllipsis", props);
</script>

<template>
    <component
        :is="props.interactive ? 'button' : 'span'"
        data-slot="breadcrumb-ellipsis"
        :type="props.interactive ? 'button' : undefined"
        :role="props.interactive ? undefined : 'presentation'"
        :aria-hidden="props.interactive ? undefined : true"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <component :is="icon('ellipsis').component" v-if="icon('ellipsis')" v-bind="icon('ellipsis').props" />
        <span :class="theme('label')">More</span>
    </component>
</template>
