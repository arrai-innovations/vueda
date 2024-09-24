import { useModelInfo } from "@vueda/use/useModelInfo.js";
import isEqual from "lodash-es/isEqual.js";
import { readonly, ref, watch } from "vue";

const builtInTypes = {
    DateRangeField: null,
    TextField: "",
    CharField: "",
    BooleanField: false,
    DateField: null,
    DateTimeField: null,
    DecimalField: undefined,
    FloatField: undefined,
    IntegerField: undefined,
    PositiveIntegerField: undefined,
    PositiveSmallIntegerField: undefined,
    SmallIntegerField: undefined,
    TimeField: null,
    EmailField: "",
    URLField: "",
    UUIDField: "",
    ForeignKey: "",
    ManyToManyField: "",
    OneToOneField: "",
    JSONField: null,
    ArrayField: undefined,
    BinaryField: "",
    FilePathField: "",
    IPAddressField: "",
    GenericIPAddressField: "",
    SlugField: "",
    FileField: "",
    ImageField: "",
    AutoField: "",
    BigAutoField: "",
    BigIntegerField: undefined,
    DurationSecondsField: "",
    GenericRelation: null,
    GenericForeignKey: null,
    NullBooleanField: false,
    PositiveBigIntegerField: null,
    PositiveDecimalField: null,
    ManyRelatedField: null,
};

export const getFieldInitialValue = (fieldDetail) => {
    if (fieldDetail.many) {
        return undefined;
    }
    return builtInTypes[fieldDetail.typeModel];
};
/**
 * @typedef {import("vue").DeepReadonly<import("vue").Ref<{[key: string]: any}>>} InitialValues
 */

/**
 * Returns the initial values for a model, so that a blank form can be created, without fields being mutated
 *  immediately by coercion of values, causing a form to be dirty.
 *
 * @param {import('vue').Ref<string>} app - A ref containing the app name that is being watched.
 * @param {import('vue').Ref<string>} model - A ref containing the model name that is being watched.
 * @param {import("vue").Ref<string[]>} fields - A ref containing the field names to display.
 * @returns {InitialValues} An object containing the initial values for the model.
 */
export function useModelInitialValues(app, model, fields) {
    const modelInfo = useModelInfo(app, model);

    const initialValues = ref({});

    watch(
        [() => modelInfo.info.fields, fields],
        ([newFieldDetails, newFields]) => {
            const rawNewFieldDetails = newFieldDetails;
            const rawNewFields = newFields;
            if (Object.keys(rawNewFieldDetails || {}).length && rawNewFields?.length) {
                const newInitialValues = {};
                Object.entries(rawNewFieldDetails).forEach(([fieldKey, fieldDetail]) => {
                    if (rawNewFields.includes(fieldKey) && fieldKey !== "pk") {
                        newInitialValues[fieldKey] = getFieldInitialValue(fieldDetail);
                    }
                });
                if (!isEqual(initialValues.value, newInitialValues)) {
                    initialValues.value = newInitialValues;
                }
            } else {
                if (!isEqual(initialValues.value, {})) {
                    initialValues.value = {};
                }
            }
        },
        { immediate: true, deep: true },
    );

    return readonly(initialValues);
}
