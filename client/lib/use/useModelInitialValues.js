import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import { useModelInfo } from "@vueda/use/useModelInfo.js";
import { reactive, readonly, toRef, watch } from "vue";

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
    ArrayField: null,
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

export function useModelInitialValues(app, model, fields) {
    const modelInfo = useModelInfo(app, model);
    const internalState = reactive({
        infoFields: {},
        displayFields: {},
    });

    const initialValues = reactive({});

    watch(
        toRef(modelInfo, "info"),
        (info) => {
            assignReactiveObject(internalState.infoFields, info?.fields || {});
        },
        { immediate: true },
    );

    watch(
        fields,
        (newFields) => {
            assignReactiveObject(internalState.displayFields, newFields ?? {});
        },
        { immediate: true, deep: true },
    );

    watch(
        [() => internalState.infoFields, () => internalState.displayFields],
        ([fieldDetails, fields]) => {
            if (Object.keys(fieldDetails || {}).length && Object.keys(fields || {}).length) {
                const newInitialValues = {};
                Object.entries(fieldDetails).forEach(([fieldKey, fieldDetail]) => {
                    if (Object.values(fields).includes(fieldKey) && fieldKey !== "pk") {
                        newInitialValues[fieldKey] = builtInTypes[fieldDetail.type];
                    }
                });
                assignReactiveObject(initialValues, newInitialValues);
            } else {
                assignReactiveObject(initialValues, {});
            }
        },
        { immediate: true, deep: true },
    );

    return readonly(initialValues);
}
