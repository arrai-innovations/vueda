/**
 * @module use/useFormModelProps
 * @description Builds the props that a view binds on its `FormModel`, in the documented configuration precedence.
 *
 * Three layers combine, and each later layer wins for the same key:
 *
 * 1. The model config's `formProps` for the view.
 * 2. The `formProps` object that the view received.
 * 3. The view's own form props, such as `fields` or `fieldProps`. A prop the view did not receive is
 *    `undefined`, and it leaves the earlier layers in place.
 *
 * A later layer replaces an earlier layer's value whole. A `fieldProps` map passed to the view replaces the
 * model config's `fieldProps` map, and does not merge with it key by key.
 *
 * `app`, `model`, and `view` select the configuration that `FormModel` reads, so the view always sets them.
 * The composable ignores those keys in either `formProps` layer and logs a console warning once per key.
 */
import { computed, toValue, watch } from "vue";

/** Props that select which configuration `FormModel` reads. A `formProps` layer cannot set them. */
export const FORM_MODEL_SELECTOR_PROPS = Object.freeze(["app", "model", "view"]);

/**
 * View props that a view forwards to `FormModel` under the same name. A view forwards its `formModelVariant`
 * prop as `variant`.
 */
export const VIEW_FORM_MODEL_PROPS = Object.freeze([
    "fields",
    "fieldDetails",
    "expand",
    "expandDetails",
    "fieldComponents",
    "widgetComponents",
    "fieldProps",
    "widgetProps",
]);

/**
 * Picks the form props that a view's options carry, keyed by `FormModel` prop name.
 *
 * @param {object} options - The view's props or composable options.
 * @returns {object} The values of {@link VIEW_FORM_MODEL_PROPS}, plus `variant` from `formModelVariant`. A prop that the options lack is `undefined`.
 */
export function pickViewFormModelProps(options) {
    const picked = { variant: options.formModelVariant };
    for (const key of VIEW_FORM_MODEL_PROPS) {
        picked[key] = options[key];
    }
    return picked;
}

const hyphenate = (key) => key.replace(/\B([A-Z])/g, "-$1").toLowerCase();

const warnedSelectorKeys = new Set();

/**
 * @typedef {object} FormModelPropsOptions
 * @property {import('vue').MaybeRefOrGetter<string>} app - Django app label that the view renders.
 * @property {import('vue').MaybeRefOrGetter<string>} model - Django model name that the view renders.
 * @property {import('vue').MaybeRefOrGetter<string>} view - View name whose model config the form reads.
 * @property {import('vue').MaybeRefOrGetter<object|undefined>} configFormProps - The model config's `formProps`.
 * @property {import('vue').MaybeRefOrGetter<object|undefined>} formProps - The `formProps` object that the view received.
 * @property {import('vue').MaybeRefOrGetter<object>} viewProps - The view's own form props, keyed by `FormModel` prop name. An `undefined` value counts as not passed.
 */

/**
 * Returns the props for a view's `FormModel`, merged in the documented precedence.
 *
 * Bind the result as the only source of `FormModel` props, so the template's binding order cannot change it.
 *
 * @param {FormModelPropsOptions} options
 * @returns {import('vue').ComputedRef<object>} The merged props, with `app`, `model`, and `view` set from the view.
 */
export function useFormModelProps({ app, model, view, configFormProps, formProps, viewProps }) {
    const ignoredSelectorKeys = computed(() => {
        const ignored = [];
        for (const [source, layer] of [
            ["model config formProps", toValue(configFormProps)],
            ["the view's formProps", toValue(formProps)],
        ]) {
            for (const key of FORM_MODEL_SELECTOR_PROPS) {
                if (layer && Object.hasOwn(layer, key)) {
                    ignored.push({ source, key });
                }
            }
        }
        return ignored;
    });

    watch(
        [ignoredSelectorKeys, () => toValue(app), () => toValue(model), () => toValue(view)],
        ([ignored, appValue, modelValue, viewValue]) => {
            for (const { source, key } of ignored) {
                const warnKey = `${appValue}.${modelValue}.${viewValue}.${source}.${key}`;
                if (warnedSelectorKeys.has(warnKey)) {
                    continue;
                }
                warnedSelectorKeys.add(warnKey);
                console.warn(
                    `The "${key}" key in ${source} for ${appValue}.${modelValue} (${viewValue}) is ignored. ` +
                        `"app", "model", and "view" select the configuration that the form reads, so the view sets ` +
                        `them. To change one view's form, set that view's layer of the model config.`,
                );
            }
        },
        { immediate: true },
    );

    return computed(() => {
        const merged = {
            ...(toValue(configFormProps) || {}),
            ...(toValue(formProps) || {}),
        };
        for (const [key, value] of Object.entries(toValue(viewProps) || {})) {
            if (value === undefined) {
                continue;
            }
            // A kebab-case key from a formProps layer names the same prop, so drop it rather than let Vue pick one.
            delete merged[hyphenate(key)];
            merged[key] = value;
        }
        for (const key of FORM_MODEL_SELECTOR_PROPS) {
            delete merged[key];
        }
        merged.app = toValue(app);
        merged.model = toValue(model);
        merged.view = toValue(view);
        return merged;
    });
}
