/**
 * @module use/useModelInitialValues
 * @description Derives sensible initial values for each field of a model based on field type mappings, supporting both create and edit scenarios.
 */
import { useModelInfo } from "@vueda/use/useModelInfo.js";
import { filterExpressions } from "@vueda/utils/filterLookups.js";
import isEqual from "lodash-es/isEqual.js";
import merge from "lodash-es/merge.js";
import { readonly, ref, watch } from "vue";

const fieldInitialValueMappings = {
    BooleanField: {
        BooleanField: false,
    },
    CharField: {
        CharField: "",
        TextField: "",
    },
    DateField: {
        DateField: null,
    },
    DateTimeField: {
        DateTimeField: null,
    },
    DecimalField: {
        DecimalField: null,
        PositiveDecimalField: null,
    },
    DurationSecondsField: {
        DurationField: null,
    },
    DurationField: {
        DurationField: null,
    },
    EmailField: {
        EmailField: "",
    },
    FileField: {
        FileField: null,
    },
    FloatField: {
        FloatField: null,
    },
    ImageField: {
        ImageField: null,
    },
    IntegerField: {
        AutoField: null,
        BigAutoField: null,
        BigIntegerField: null,
        IntegerField: null,
        PositiveBigIntegerField: null,
        PositiveIntegerField: null,
        PositiveSmallIntegerField: null,
        SmallIntegerField: null,
    },
    IPAddressField: {
        IPAddressField: "",
        GenericIPAddressField: null,
    },
    JSONField: {
        JSONField: null,
    },
    ManyRelatedField: {
        ManyToManyField: null,
        ForeignKey: null,
        ManyRelatedField: null,
    },
    NullBooleanField: {
        NullBooleanField: null,
    },
    PrimaryKeyRelatedField: {
        ForeignKey: null,
        OneToOneField: null,
        RelatedField: null,
    },
    SerializerField: {
        BinaryField: null,
    },
    SerializerMethodField: {
        GenericForeignKey: null,
        GenericRelation: null,
    },
    SlugField: {
        SlugField: null,
    },
    TimeField: {
        TimeField: null,
    },
    URLField: {
        URLField: "",
    },
    UUIDField: {
        UUIDField: null,
    },
};

/**
 * Merge custom field initial value mappings into the default set used for forms.
 *
 * @param {{ [key: string]: unknown }} customMappings - Additional mappings keyed by field type.
 * @returns {typeof fieldInitialValueMappings} The updated initial value field mappings.
 */
export function mergeModelInitialValuesMappings(customMappings) {
    return merge(fieldInitialValueMappings, customMappings);
}

/**
 * Returns the initial value for a field based on its type and model, or undefined for many-relations.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FieldDetail} fieldDetail - The field detail object.
 * @returns {unknown} The initial value for the field, or undefined.
 */
export const getFieldInitialValue = (fieldDetail) => {
    if (fieldDetail.many) {
        return undefined;
    }
    return fieldInitialValueMappings[fieldDetail.typeSerializer]?.[fieldDetail.typeModel];
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

/**
 * @typedef {import("vue").DeepReadonly<import("vue").Ref<{[key: string]: any}>>} InitialValues
 */

/**
 * Returns the initial values for the filters of a model, so that a blank form can be created, without fields being mutated
 *  immediately by coercion of values, causing a form to be dirty.
 *
 * @param {import('vue').Ref<string>} app - A ref containing the app name that is being watched.
 * @param {import('vue').Ref<string>} model - A ref containing the model name that is being watched.
 * @returns {InitialValues} An object containing the initial values for the model.
 */
export function useModelFilterInitialValues(app, model) {
    const modelInfo = useModelInfo(app, model);
    const initialValues = ref({});

    watch(
        [() => modelInfo.info.filtering],
        ([newFilteringDetails]) => {
            if (Object.keys(newFilteringDetails || {}).length) {
                const newInitialValues = {};
                Object.entries(newFilteringDetails).forEach(([filterableName, filterableDetail]) => {
                    const lookupExpressions = [];
                    for (const expression of filterExpressions) {
                        if (filterableDetail.lookupExprs.includes(expression.value)) {
                            lookupExpressions.push(expression);
                        }
                    }
                    const filterFields = [];
                    for (const expression of lookupExpressions) {
                        const key = `${filterableName}__${expression.value}`;
                        newInitialValues[key] = getFieldInitialValue(filterableDetail);
                        filterFields.push(`${filterableName}__${expression.value}`);
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
