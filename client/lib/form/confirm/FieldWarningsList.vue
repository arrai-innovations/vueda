<script setup>
import "@vueda/theme/vueda-tailwind/form/FieldWarningsList.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import { NON_FIELD_ERRORS_KEY } from "@vueda/utils/constants.js";
import { computed } from "vue";

/**
 * Renders a warnings mapping keyed by field (the shape both `get_warnings()` and
 * `get_transition_warnings()` return for a single object: `{field: [messages]}`, with
 * `non_field_errors` for messages not tied to a field). `non_field_errors` renders first as a
 * plain, unlabeled list; every other field renders inline (`label: message`) when it carries
 * exactly one message, or as its own sub-header plus list when it carries more.
 *
 * A field is named by its label from `fieldDetails`, so the confirmation calls a field what the
 * form above it calls it. With no entry there it falls back to the start-cased field name.
 *
 * The `entry` slot overrides one field's entire layout (the header/list/inline decision
 * included).
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Warnings keyed by field, `non_field_errors` for messages not tied to a field. */
    messages: {
        type: Object,
        required: true,
    },
    /** Map of field name to field metadata (e.g. `{ label }`) used to derive human-readable labels. */
    fieldDetails: {
        type: Object,
        default: () => ({}),
    },
    /**
     * Additional CSS classes applied to the root.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("FieldWarningsList", props);

const entries = computed(() => {
    const fields = Object.entries(props.messages ?? {}).map(([field, messages]) => ({
        field,
        label: props.fieldDetails?.[field]?.label || memoizedStartCase(field),
        messages: Array.isArray(messages) ? messages : [messages],
    }));
    return fields.sort((a, b) => (a.field === NON_FIELD_ERRORS_KEY ? -1 : b.field === NON_FIELD_ERRORS_KEY ? 1 : 0));
});
</script>

<template>
    <div :class="[theme('root'), props.class]" data-qa="field-warnings-list">
        <template v-for="entry in entries" :key="entry.field">
            <!-- @slot [entry] Override one field's entire layout. Receives `field`, its resolved `label`, and `messages` (always an array). Falls back to the header/list/inline layout below. -->
            <slot name="entry" :field="entry.field" :label="entry.label" :messages="entry.messages">
                <ul v-if="entry.field === NON_FIELD_ERRORS_KEY" :class="theme('list')">
                    <li v-for="(warning, index) in entry.messages" :key="index" data-qa="form-confirm-warning">
                        {{ warning }}
                    </li>
                </ul>
                <p v-else-if="entry.messages.length === 1" :class="theme('fieldInline')" data-qa="form-confirm-warning">
                    <span :class="theme('fieldName')">{{ entry.label }}:</span>
                    {{ entry.messages[0] }}
                </p>
                <div v-else :class="theme('field')">
                    <p :class="theme('fieldName')" data-qa="form-confirm-warning-field">{{ entry.label }}</p>
                    <ul :class="theme('list')">
                        <li v-for="(warning, index) in entry.messages" :key="index" data-qa="form-confirm-warning">
                            {{ warning }}
                        </li>
                    </ul>
                </div>
            </slot>
        </template>
    </div>
</template>
