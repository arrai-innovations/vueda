import camelCase from "lodash-es/camelCase.js";
import { computed, useAttrs } from "vue";
import { deepUnref } from "vue-deepunref";

/**
 * Filter an object down to only include keys in the list, if they exist.
 *
 * Unlike lodash pick, this function does not deal with paths, but does allow for a Set of keys.
 *
 * @param {{ [key: string]: any }} object - The object to pick from
 * @param {...(string|string[]|Set<string>)} keysOrSet - The keys to pick.
 * @returns {{ [key: string]: any }} - The object with only the picked keys.
 */
function pick(object, ...keysOrSet) {
    if (keysOrSet.length === 1 && keysOrSet[0] instanceof Set) {
        return Object.fromEntries(Object.entries(object).filter(([key]) => keysOrSet[0].has(key)));
    }
    keysOrSet = keysOrSet.flat();
    return Object.fromEntries(Object.entries(object).filter(([key]) => keysOrSet.includes(key)));
}

/**
 * Omit keys from an object, returning a new object.
 *
 * Unlike lodash omit, this function does not deal with paths, but does allow for a Set of keys.
 *
 * @param {{ [key: string]: any }} object - The object to omit from.
 * @param {...(string|string[]|Set<string>)} keys - The keys to omit.
 * @returns {{ [key: string]: any }} - The object with the omitted keys.
 */
function omit(object, ...keys) {
    if (keys.length === 1 && keys[0] instanceof Set) {
        return Object.fromEntries(Object.entries(object).filter(([key]) => !keys[0].has(key)));
    }
    keys = keys.flat();
    return Object.fromEntries(Object.entries(object).filter(([key]) => !keys.includes(key)));
}

/**
 * Filter attrs to prevent excessive attrs from being rendered.
 *
 * @param {string[]|Set<string>} pickList - The list of attrs to pick.
 * @param {string[]|Set<string>} omitList - The list of attrs to omit.
 * @param {import('vue').UnwrapNestedRefs<{ [key: string]: any }>} [attrs=null] - The attrs to filter.
 * @returns {import('vue').ComputedRef<{ [key: string]: any }>} - The filtered attrs.
 */
export function useFilteredAttrs(pickList, omitList, attrs = null) {
    if (attrs === null) {
        attrs = useAttrs();
    }
    return computed(() => {
        let filteredAttrs = deepUnref(attrs);
        // vue translates props, but not attrs, from kebab-case to camelCase
        // to avoid confusion, we convert them here, to match the allow or deny lists
        filteredAttrs = Object.fromEntries(
            Object.entries(filteredAttrs).map(([key, value]) => [camelCase(key), value]),
        );
        if (pickList?.length || pickList?.size) {
            filteredAttrs = pick(filteredAttrs, pickList);
        }
        if (omitList?.length || omitList?.size) {
            filteredAttrs = omit(filteredAttrs, omitList);
        }
        return filteredAttrs;
    });
}
