/**
 * @module use/useMaska
 * @description Provides a composable wrapper around maska's MaskInput for applying input masks
 * to template-ref elements, with reactive mask options and optional two-way model binding.
 */
import { MaskInput } from "maska";
import { computed, onMounted, onUnmounted, readonly, ref, shallowRef, toValue, watch } from "vue";

/**
 * @typedef {object} UseMaskaReturn
 * @property {import('vue').DeepReadonly<import('vue').Ref<string>>} masked - The current masked (formatted) value.
 * @property {import('vue').DeepReadonly<import('vue').Ref<string>>} unmasked - The current unmasked (raw) value.
 * @property {import('vue').DeepReadonly<import('vue').Ref<boolean>>} completed - Whether the mask pattern is fully satisfied.
 * @property {import('vue').DeepReadonly<import('vue').ShallowRef<MaskInput|undefined>>} instance - The underlying MaskInput instance.
 */

/**
 * Resolves a template ref or getter to the underlying HTMLInputElement.
 * Handles Vue component instances (via `$el`) and plain element refs.
 *
 * @param {import('vue').MaybeRefOrGetter<HTMLInputElement|import('vue').ComponentPublicInstance|null|undefined>} elRef
 * @returns {HTMLInputElement|undefined}
 */
function unrefElement(elRef) {
    const plain = toValue(elRef);
    return plain?.$el ?? plain ?? undefined;
}

/**
 * Applies a maska input mask to an element ref with reactive options and optional model syncing.
 *
 * @param {import('vue').Ref<HTMLInputElement|import('vue').ComponentPublicInstance|null|undefined>} target - A template ref pointing to an input element or component with an input `$el`.
 * @param {import('vue').MaybeRefOrGetter<string|import('maska').MaskInputOptions & { modelType?: 'masked' | 'unmasked' }>} options - A mask pattern string or options object. May be a ref or getter for reactive updates.
 * @param {import('vue').Ref<string|undefined>} [model] - Optional ref to sync with the masked or unmasked value (controlled by `modelType`, defaults to `'unmasked'`).
 * @returns {UseMaskaReturn}
 */
export function useMaska(target, options, model) {
    const instance = shallowRef(undefined);

    const masked = ref("");
    const unmasked = ref("");
    const completed = ref(false);

    const modelType = computed(() => {
        const plain = toValue(options);
        if (typeof plain === "string") {
            return "unmasked";
        }
        return plain?.modelType ?? "unmasked";
    });

    /** @returns {HTMLInputElement|undefined} */
    function getTarget() {
        return unrefElement(target);
    }

    // Sync external model changes back into the input element.
    if (model != null) {
        watch(model, (value) => {
            if (instance.value === undefined) {
                return;
            }
            const current = modelType.value === "masked" ? masked.value : unmasked.value;
            if (current === value) {
                return;
            }
            const el = getTarget();
            if (el != null) {
                el.value = value ?? "";
            }
        });
    }

    /**
     * Callback invoked by MaskInput on every input change.
     *
     * @param {import('maska').MaskaDetail} detail
     */
    function onMaska(detail) {
        masked.value = detail.masked;
        unmasked.value = detail.unmasked;
        completed.value = detail.completed;

        if (model != null) {
            model.value = modelType.value === "masked" ? detail.masked : detail.unmasked;
        }
    }

    /** @returns {import('maska').MaskInputOptions} */
    function createConfig() {
        const plain = toValue(options);
        if (typeof plain === "string") {
            return { onMaska, mask: plain };
        }
        return { ...plain, onMaska };
    }

    function initialize() {
        const el = getTarget();
        if (el == null) {
            return;
        }
        instance.value = new MaskInput(el, createConfig());
        if (model != null) {
            el.value = model.value ?? "";
        }
    }

    function destroy() {
        instance.value?.destroy();
    }

    // Re-initialize when the target element changes (e.g. v-if toggle).
    watch(
        () => unrefElement(target),
        (el) => {
            if (el != null) {
                destroy();
                initialize();
            }
        },
    );

    // Update mask config reactively when options change.
    watch(
        () => toValue(options),
        () => {
            instance.value?.update(createConfig());
        },
        { deep: true },
    );

    onMounted(initialize);
    onUnmounted(destroy);

    return {
        masked: readonly(masked),
        unmasked: readonly(unmasked),
        completed: readonly(completed),
        instance: readonly(instance),
    };
}
