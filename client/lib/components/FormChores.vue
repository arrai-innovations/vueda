<script setup>
import FormFeedback from "@vueda/components/FormFeedback.vue";
import FormHelpText from "@vueda/components/FormHelpText.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { NON_FIELD_ERRORS_KEY } from "@vueda/utils/constants.js";
import { FieldContextSymbol, FormContextSymbol } from "@vueda/utils/symbols.js";
import omit from "lodash-es/omit.js";
import { computed, inject, onMounted, useAttrs } from "vue";

const props = defineProps({
    name: {
        type: String,
        default: undefined,
    },
    help: {
        type: String,
        default: undefined,
    },
    errors: {
        type: Object,
        default: null,
        description: "Errors to display, keyed by code.",
    },
    warnings: {
        type: Object,
        default: null,
        description: "Warnings to display, keyed by code.",
    },
    ...THEME_OVERRIDE_PROPS,
});
const formContext = inject(FormContextSymbol, null);
const fieldContext = inject(FieldContextSymbol, null);
onMounted(() => {
    if (!formContext && !fieldContext && (!props.name || !props.errors || !props.warnings)) {
        console.warn(
            "FormChores.vue must be used within a form context, a field context, a field name must be provided with [help]/errors/warnings.",
        );
    }
});
const computedName = computed(() =>
    props.name?.length ? props.name : (fieldContext?.state?.name ?? NON_FIELD_ERRORS_KEY),
);
const computedHelp = computed(() => (props.help?.length ? props.help : fieldContext?.state?.help));
const attrs = useAttrs();
const computedAttrsSansClass = computed(() => omit(attrs, ["class"]));
const theme = useTheme("FormChores", props);
</script>
<template>
    <div :class="theme('root')">
        <form-help-text v-if="computedHelp" :class="theme('item')" :help="computedHelp" v-bind="computedAttrsSansClass">
            <template v-if="$slots[`field(${computedName})help`]" #default="slotProps">
                <slot :name="`field(${computedName})help`" v-bind="slotProps" />
            </template>
            <template v-else-if="$slots[`field-help`]" #default="slotProps">
                <slot name="field-help" v-bind="slotProps" />
            </template>
        </form-help-text>
        <form-feedback :class="theme('item')" :messages="props.errors" type="error" v-bind="computedAttrsSansClass">
            <template v-if="$slots[`field(${computedName})error`]" #default="slotProps">
                <slot :name="`field(${computedName})error`" v-bind="slotProps" />
            </template>
            <template v-else-if="$slots[`field-error`]" #error="slotProps">
                <slot name="field-error" v-bind="slotProps" />
            </template>
        </form-feedback>
        <form-feedback :class="theme('item')" :messages="props.warnings" type="message" v-bind="computedAttrsSansClass">
            <template v-if="$slots[`field(${computedName})message`]" #default="slotProps">
                <slot :name="`field(${computedName})message`" v-bind="slotProps" />
            </template>
            <template v-else-if="$slots[`field-message`]" #message="slotProps">
                <slot name="field-message" v-bind="slotProps" />
            </template>
        </form-feedback>
    </div>
</template>
