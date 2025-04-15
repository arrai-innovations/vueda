import { keyDiff } from "@arrai-innovations/reactive-helpers";
import cloneDeep from "lodash-es/cloneDeep.js";
import get from "lodash-es/get.js";
import isEqual from "lodash-es/isEqual.js";
import { computed, effectScope, reactive, unref, watch } from "vue";

/**
 * @typedef {import('vue').Ref<string>} FieldRef
 * @typedef {import('vue').Ref<string[]>} DependencyPathsRef
 * @typedef {import('vue').Reactive<object>} FormValues
 */

/**
 * @typedef {object} FieldDependencyValuesRegistry
 * @property {(fieldRef: FieldRef, dependencyPathsRef: DependencyPathsRef) => string} register - Register a field with its dependency paths.
 * @property {(registryId: string) => boolean} unregister - Unregister a field.
 * @property {import('vue').Reactive<{ [dependencyPath: string]: any }>} dependencyValues - Current dependency values.
 * @property {() => void} stop - Cleanup all reactive effects.
 */

/**
 * Tracks values for registered dependency paths on form fields.
 *
 * @param {FormValues} formValues - The reactive form data object.
 * @returns {FieldDependencyValuesRegistry}
 */
export function useFieldDependencyValuesRegistry(formValues) {
    const dependencyValuesByFieldName = reactive({});
    // map of result dependency objects, which map values to their original paths, by registry ID
    const dependencyValuesByFieldId = reactive({});
    // map of field refs and their dependency paths by registry ID
    const fieldRegistryRefs = reactive({});
    // map of watch stop functions, by registry ID
    const fieldWatchStops = {};
    const fieldComputedStops = {};
    // the container for the main effect scope, so that all individual effect scopes stop when we unmount
    const mainEffectScope = effectScope();
    const makeFieldValueId = (fieldName) => `${fieldName}-${Math.random().toString(36).slice(2, 10)}`;
    const valueRegistryIdToAbsPath = reactive({});
    const valueRegistryRelToAbsPathPerFieldRegistryId = reactive({});
    const valueComputedStopsByAbsPath = {};
    const valueRefCountByAbsPath = reactive({});

    const incrementRefCount = (absPath) => {
        valueRefCountByAbsPath[absPath] = (valueRefCountByAbsPath[absPath] ?? 0) + 1;
    };
    const decrementRefCount = (absPath) => {
        valueRefCountByAbsPath[absPath] = (valueRefCountByAbsPath[absPath] ?? 0) - 1;
    };

    const makeValueId = (fieldRegistryId, dependencyPath) => {
        return `${fieldRegistryId}:${dependencyPath}`;
    };

    const setDependencyValue = (fieldRegistryId, dependencyPath, value) => {
        if (!dependencyValuesByFieldId[fieldRegistryId]) {
            dependencyValuesByFieldId[fieldRegistryId] = {};
        }
        dependencyValuesByFieldId[fieldRegistryId][dependencyPath] = value;
    };
    const unsetDependencyValue = (fieldRegistryId, dependencyPath) => {
        delete dependencyValuesByFieldId[fieldRegistryId][dependencyPath];
        if (Object.keys(dependencyValuesByFieldId[fieldRegistryId]).length === 0) {
            delete dependencyValuesByFieldId[fieldRegistryId];
        }
    };

    const registerValue = (fieldRegistryId, dependencyPath) => {
        const valueRegistryId = makeValueId(fieldRegistryId, dependencyPath);

        if (!valueRegistryRelToAbsPathPerFieldRegistryId[fieldRegistryId]) {
            valueRegistryRelToAbsPathPerFieldRegistryId[fieldRegistryId] = {};
        }

        let absPath = dependencyPath;

        if (dependencyPath.startsWith("$parent")) {
            const fieldPath = fieldRegistryRefs[fieldRegistryId]?.field;
            if (typeof fieldPath === "string") {
                const parentPath = fieldPath.split(".").slice(0, -1).join(".");
                absPath = dependencyPath.replace("$parent", parentPath);
            } else {
                throw new Error(`Cannot resolve $parent because fieldRef for ${fieldRegistryId} is not set.`);
            }
        }

        valueRegistryIdToAbsPath[valueRegistryId] = absPath;

        if (!valueRegistryRelToAbsPathPerFieldRegistryId[fieldRegistryId][absPath]) {
            valueRegistryRelToAbsPathPerFieldRegistryId[fieldRegistryId][absPath] = [];
        }
        if (!valueRegistryRelToAbsPathPerFieldRegistryId[fieldRegistryId][absPath].includes(dependencyPath)) {
            valueRegistryRelToAbsPathPerFieldRegistryId[fieldRegistryId][absPath].push(dependencyPath);
        }

        if (!valueComputedStopsByAbsPath[absPath]) {
            valueComputedStopsByAbsPath[absPath] = mainEffectScope.run(() => {
                return computed(() => {
                    return get(formValues, absPath);
                });
            });
        }
        setDependencyValue(fieldRegistryId, dependencyPath, valueComputedStopsByAbsPath[absPath]);
        incrementRefCount(absPath);
    };

    const unregisterValue = (fieldRegistryId, dependencyPath) => {
        const valueRegistryId = makeValueId(fieldRegistryId, dependencyPath);
        const absPath = valueRegistryIdToAbsPath[valueRegistryId];

        decrementRefCount(absPath);
        unsetDependencyValue(fieldRegistryId, dependencyPath);
        if (valueRefCountByAbsPath[absPath] <= 0) {
            valueComputedStopsByAbsPath[absPath].stop();
            delete valueComputedStopsByAbsPath[absPath];
            delete valueRefCountByAbsPath[absPath];
        }
        delete valueRegistryRelToAbsPathPerFieldRegistryId[fieldRegistryId][absPath];

        if (Object.keys(valueRegistryIdToAbsPath).length === 0) {
            delete valueRegistryIdToAbsPath[valueRegistryId];
        }
    };

    const registerField = (fieldRef, dependencyPathsRef) => {
        const initialName = unref(fieldRef);
        let fieldId = makeFieldValueId(initialName);
        while (fieldRegistryRefs[fieldId]) {
            fieldId = makeFieldValueId(initialName);
        }
        fieldRegistryRefs[fieldId] = { field: fieldRef, dependencyPaths: dependencyPathsRef };
        fieldWatchStops[fieldId] = mainEffectScope.run(() => {
            return watch(
                [
                    () => cloneDeep(fieldRegistryRefs[fieldId].field),
                    () => cloneDeep(fieldRegistryRefs[fieldId].dependencyPaths),
                ],
                ([newName, newPaths], [oldName, oldPaths]) => {
                    let pathsToUnregister = [];
                    let pathsToRegister = [];
                    if (!isEqual(newName, oldName)) {
                        pathsToUnregister = oldPaths;
                        pathsToRegister = newPaths;
                        if (fieldComputedStops[fieldId]) {
                            fieldComputedStops[fieldId].stop();
                            delete fieldComputedStops[fieldId];
                        }
                        if (dependencyValuesByFieldName[oldName]) {
                            delete dependencyValuesByFieldName[oldName];
                        }
                        fieldComputedStops[fieldId] = mainEffectScope.run(() => {
                            return computed(() => {
                                return dependencyValuesByFieldId[fieldId];
                            });
                        });
                        dependencyValuesByFieldName[newName] = fieldComputedStops[fieldId];
                    } else if (!isEqual(newPaths, oldPaths)) {
                        const { removedKeys, addedKeys } = keyDiff(newPaths, oldPaths, { sameKeys: false });
                        pathsToUnregister = Array.from(removedKeys);
                        pathsToRegister = Array.from(addedKeys);
                    }
                    if (pathsToUnregister) {
                        for (const path of pathsToUnregister) {
                            unregisterValue(fieldId, path);
                        }
                    }
                    if (pathsToRegister) {
                        for (const path of pathsToRegister) {
                            registerValue(fieldId, path);
                        }
                    }
                },
                { immediate: true },
            );
        });

        return fieldId;
    };

    const unregisterField = (id) => {
        if (fieldRegistryRefs[id]) {
            fieldWatchStops[id]();
            delete fieldWatchStops[id];
            delete fieldRegistryRefs[id];

            for (const path of Object.keys(valueRegistryRelToAbsPathPerFieldRegistryId[id])) {
                unregisterValue(id, path);
            }
        }
    };

    return {
        dependencyValues: dependencyValuesByFieldName,
        register: registerField,
        unregister: unregisterField,
        stop: () => mainEffectScope.stop(),
    };
}
