<script setup>
import FieldLabel from "@vueda/fields/FieldLabel.vue";
import useWidget, { widgetEmits, widgetProps } from "@vueda/use/useWidget.js";

const props = defineProps({
    ...widgetProps,
});
const emit = defineEmits([...widgetEmits]);
const widget = useWidget(props, emit);
</script>
<template>
    <div>
        <input type="checkbox" :name="widget.combinedName" v-model="widget.combinedValue" />
        <field-label :for="widget.combinedName" :label="props.label" :outer-slots="$slots" />
    </div>
</template>
