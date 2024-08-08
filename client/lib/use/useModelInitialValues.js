import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { getAppModelDotName } from "@vueda/utils/crudSupport.js";
import { computed, reactive, readonly, shallowReactive, unref, watch } from "vue";

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
    const modelInfoStore = storeModelInfo();
    const internalState = reactive({
        infoFields: {},
        displayFields: {},
    });

    const initialValues = shallowReactive({});
    watch(
        [app, model],
        ([appName, model], [oldAppName, oldModel]) => {
            if (appName && model && (appName !== oldAppName || model !== oldModel)) {
                modelInfoStore.fetchModelInfo(appName, model);
            }
        },
        { immediate: true },
    );

    const appModelKey = computed(() => getAppModelDotName({ app: unref(app), model: unref(model) }));

    watch(
        () => modelInfoStore.modelInfos[appModelKey.value],
        (modelInfo) => {
            assignReactiveObject(internalState.infoFields, modelInfo?.fields || {});
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
        ([fieldObjects, fields]) => {
            if (Object.keys(fieldObjects || {}).length && Object.keys(fields || {}).length) {
                const newInitialValues = {};
                Object.entries(fieldObjects).forEach(([fieldKey, fieldObj]) => {
                    if (Object.values(fields).includes(fieldKey) && fieldKey !== "pk") {
                        newInitialValues[fieldKey] = builtInTypes[fieldObj.type];
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
