<script setup>
import { useObject } from "@arrai-innovations/reactive-helpers";
import LinkModelView from "@vueda/components/LinkModelView.vue";
import { useTheme } from "@vueda/use/useTheme.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { computed, reactive, toRef } from "vue";

const props = defineProps({
    ...WIDGET_PROPS,
    app: {
        type: String,
        default: undefined,
    },
    model: {
        type: String,
        default: undefined,
    },
    pkKey: {
        type: String,
        default: "id",
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useTheme("WidgetReadOnly", widgetContext.state);
const validAndActive = computed(() => !!(props.app && props.model && widgetContext.state.combinedValue));
const instanceObjectProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    pkKey: toRef(props, "pkKey"),
    pk: widgetContext.state.combinedValue,
    retrieveArgs: {
        f: [],
    },
    intendToRetrieve: validAndActive,
});
const instanceObject = useObject({
    props: instanceObjectProps,
});

const readonlyValue = computed(() => {
    return instanceObject.state?.object?.formatted_name;
});
</script>

<template>
    <div :class="theme('root')">
        <div :class="theme('inner')">
            <div v-if="!hidden" :class="theme('label')">
                <slot :label="widgetContext.state.combinedLabel" name="label">{{
                    widgetContext.state.combinedLabel
                }}</slot>
            </div>
            <div :class="theme('input')" v-bind="$attrs">
                <slot :value="readonlyValue">
                    <link-model-view
                        v-if="readonlyValue"
                        :app="app"
                        :button-class="{
                            root: 'px-0 py-0 gap-0 leading-none',
                            label: 'text-primary hover:underline',
                        }"
                        class="whitespace-nowrap grow shrink-0"
                        :label="readonlyValue"
                        :model="model"
                        :pk="widgetContext.state.combinedValue"
                        view="update"
                    />
                    <span v-else>
                        {{ widgetContext.state.combinedValue }}
                    </span>
                </slot>
            </div>
        </div>
    </div>
</template>
