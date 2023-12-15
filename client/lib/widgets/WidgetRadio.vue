<script setup>
import useWidget, { widgetProps, widgetEmits } from '@vueda/use/useWidget.js';
import FieldLabel from "@vueda/fields/FieldLabel.vue";

const props = defineProps({
    ...widgetProps,
    options: {
        type: Array,
        required: true
    }
});
const emit = defineEmits([...widgetEmits]);
const widget = useWidget(props, emit);
</script>

<template>
    <div>
        <div v-for="option in props.options" :key="option.value">
            <input type="radio"
                   :value="option.value"
                   :name="widget.combinedName"
                   v-model="widget.combinedValue"
                   :id="`${widget.combinedName}-${widget.combinedValue}-${widget.widgetId}`"
            />
            <field-label :for="`${widget.combinedName}-${widget.combinedValue}-${widget.widgetId}`" :label="option.label" />
        </div>
    </div>
</template>
