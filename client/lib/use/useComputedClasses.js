import isFunction from "lodash-es/isFunction.js";
import { computed, effectScope } from "vue";

/**
 * A hook to get the classes for a given key and kwargs. Uses computeds for caching.
 *
 * @param {{[key: string]: {class: (any | ((kwargs: object) => any))}}} config - The configuration, with keys containing classes.
 * @param {import('vue').UnwrapNestedRefs<object>} props - The reactive props to pass to the class function.
 * @param {(key: string, kwargs: object) => string} [keyFn] - A function to modify a key based on kwargs.
 * @returns {(key: string, kwargs?: import('vue').UnwrapNestedRefs<object>) => any} A function that returns the classes for a given key and kwargs.
 */
export function useComputedClasses(config, props, keyFn) {
    const computeds = {};
    const es = effectScope();

    return (key, kwargs = {}) => {
        if (!config[key]) {
            throw new Error(`No theme config found for ${key}`);
        }
        if (!config[key].class) {
            return {};
        }
        if (!isFunction(config[key].class)) {
            return config[key].class;
        }
        let myKey = key;
        if (keyFn) {
            // This allows us to have different computed properties for the same key based on kwargs
            myKey = keyFn(key, kwargs);
        }
        if (!computeds[myKey]) {
            es.run(() => {
                computeds[myKey] = computed(() =>
                    config[key].class({
                        ...props,
                        ...kwargs,
                    }),
                );
            });
        }
        return computeds[myKey].value;
    };
}
