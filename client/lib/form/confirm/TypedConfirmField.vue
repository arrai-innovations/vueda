<script setup>
import "@vueda/theme/vueda-tailwind/form/TypedConfirmField.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { useVModel } from "@vueuse/core";
import { computed, reactive, toRef, useId, watch } from "vue";

/**
 * Anti-mistake confirmation field that gates a destructive action until the
 * operator types the exact `expectedValue`. The default chrome is the
 * canonical "type it to mean it" recipe: a bordered, muted-tinted box
 * containing a small sans label with an inline mono chip showing the
 * expected literal, followed by a mono text input.
 *
 * Consumers read the match state via `v-model:match` (or the `match` event)
 * and disable their submit control while it is `false`. The raw typed value
 * is exposed via `v-model` for callers that need to inspect or echo it.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Literal string the operator must type before the field reports a match. */
    expectedValue: {
        type: String,
        required: true,
    },
    /** Typed value (v-model). */
    modelValue: {
        type: String,
        default: "",
    },
    /** Optional placeholder; falls back to `expectedValue` when omitted. */
    placeholder: {
        type: String,
        default: undefined,
    },
    /** Lead-in text rendered before the expected-value chip in the default label. */
    labelLead: {
        type: String,
        default: "Type",
    },
    /** Trailing text rendered after the expected-value chip in the default label. */
    labelTail: {
        type: String,
        default: "to confirm",
    },
    /** Explicit DOM id for the input; defaults to a Vue-generated id and is forwarded to the wrapping label. */
    inputId: {
        type: String,
        default: undefined,
    },
    /**
     * Additional CSS classes applied to the root.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const emit = defineEmits({
    /** Emitted on every keystroke with the latest typed value. */
    "update:modelValue": null,
    /** Emitted whenever the match state crosses; payload is `true` when the typed value equals `expectedValue`. */
    match: null,
});

const typed = useVModel(props, "modelValue", emit, { passive: true });

const autoId = useId();
const resolvedId = computed(() => props.inputId || autoId);
const resolvedPlaceholder = computed(() => (props.placeholder !== undefined ? props.placeholder : props.expectedValue));
const isMatch = computed(() => typed.value === props.expectedValue);

watch(isMatch, (next) => {
    emit("match", next);
});

const theme = useTheme("TypedConfirmField", props, reactive({ match: toRef(() => isMatch.value) }));
</script>

<template>
    <label
        :for="resolvedId"
        data-slot="typed-confirm-field"
        :data-match="isMatch ? 'true' : 'false'"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <span :class="theme('label')" data-qa="typed-confirm-field-label">
            <!-- @slot [label] Override the label content. Default renders `{labelLead}` + an inline `<code>` chip + `{labelTail}`. Receives `expectedValue` and `chipClass` slot props. -->
            <slot name="label" :expected-value="expectedValue" :chip-class="theme('expectedChip')">
                {{ labelLead }}
                <code :class="theme('expectedChip')" data-qa="typed-confirm-field-chip">{{ expectedValue }}</code>
                {{ labelTail }}
            </slot>
        </span>
        <input
            :id="resolvedId"
            v-model="typed"
            type="text"
            autocomplete="off"
            spellcheck="false"
            :placeholder="resolvedPlaceholder"
            :class="theme('input')"
            data-qa="typed-confirm-field-input"
            v-bind="$attrs"
        />
    </label>
</template>
