let primeVuePreset = null;

/**
 * Sets the PrimeVue preset, so vueda-client widgets can use it when doing standard extensions to primeVue
 * widgets via pass-through.
 * @param preset {object} - The PrimeVue preset to set.
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
