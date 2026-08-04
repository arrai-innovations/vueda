<script setup>
import "@vueda/theme/vueda-tailwind/feedback/AlertClose.theme.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A close button for dismissing an alert. Renders a slotted button that emits a `close` event when clicked.
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
});

const emit = defineEmits({
    /** Emitted when the close action is triggered. */
    close: null,
});

const theme = useTheme("AlertClose", props);
const icon = useIcons("AlertClose", props);
</script>

<template>
    <button
        data-slot="alert-close"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        @click="emit('close')"
    >
        <slot>
            <component
                :is="icon('close').component"
                v-if="icon('close')"
                v-bind="icon('close').props"
                aria-hidden="true"
            />
            <span v-else aria-hidden="true">&#x2715;</span>
            <span class="sr-only">Close</span>
        </slot>
    </button>
</template>
