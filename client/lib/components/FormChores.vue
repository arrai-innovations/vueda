<script setup>
import FormFeedback from "@vueda/components/FormFeedback.vue";
import FormHelpText from "@vueda/components/FormHelpText.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
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
const fieldContext = inject(FieldContextSymbol, null);
onMounted(() => {
    if (!fieldContext && !props.name && (!props.errors || !props.warnings)) {
        console.warn(
            "FormChores.vue must be used within a field context, a field name must be provided, or [help]/errors/warnings must be provided.",
        );
    }
});
const computedName = computed(() => (props.name?.length ? props.name : fieldContext?.state?.name));
const computedHelp = computed(() => (props.help?.length ? props.help : fieldContext?.state?.help));
const attrs = useAttrs();
const computedAttrsSansClass = computed(() => omit(attrs, ["class"]));
const theme = useTheme("FormChores", props);
</script>
<template>
    <div :class="theme('root')">
        <form-help-text
            v-if="computedHelp"
            :class="theme('item')"
            :help="computedHelp"
            :theme-override="themeOverride"
            v-bind="computedAttrsSansClass"
        >
            <template v-if="$slots[`field(${computedName})help`]" #default="slotProps">
                <slot :name="`field(${computedName})help`" v-bind="slotProps" />
            </template>
            <template v-else-if="$slots[`field-help`]" #default="slotProps">
                <slot name="field-help" v-bind="slotProps" />
            </template>
        </form-help-text>
        <form-feedback
            :class="theme('item')"
            :messages="props.errors"
            :theme-override="themeOverride"
            type="error"
            v-bind="computedAttrsSansClass"
        >
            <template v-if="$slots[`field(${computedName})error`]" #default="slotProps">
                <slot :name="`field(${computedName})error`" v-bind="slotProps" />
            </template>
            <template v-else-if="$slots[`field-error`]" #error="slotProps">
                <slot name="field-error" v-bind="slotProps" />
            </template>
        </form-feedback>
        <form-feedback
            :class="theme('item')"
            :messages="props.warnings"
            :theme-override="themeOverride"
            type="message"
            v-bind="computedAttrsSansClass"
        >
            <template v-if="$slots[`field(${computedName})message`]" #default="slotProps">
                <slot :name="`field(${computedName})message`" v-bind="slotProps" />
            </template>
            <template v-else-if="$slots[`field-message`]" #message="slotProps">
                <slot name="field-message" v-bind="slotProps" />
            </template>
        </form-feedback>
    </div>
</template>
