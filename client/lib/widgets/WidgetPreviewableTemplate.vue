<script setup>
import { WIDGET_EMITS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import WidgetHtml from "@vueda/widgets/WidgetHtml.vue";
import WidgetInput from "@vueda/widgets/WidgetInput.vue";
import WidgetTextarea from "@vueda/widgets/WidgetTextarea.vue";
import get from "lodash-es/get.js";
import omit from "lodash-es/omit.js";
import { computed } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    type: {
        type: String,
        default: "editor",
    },
    modelValue: {
        type: [String, Number, Array],
        default: undefined,
    },
    displayDependencies: {
        type: Array,
        default: () => [],
    },
    tagsKey: {
        type: String,
        default: "preview_tag_data",
    },
});
const computeddisplayDependencies = computed(() => {
    const deps = props.displayDependencies;
    return deps.includes(props.tagsKey) ? deps : [...deps, props.tagsKey];
});
const tags_data = computed(() => {
    return widgetContext.state.dependencyValues[props.tagsKey];
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const renderedContent = computed(() => {
    const text = widgetContext.state.combinedValue;
    if (!tags_data.value) {
        return text;
    }

    return text.replace(/\$(\w+)/g, (match, varName) => {
        return get(tags_data.value, [varName, "default"], "");
    });
});
const inputComponent = computed(
    () =>
        ({
            editor: WidgetHtml,
            input: WidgetInput,
            textarea: WidgetTextarea,
        })[props.type] || WidgetHtml,
);

const theme = useWidgetTheme("WidgetPreviewableTemplate");
</script>
<template>
    <div :class="theme('root')" data-qa="widget-previewable-template-root">
        <div :class="theme('inner')" data-qa="widget-previewable-template-inner">
            <div :class="theme('editorWrapper')" data-qa="widget-previewable-template-editor">
                <component
                    :is="inputComponent"
                    :display-dependencies="computeddisplayDependencies"
                    :model-value="modelValue"
                    v-bind="omit($attrs, 'value')"
                    @update:model-value="emit('update:modelValue', $event)"
                />
                <slot name="extra-legend" :display-dependencies="widgetContext.state.dependencyValues" />
            </div>
            <div :class="theme('previewWrapper')">
                <span :class="theme('label')">Preview: </span>
                <div
                    :class="theme('preview')"
                    :aria-labelledby="widgetContext.state.widgetId"
                    data-qa="widget-previewable-template-preview"
                    v-html="renderedContent"
                />
            </div>
        </div>
    </div>
</template>
