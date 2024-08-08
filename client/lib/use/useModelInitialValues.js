import {storeModelInfo} from "@vueda/stores/storeModelInfo.js";
import {computed, toRef, unref, watch} from "vue";
import {getAppModelDotName} from "@vueda/utils/crudSupport.js";
import isEqual from "lodash-es/isEqual.js";
import {assignReactiveObject} from "@arrai-innovations/reactive-helpers";

export function useModelInitialValues(app, model, fields) {
    debugger
    const modelInfoStore = storeModelInfo();

    watch(
        [app,model],
        ([appName, model], [oldAppName, oldModel]) => {
            if (appName && model && (appName !== oldAppName || model !== oldModel)) {
                modelInfoStore.fetchModelInfo(appName, model);
            }
        },
        { immediate: true },
    );

    const appModelKey = computed(() => getAppModelDotName({app:unref(app), model:unref(model) }));

    watch(
        () => modelInfoStore.modelInfos[appModelKey.value],
        (modelInfo) => {
            console.log("modelInfoStore.modelInfos: ",modelInfoStore.modelInfos)
            console.log("appModelKey.value: ",appModelKey.value)
            console.log("modelInfo.fields",modelInfo)
        },
        { immediate: true },
    );
}
