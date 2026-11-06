<script setup>
import Button from "@vueda/controls/button/Button.vue";
import LinkModelView from "@vueda/navigation/link-model-view/LinkModelView.vue";
import Popover from "@vueda/shell/popover/Popover.vue";
import PopoverContent from "@vueda/shell/popover/PopoverContent.vue";
import PopoverTrigger from "@vueda/shell/popover/PopoverTrigger.vue";
import "@vueda/theme/vueda-tailwind/objects-grid/ColumnModelLinks.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed, ref } from "vue";

/**
 * To-many list column adapter. Renders a many-to-many field or a reverse foreign key as a
 * comma-separated list of the related objects' labels. Each label links to the related
 * object's view through {@link LinkModelView}. A label renders as plain text when the viewer
 * cannot open that view. A label also renders as plain text when the related model or the
 * object's pk is unknown.
 *
 * The labels come from an expanded value, which holds one object per related row. Each label is
 * the object's `formatted_name`. When `formatted_name` is missing, the label is its `name`, `id`,
 * or `pk`. An unexpanded value holds only primary keys, so the cell shows the count of related
 * objects, such as "3 items". Expand the field in the list request to show labels.
 *
 * The cell shows the first `maxVisible` labels. The remaining labels sit behind a "+N more"
 * button that opens a popover. The popover is built from the row's value, so it makes no request
 * of its own. An empty relation renders an empty cell.
 *
 * Receives the ObjectsGrid `value` slot props. `inheritAttrs` is disabled so surplus cell-context
 * props are not added to the DOM as attributes.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Raw to-many value: an array of related objects when expanded, or an array of primary keys. */
    value: {
        type: Array,
        default: undefined,
    },
    /** The column's field descriptor; read for the related model's `appLabel`/`model`. */
    field: {
        type: Object,
        default: () => ({}),
    },
    /** Related model's app label. Used when the field does not name one. */
    app: {
        type: String,
        default: undefined,
    },
    /** Related model name. Used when the field does not name one. */
    model: {
        type: String,
        default: undefined,
    },
    /**
     * Named view to link to. An array names views in order of preference, such as
     * `["update", "read"]`. Each link targets the first view that the viewer can open. A label
     * renders as plain text when the viewer can open none of them.
     */
    view: {
        type: [String, Array, Object],
        default: "read",
    },
    /**
     * How many labels the cell shows before the "+N more" button. The cell always shows at least
     * one label.
     */
    maxVisible: {
        type: Number,
        default: 3,
    },
});

const theme = useTheme("ColumnModelLinks", props);
const open = ref(false);

// Related-model identity: the field's own metadata (model info supplies a
// camelCased `appLabel`/`model`), then the `app`/`model` props.
const targetApp = computed(() => props.field?.appLabel ?? props.app);
const targetModel = computed(() => props.field?.model ?? props.model);
const hasTarget = computed(() => !!(targetApp.value && targetModel.value));

const relatedValues = computed(() => props.value ?? []);

// An expanded value holds an object for each related row. Any scalar entry is a primary key,
// which means the field was not expanded.
const expanded = computed(() =>
    relatedValues.value.every((related) => related !== null && typeof related === "object"),
);

const countText = computed(() => {
    const count = relatedValues.value.length;
    return count === 1 ? "1 item" : `${count} items`;
});

const items = computed(() =>
    relatedValues.value.map((related, index) => {
        const pk = related.id ?? related.pk;
        return {
            key: pk ?? index,
            pk,
            label: related.formatted_name ?? related.name ?? pk ?? "",
            linked: hasTarget.value && pk != null && pk !== "",
        };
    }),
);

const visibleCount = computed(() => Math.max(1, props.maxVisible));
const visibleItems = computed(() => items.value.slice(0, visibleCount.value));
const hiddenItems = computed(() => items.value.slice(visibleCount.value));
</script>

<template>
    <span v-if="relatedValues.length && !expanded" :class="theme('root')" data-qa="column-model-links-count">
        {{ countText }}
    </span>
    <span v-else-if="relatedValues.length" :class="theme('root')">
        <template v-for="(item, index) in visibleItems" :key="item.key">
            <link-model-view v-if="item.linked" :app="targetApp" :model="targetModel" :pk="item.pk" :view="view">
                {{ item.label }}
            </link-model-view>
            <span v-else>{{ item.label }}</span>
            <span v-if="index < visibleItems.length - 1">, </span>
        </template>
        <Popover v-if="hiddenItems.length" v-model:open="open">
            <PopoverTrigger as-child>
                <Button tone="neutral" emphasis="link" :class="theme('more')" data-qa="column-model-links-more">
                    +{{ hiddenItems.length }} more
                </Button>
            </PopoverTrigger>
            <PopoverContent :class="theme('popover')">
                <ul :class="theme('list')" data-qa="column-model-links-popover">
                    <li v-for="item in hiddenItems" :key="item.key">
                        <link-model-view
                            v-if="item.linked"
                            :app="targetApp"
                            :model="targetModel"
                            :pk="item.pk"
                            :view="view"
                        >
                            {{ item.label }}
                        </link-model-view>
                        <span v-else>{{ item.label }}</span>
                    </li>
                </ul>
            </PopoverContent>
        </Popover>
    </span>
</template>
