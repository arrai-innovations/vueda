/**
 * @module use/useFormModelFieldSlots
 * @description Forwards a `FormModel`'s per-field slots to the `FormModelField` components inside it, and reports per-field slots that cannot reach a field.
 */
import { reportDevError } from "@vueda/utils/dev.js";
import { FormModelFieldSlotsSymbol } from "@vueda/utils/symbols.js";
import omit from "lodash-es/omit.js";
import { onMounted, provide, unref, watch } from "vue";

/** Slots that `FormModel` renders itself. Every other slot belongs to the fields. */
export const FORM_MODEL_OWN_SLOTS = ["before-fields", "after-fields", "form-level-chores", "fields", "default"];

// A slot that a field or widget component consumes, such as `widget(sku)`, `field(sku)label`, or `field-errors`.
const PER_FIELD_SLOT = /^(field|widget)[(-]/;
// A slot that targets one field by path, such as `widget(sku)` or `field(items[0].name)label`.
const FIELD_PATH_SLOT = /^(?:field|widget)\((.+?)\)/;

/**
 * The top-level field that a slot's path starts in. A fieldset or row path (`items.name`,
 * `items[0].name`) starts in its fieldset, and a flattened value path (`['employee.name']`) starts in
 * the field that it flattens.
 *
 * @param {string} path - The path inside the slot name's parentheses.
 * @returns {string} The first segment of the path.
 */
const topLevelField = (path) => path.replace(/^\['(.*?)'\]/, "$1").split(/[.[]/)[0];

/**
 * @typedef {object} FormModelFieldSlotsContext
 * @property {() => import('vue').Slots} slots - Returns the per-field slots that the form model received.
 * @property {() => () => void} register - Records a mounted `FormModelField`. Returns a function that removes the record.
 */

/**
 * Provide a `FormModel`'s per-field slots to every `FormModelField` it contains, and report per-field
 * slots that cannot reach a field.
 *
 * Two mistakes throw in development and log a console warning in production:
 *  - A `field(<path>)` or `widget(<path>)` slot whose path starts in no field of the form model.
 *  - A `#fields` layout that renders no `FormModelField` while the form model has per-field slots.
 *    A plain `FieldRenderer` does not receive the form model's slots.
 *
 * Both checks run when the form model's fields load, after the fields render.
 *
 * @param {{ app: string, model: string }} props - The `FormModel` props.
 * @param {import('@vueda/use/useFormModel.js').UseFormModelState} formModel - The reactive form model.
 * @param {import('vue').Slots} slots - The `FormModel`'s own `useSlots()` output.
 * @returns {void}
 */
export function useFormModelFieldSlots(props, formModel, slots) {
    let registeredFields = 0;
    provide(
        FormModelFieldSlotsSymbol,
        /** @type {FormModelFieldSlotsContext} */ ({
            slots: () => omit(slots, FORM_MODEL_OWN_SLOTS),
            register: () => {
                registeredFields += 1;
                return () => {
                    registeredFields -= 1;
                };
            },
        }),
    );

    const formName = () => `FormModel for ${props.app}.${props.model}`;

    const checkSlots = () => {
        const perFieldSlots = Object.keys(slots).filter((name) => PER_FIELD_SLOT.test(name));
        // `fieldComponents` has one key for every field the form renders, expanded fields included.
        const knownFields = new Set(Object.keys(formModel.fieldComponents || {}).map(topLevelField));
        for (const slotName of perFieldSlots) {
            const path = FIELD_PATH_SLOT.exec(slotName)?.[1];
            if (path !== undefined && !knownFields.has(topLevelField(path))) {
                reportDevError(
                    `${formName()} has a "${slotName}" slot, but "${topLevelField(path)}" is not a field of the form. ` +
                        `Check the slot name against the form's fields.`,
                );
            }
        }
        if (slots.fields && perFieldSlots.length && registeredFields === 0) {
            const names = perFieldSlots.map((name) => `"${name}"`).join(", ");
            reportDevError(
                `${formName()} has a #fields layout that renders no FormModelField, so its per-field slots ` +
                    `(${names}) reach no field. Render each field with FormModelField, or declare the slots on ` +
                    `the components that the layout renders instead of on FormModel.`,
            );
        }
    };

    // The `fields` slot and the default loop render only once fields exist, so the checks wait for
    // them and run after that render, when every FormModelField in it has registered. Fields that are
    // already loaded render with the mount. Fields that load later render before a post-flush watcher
    // runs. An `immediate` watcher would not do for the first case: it runs its first callback during
    // setup, before anything renders.
    const fieldsLoaded = () => Boolean(unref(formModel.fields)?.length);
    onMounted(() => {
        if (fieldsLoaded()) {
            checkSlots();
        }
    });
    watch(
        fieldsLoaded,
        (loaded) => {
            if (loaded) {
                checkSlots();
            }
        },
        { flush: "post" },
    );
}
