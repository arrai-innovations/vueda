<script setup>
import LinkModelView from "@vueda/components/LinkModelView.vue";
import { computed } from "vue";

/**
 * Foreign-key list column adapter. Renders the related object as a link to its
 * detail view via {@link LinkModelView}, falling back to plain label text when
 * the link target or pk is unavailable. Collapses the hand-written FK-link
 * boilerplate (target/pk/label resolution + no-pk guard) that consuming list
 * views previously repeated per column.
 *
 * Receives the ObjectsGrid `value` slot props. Note the cell's `pk` slot prop is
 * the *row* primary key, not the FK target; the target pk is derived from
 * `value`, so `pk` is intentionally not consumed here. `inheritAttrs` is
 * disabled so surplus cell-context props are not leaked as DOM attributes.
 *
 * Target resolution prefers the field's own related-model identity (populated by
 * the server for writable relations) and falls back to `app`/`model` supplied
 * via `columnProps`, then to label-only text.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    /** Raw FK value: a scalar pk, or an object carrying `id`/`pk` and an optional label. */
    value: {
        type: [String, Number, Object, Array],
        default: undefined,
    },
    /** Server-formatted display string for the cell; preferred label source. */
    formatted: {
        type: [String, Number],
        default: "",
    },
    /** The column's field descriptor; read for the related model's `appLabel`/`model`. */
    field: {
        type: Object,
        default: () => ({}),
    },
    /** Related model's app label; `columnProps` fallback when the field omits it. */
    app: {
        type: String,
        default: undefined,
    },
    /** Related model name; `columnProps` fallback when the field omits it. */
    model: {
        type: String,
        default: undefined,
    },
    /** Named view to link to. */
    view: {
        type: [String, Array, Object],
        default: "read",
    },
    /** Explicit label override; otherwise derived from `formatted`/`value`. */
    label: {
        type: [String, Number],
        default: undefined,
    },
    /** Render the link as a standard button instead of a link-styled button. */
    button: {
        type: Boolean,
        default: false,
    },
});

// Related-model identity: the field's own metadata (model-info supplies a
// camelCased `appLabel`/`model`), then the `columnProps` app/model fallback.
const targetApp = computed(() => props.field?.appLabel ?? props.app);
const targetModel = computed(() => props.field?.model ?? props.model);

// FK pk: an object value carries it as `id`/`pk`; a scalar value is the pk.
const targetPk = computed(() => {
    const value = props.value;
    if (value && typeof value === "object" && !Array.isArray(value)) {
        return value.id ?? value.pk;
    }
    return value;
});

const hasTarget = computed(() => !!(targetApp.value && targetModel.value));
const hasPk = computed(() => targetPk.value != null && targetPk.value !== "" && !Array.isArray(props.value));
const showLink = computed(() => hasTarget.value && hasPk.value);

const labelText = computed(() => {
    if (props.label != null && props.label !== "") {
        return props.label;
    }
    if (props.formatted != null && props.formatted !== "") {
        return props.formatted;
    }
    const value = props.value;
    if (value && typeof value === "object" && !Array.isArray(value)) {
        return value.formatted_name ?? value.name ?? value.id ?? value.pk ?? "";
    }
    return value ?? "";
});
</script>
<template>
    <link-model-view v-if="showLink" :app="targetApp" :model="targetModel" :pk="targetPk" :view="view" :button="button">
        {{ labelText }}
    </link-model-view>
    <span v-else>{{ labelText }}</span>
</template>
