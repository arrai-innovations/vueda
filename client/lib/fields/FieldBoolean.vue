<script setup>
import useField, { fieldProps } from "@vueda/use/useField.js";
import { computed } from "vue";
import FieldHelp from "@vueda/fields/FieldHelp.vue";
import FieldMessages from "@vueda/fields/FieldMessages.vue";
import FieldLabel from "@vueda/fields/FieldLabel.vue";

const props = defineProps({
    ...fieldProps,
});
const fieldContext = useField(props);
const combinedProps = computed(() => ({
    ...fieldContext,
    ...props,
}));
</script>
<template>
    <div>
        <field-label
            v-if="label || $slots.label"
            :for="name" :label="label">
            <slot v-if="$slots.label" name="label" v-bind="combinedProps"/>
        </field-label>
        <slot v-bind="combinedProps"/>
        <field-help v-if="help || $slots.help" :help="help">
            <slot v-if="$slots.help" name="help" v-bind="combinedProps"/>
        </field-help>
        <field-messages
            :messages="fieldContext.errors">
            <slot v-if="$slots.errors" name="errors" v-bind="combinedProps"/>
        </field-messages>
        <field-messages
            :messages="fieldContext.messages">
            <slot v-if="$slots.messages" name="messages" v-bind="combinedProps"/>
        </field-messages>
    </div>
</template>
