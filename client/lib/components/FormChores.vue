<script setup>
import FormFeedback from "@vueda/components/FormFeedback.vue";
import FormHelpText from "@vueda/components/FormHelpText.vue";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject, onMounted } from "vue";

const props = defineProps({
    name: {
        type: String,
        default: undefined,
    },
    help: {
        type: Boolean,
        default: true,
    },
});
const fieldContext = inject(FieldContextSymbol, null);
onMounted(() => {
    if (!fieldContext && !props.name) {
        console.error("FormChores.vue must be used within a field context, or a field name must be provided.");
    }
});
const computedName = computed(() => props.name ?? fieldContext?.name);
</script>
<template>
    <form-help-text v-if="help">
        <template v-if="$slots[`field(${computedName})help`]" #default="slotProps">
            <slot :name="`field(${computedName})help`" v-bind="slotProps" />
        </template>
        <template v-else-if="$slots[`field-help`]" #default="slotProps">
            <slot name="field-help" v-bind="slotProps" />
        </template>
    </form-help-text>
    <form-feedback type="error">
        <template v-if="$slots[`field(${computedName})error`]" #default="slotProps">
            <slot :name="`field(${computedName})error`" v-bind="slotProps" />
        </template>
        <template v-else-if="$slots[`field-error`]" #error="slotProps">
            <slot name="field-error" v-bind="slotProps" />
        </template>
    </form-feedback>
    <form-feedback type="message">
        <template v-if="$slots[`field(${computedName})message`]" #default="slotProps">
            <slot :name="`field(${computedName})message`" v-bind="slotProps" />
        </template>
        <template v-else-if="$slots[`field-message`]" #message="slotProps">
            <slot name="field-message" v-bind="slotProps" />
        </template>
    </form-feedback>
</template>
