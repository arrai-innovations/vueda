/**
 * @module theme/register
 * @description Provides get/set accessors for the global PrimeVue preset used by vueda-client widgets.
 */

let primeVuePreset = null;

/**
 * Sets the PrimeVue preset, so vueda-client widgets can use it when doing standard extensions to primeVue
 * widgets via pass-through.
 * @param preset {object} - The PrimeVue preset to set.
 * @example
 * ```js
 * import Aura from '@primevue/themes/aura';
 * import { setPrimeVuePreset } from '@vueda/theme/register.js';
 *
 * setPrimeVuePreset(Aura);
 * app.use(PrimeVue, { theme: { preset: Aura } });
 * ```
 */
export function setPrimeVuePreset(preset) {
    primeVuePreset = preset;
}

/**
 * Gets the set PrimeVue preset, so vueda-client widgets can use it when doing standard extensions to primeVue
 * @returns {object|null} - The PrimeVue preset, or null if not set.
 */
export function getPrimeVuePreset() {
    return primeVuePreset;
}
