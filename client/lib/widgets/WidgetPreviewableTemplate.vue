<script setup>
import { WIDGET_EMITS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import { sanitizeMessage } from "@vueda/utils/html.js";
import WidgetHtml from "@vueda/widgets/WidgetHtml.vue";
import WidgetTextInput from "@vueda/widgets/WidgetTextInput.vue";
import WidgetTextTextarea from "@vueda/widgets/WidgetTextTextarea.vue";
import get from "lodash-es/get.js";
import omit from "lodash-es/omit.js";
import { computed } from "vue";

/**
 * A widget that combines an editable input (HTML editor, plain input, or textarea) with a live
 * preview pane that substitutes `$variable` placeholders using dependency data.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    /** The editor variant to render: `"editor"` (rich HTML), `"input"` (single-line), or `"textarea"`. */
    type: {
        type: String,
        default: "editor",
    },
    /** The current value of the template text. */
    modelValue: {
        type: [String, Number, Array],
        default: undefined,
    },
    /** Additional widget dependency keys whose values are made available for placeholder substitution. */
    displayDependencies: {
        type: Array,
        default: () => [],
    },
    /** The dependency key whose value supplies the tag substitution data for the preview. */
    tagsKey: {
        type: String,
        default: "preview_tag_data",
    },
});
const computeddisplayDependencies = computed(() => {
    const deps = props.displayDependencies;
    return deps.includes(props.tagsKey) ? deps : [...deps, props.tagsKey];
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const tagsData = computed(() => {
    return widgetContext.state.dependencyValues[props.tagsKey];
});
const renderedContent = computed(() => {
    let text = widgetContext.state.combinedValue;
    if (tagsData.value) {
        text = text.replace(/\$(\w+)/g, (match, varName) => {
            return get(tagsData.value, varName, "");
        });
    }
    return sanitizeMessage(text);
});
const inputComponent = computed(
    () =>
        ({
            editor: WidgetHtml,
            input: WidgetTextInput,
            textarea: WidgetTextTextarea,
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
                <!-- Additional content rendered below the editor, receiving the current dependency values as `displayDependencies`. -->
                <slot name="extra-legend" :display-dependencies="widgetContext.state.dependencyValues" />
            </div>
            <div :class="theme('previewWrapper')">
                <span :class="theme('label')">Preview: </span>
                <!-- eslint-disable vue/no-v-html -->
                <div
                    :class="theme('preview')"
                    :aria-labelledby="widgetContext.state.widgetId"
                    data-qa="widget-previewable-template-preview"
                    v-html="renderedContent"
                />
                <!-- eslint-enable vue/no-v-html -->
            </div>
        </div>
    </div>
</template>
