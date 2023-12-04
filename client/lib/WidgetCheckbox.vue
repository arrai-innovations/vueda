<script setup>
import useWidget, { widgetProps, widgetEmits } from '@vueda/use/useWidget.js';
import FieldLabel from "@vueda/FieldLabel.vue";

const props = defineProps({
    ...widgetProps,
});
const emit = defineEmits([...widgetEmits]);
const widget = useWidget(props, emit);
</script>
<template>
    <div>
        <input type="checkbox"
               :name="widget.combinedName"
               v-model="widget.combinedValue"
        />
        <field-label :for="widget.combinedName" :label="props.label" :outer-slots="$slots"/>
    </div>
</template>
