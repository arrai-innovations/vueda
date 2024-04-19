<script setup>
// using FormWrapper and storeModelInfo
// take in an app, model, and initial data
// display a form with appropriate inputs for the model
// validate the form with appropriate error messages
// emit the form data when the form is submitted
// expose method that can be called to initialize/reset the form
import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import FormWrapper from "@vueda/components/FormWrapper.vue";
import FieldBoolean from "@vueda/fields/FieldBoolean.vue";
import FieldDate from "@vueda/fields/FieldDate.vue";
import FieldNumber from "@vueda/fields/FieldNumber.vue";
import FieldObject from "@vueda/fields/FieldObject.vue";
import FieldString from "@vueda/fields/FieldString.vue";
import storeModelInfo from "@vueda/stores/storeModelInfo.js";
import { memoizedSnakeCase } from "@vueda/utils/index.js";
import WidgetCheckbox from "@vueda/widgets/WidgetCheckbox.vue";
// import WidgetHtml from "@vueda/widgets/WidgetHtml.vue";
import WidgetInput from "@vueda/widgets/WidgetInput.vue";
// import WidgetRadio from "@vueda/widgets/WidgetRadio.vue";
import WidgetSelect from "@vueda/widgets/WidgetSelect.vue";
import WidgetTextarea from "@vueda/widgets/WidgetTextarea.vue";
import isEqual from "lodash-es/isEqual.js";
import { computed, reactive, toRef, watch } from "vue";

const props = defineProps({
    app: {
        type: String,
        required: true,
    },
    model: {
        type: String,
        required: true,
    },
    initialData: {
        type: Object,
        default: () => ({}),
    },
});
const emit = defineEmits(["submit"]);

const modelInfoStore = storeModelInfo();
const myState = reactive({
    modelInfo: null,
    form: null,
    formErrors: null,
});
watch(
    [toRef(props, "app"), toRef(props, "model")],
    ([appName, model], [oldAppName, oldModel]) => {
        if (appName && model && (appName !== oldAppName || model !== oldModel)) {
            modelInfoStore.fetchModelInfo(appName, model);
        }
    },
    { immediate: true },
);
const appModelKey = computed(() => `${memoizedSnakeCase(props.app)}.${memoizedSnakeCase(props.model)}`);
watch(
    () => modelInfoStore.modelInfos[appModelKey.value],
    (modelInfo) => {
        if (modelInfo) {
            if (!isEqual(myState.modelInfo, modelInfo)) {
                assignReactiveObject(myState.modelInfo, modelInfoStore.modelInfos[appModelKey.value]);
            }
        } else {
            assignReactiveObject(myState.modelInfo, {});
        }
    },
    { immediate: true, deep: true },
);

const handleSubmit = (form) => {
    emit("submit", form);
};

const builtInTypes = {
    TextField: FieldString,
    CharField: FieldString,
    BooleanField: FieldBoolean,
    DateField: FieldDate,
    DateTimeField: FieldDate,
    DecimalField: FieldNumber,
    FloatField: FieldNumber,
    IntegerField: FieldNumber,
    PositiveIntegerField: FieldNumber,
    PositiveSmallIntegerField: FieldNumber,
    SmallIntegerField: FieldNumber,
    TimeField: FieldDate,
    EmailField: FieldString,
    URLField: FieldString,
    UUIDField: FieldString,
    ForeignKey: FieldString,
    ManyToManyField: FieldString,
    OneToOneField: FieldString,
    JSONField: FieldObject,
    ArrayField: FieldObject,
    BinaryField: FieldString,
    FilePathField: FieldString,
    IPAddressField: FieldString,
    GenericIPAddressField: FieldString,
    SlugField: FieldString,
    FileField: FieldString,
    ImageField: FieldString,
    AutoField: FieldString,
    BigAutoField: FieldString,
    BigIntegerField: FieldNumber,
    DurationField: FieldString,
    GenericRelation: FieldString,
    GenericForeignKey: FieldString,
    NullBooleanField: FieldBoolean,
    PositiveBigIntegerField: FieldNumber,
    PositiveDecimalField: FieldNumber,
};

const defaultWidgets = {
    FieldBoolean: WidgetCheckbox,
    FieldDate: WidgetInput,
    FieldNumber: WidgetInput,
    FieldObject: WidgetTextarea,
    FieldString: WidgetInput,
};

const djangoTypeToFieldComponent = (type) => {
    // todo: we should have a way to register custom field components
    return builtInTypes[type] || FieldString;
};
const getSlotName = (slotName, fieldName) => slotName.slice(`field-${fieldName}`.length) || "default";
// if the field has choices, use a select widget as the default
const getDefaultWidget = (field) => {
    if (field.choices) {
        return WidgetSelect;
    }
    if (field.type === "TextField") {
        return WidgetTextarea;
    }
    const fieldComponent = djangoTypeToFieldComponent(field.type);
    // todo: it would be nice to have a way to just specify a widget, in addition to having to pass as a slot
    return defaultWidgets[fieldComponent] || WidgetInput;
};
</script>

<template>
    <form-wrapper
        v-if="myState.modelInfo"
        :form="myState.form"
        :form-errors="myState.formErrors"
        :model-info="myState.modelInfo"
        @submit="handleSubmit"
    >
        <template #default="{ form }">
            <slot v-bind="{ form }" name="beforeFields" />
            <div v-for="field in myState.modelInfo.fields" :key="field.name">
                <slot v-bind="{ form, field }" :name="`${field.name}Before`" />
                <component :is="djangoTypeToFieldComponent(field.type)" v-bind="field">
                    <template
                        v-for="slotName in Object.keys($slots)
                            .filter((slot) => slot.startsWith(`field-${field.name}`))
                            .map((slot) => getSlotName(slot, field.name))"
                        :key="slotName"
                        #[slotName]
                    >
                        <slot v-bind="{ form, field }" :name="`field-${field.name}${slotName}`" />
                    </template>
                    <template v-if="!$slots[`field-${field.name}`]" #default>
                        <component :is="getDefaultWidget(field)" />
                    </template>
                </component>
                <slot v-bind="{ form, field }" :name="`${field.name}After`" />
            </div>
            <slot v-bind="{ form }" name="afterFields" />
        </template>
    </form-wrapper>
</template>

<style scoped></style>
