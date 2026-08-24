<script setup>
/**
 * Docs-only stand-in for vue-router's `RouterLink`.
 *
 * Several VUEDA components render `<router-link>` directly in their templates
 * (`SuggestionList`, `LinkModelView`, `ErrorDisplay`'s redirect affordance). A
 * consuming application installs vue-router, which registers that component
 * globally. VitePress ships its own router and registers nothing under that
 * name, so those templates would fail to resolve and Vue would warn.
 *
 * This renders the anchor a real `RouterLink` resolves to, so the surrounding
 * theme recipe is exercised exactly as it would be in an app. It deliberately
 * does not navigate: `to` becomes the href for hover and focus fidelity, and the
 * click is swallowed so a demo cannot pull the reader off the documentation page.
 * Registered as both `router-link` and `RouterLink` so either spelling resolves.
 */
defineProps({
    /** Route target. Accepts the string or location object a real RouterLink takes. */
    to: { type: [String, Object], default: undefined },
});

/**
 * Best-effort href purely for presentation. A real RouterLink resolves a location
 * object through the router; with no router there is nothing to resolve against, so
 * an object target falls back to `#`.
 *
 * @param {string|object|undefined} to
 * @returns {string}
 */
const hrefFor = (to) => (typeof to === "string" ? to : "#");
</script>

<template>
    <a :href="hrefFor(to)" @click.prevent><slot /></a>
</template>
