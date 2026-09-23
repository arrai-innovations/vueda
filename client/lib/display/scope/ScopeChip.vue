<script setup>
import "@vueda/theme/vueda-tailwind/display/ScopeChip.theme.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * Renders one list scope as a read-only pill. A scope is a list constraint
 * supplied by a link or by application code that has no editable input, so the
 * label segment only describes it; when the scope is clearable, a trailing
 * segment asks to clear it.
 */
defineOptions({});

const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
    ...THEME_OVERRIDE_PROPS,
    /** Readable description of the scope, such as "2 selected records" or a batch name. */
    label: {
        type: String,
        required: true,
    },
    /** When true, the chip shows a clear control. */
    clearable: {
        type: Boolean,
        default: true,
    },
});
const emit = defineEmits([
    /** Emitted when the reader activates the clear control. */
    "clear",
]);

const icon = useIcons("ScopeChip", props);
const theme = useTheme("ScopeChip", props);
</script>

<template>
    <span :class="theme('root')" data-qa="scope-chip">
        <span :class="theme('label')" :title="label" data-qa="scope-chip-label">
            <!-- @slot Replaces the label text. -->
            <slot>{{ label }}</slot>
        </span>
        <span v-if="clearable" :class="theme('divider')" aria-hidden="true" />
        <button
            v-if="clearable"
            type="button"
            :class="theme('remove')"
            :aria-label="`Clear scope: ${label}`"
            data-qa="scope-chip-clear"
            @click="emit('clear')"
        >
            <component
                :is="icon('close').component"
                v-if="icon('close')"
                v-bind="icon('close').props"
                aria-hidden="true"
            />
            <span v-else aria-hidden="true">&times;</span>
        </button>
    </span>
</template>
