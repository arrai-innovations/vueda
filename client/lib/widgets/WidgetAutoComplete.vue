<script setup>
import { useList } from "@arrai-innovations/reactive-helpers";
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { allPagePaginatedListCrudAdaptor } from "@vueda/utils/listCrud.js";
import WidgetLabel from "@vueda/widgets/WidgetLabel.vue";
import AutoComplete from "primevue/autocomplete";
import { computed, reactive, ref, toRef } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    app: {
        type: String,
        required: true,
    },
    model: {
        type: String,
        required: true,
    },
    modelFields: {
        type: Array,
        default: () => [],
    },
    options: {
        type: Array,
        required: true,
    },
    label: {
        type: String,
        default: "",
    },
    variant: {
        type: String,
        default: "default",
    },
    fetchOptions: {
        type: Function,
        default: undefined,
    },
    searchKey: {
        type: String,
        default: "s",
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useComputedClasses(vuedaTailwind.WidgetAutoComplete, widgetContext.state);
const listSearch = ref(null);

const modelItem = computed(() => {
    if (props.options && props.options.length > 0) {
        const match = props.options?.find((option) => option.value == widgetContext.state.combinedValue);
        return match ?? widgetContext.state.combinedValue;
    }
    return undefined;
});
const modelListProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
        list: allPagePaginatedListCrudAdaptor,
    },
    retrieveArgs: {
        f: toRef(props, "modelFields"),
    },
    listArgs: {
        [props.searchKey]: listSearch,
    },
    intendToList: computed(() => listSearch.value),
});
const modelListInstance = useList({
    props: modelListProps,
});
const filteredOptions = computed(() => {
    return modelListInstance.state.loading ? [] : modelListInstance.state.objects;
});

const valueUpdated = (selected) => {
    if (selected && typeof selected === "object" && "value" in selected) {
        widgetContext.state.combinedValue = selected.value;
    } else if (props.multiple && selected && selected.length) {
        const selectedIds = selected.flatMap((i) => i.value);
        widgetContext.state.combinedValue = selectedIds;
    } else {
        widgetContext.state.combinedValue = selected;
    }
};
const search = (event) => {
    setTimeout(() => {
        if (!event.query.trim().length) {
            listSearch.value = event.query;
        }
    }, 250);
};
</script>
<template>
    props.options {{ props.options }}
    <div :class="theme('root')">
        <widget-label :label-class="theme('label')" :use-floating-label="props.useFloatingLabel">
            <template v-if="$slots.label" #label="slotProps">
                <slot name="label" v-bind="slotProps" />
            </template>
            <div :class="theme('inner')">
                <AutoComplete
                    dropdown
                    v-bind="$attrs"
                    force-selection
                    :loading="modelListInstance.state.loading"
                    :model-value="modelItem"
                    :name="widgetContext.state.combinedName"
                    option-label="label"
                    :suggestions="filteredOptions"
                    @blur="widgetContext.blur"
                    @complete="search"
                    @focus="widgetContext.focus"
                    @update:model-value="(selected) => valueUpdated(selected)"
                />
            </div>
        </widget-label>
    </div>
</template>
