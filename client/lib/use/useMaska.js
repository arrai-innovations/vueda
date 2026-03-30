/**
 * @module use/useMaska
 * @description Provides a composable wrapper around maska's MaskInput for applying
 * input masks to template-ref elements, with reactive mask options and automatic
 * lifecycle management. Exposes a destroy method for early teardown.
 */
import { tryOnMounted, tryOnScopeDispose } from "@vueuse/core";
import { MaskInput } from "maska";
import { readonly, ref, shallowRef, toValue, watch } from "vue";

/**
 * @typedef {object} UseMaskaReturn
 * @property {import('vue').DeepReadonly<import('vue').Ref<string>>} masked - The current masked (formatted) value.
 * @property {import('vue').DeepReadonly<import('vue').Ref<string>>} unmasked - The current unmasked (raw) value.
 * @property {import('vue').DeepReadonly<import('vue').Ref<boolean>>} completed - Whether the mask pattern is fully satisfied.
 * @property {() => void} destroy - Destroy the current MaskInput instance early. Safe to call multiple times.
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
 * Applies a maska input mask to an element ref with reactive options. When called
 * inside a component setup, initializes on mount and cleans up on unmount. When
 * called outside a component context, initializes immediately. Cleanup is tied to
 * the enclosing effect scope via tryOnScopeDispose, so it works in components,
 * watchEffect, and manual effectScope contexts. The destroy() method is also
 * exposed for early teardown and is idempotent.
 *
 * @param {import('vue').Ref<HTMLInputElement|import('vue').ComponentPublicInstance|null|undefined>} target - A template ref pointing to an input element or component with an input `$el`.
 * @param {import('vue').MaybeRefOrGetter<import('maska').MaskInputOptions>} options - Mask configuration object. May be a ref or getter for reactive updates.
 * @returns {UseMaskaReturn}
 */
export function useMaska(target, options) {
    const instance = shallowRef(undefined);

    const masked = ref("");
    const unmasked = ref("");
    const completed = ref(false);

    /**
     * Callback invoked by MaskInput on every input change.
     *
     * @param {import('maska').MaskaDetail} detail
     */
    function onMaska(detail) {
        masked.value = detail.masked;
        unmasked.value = detail.unmasked;
        completed.value = detail.completed;
    }

    /** @returns {import('maska').MaskInputOptions} */
    function createConfig() {
        return { ...toValue(options), onMaska };
    }

    function initialize() {
        const el = unrefElement(target);
        if (el == null) {
            return;
        }
        instance.value = new MaskInput(el, createConfig());
    }

    function destroy() {
        instance.value?.destroy();
        instance.value = undefined;
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

    tryOnMounted(initialize);
    tryOnScopeDispose(destroy);

    return {
        masked: readonly(masked),
        unmasked: readonly(unmasked),
        completed: readonly(completed),
        destroy,
    };
}
