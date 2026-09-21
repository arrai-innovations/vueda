<script setup>
import ConsequencesBullets from "@vueda/display/consequences-bullets/ConsequencesBullets.vue";
import LoadingSpinnerBlock from "@vueda/display/loading/LoadingSpinnerBlock.vue";
import "@vueda/theme/vueda-tailwind/views/ViewDestroy.theme.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { usePageTitle } from "@vueda/use/usePageTitle.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { useViewDestroy } from "@vueda/use/useViewDestroy.js";
import { getLowerTitle, getPluralizedTitle } from "@vueda/utils/case.js";
import ModelActionForm from "@vueda/views/ModelActionForm.vue";
import ActionBanner from "@vueda/views/_ActionBanner.vue";
import isEmpty from "lodash-es/isEmpty.js";
import { computed, useSlots } from "vue";

/**
 * View that presents a confirmation form and displays a list of selected items to be deleted via
 * ModelActionForm, then sends a DELETE request when the user confirms.
 *
 * Wraps the ModelActionForm in a destructive-toned card with a danger banner so the blast radius is
 * legible at a glance. The banner exposes a `linkedObjectCounts` prop and a `banner` slot for
 * surfacing cascading-delete summaries when the server provides them.
 *
 * Contributes its own page title ("Delete Widget", or "Delete 3 Widgets" for a bulk destroy)
 * through {@link usePageTitle}, so the layout's PageTitle display renders a heading here as it
 * does on the other CRUD views.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
    ...THEME_OVERRIDE_PROPS,
    /** Django app label that owns the model. */
    app: {
        type: String,
        required: true,
    },
    /** Django model name whose instances will be permanently deleted. */
    model: {
        type: String,
        required: true,
    },
    /** Primary key or array of primary keys identifying the instances to delete. */
    pk: {
        type: [String, Array],
        required: true,
    },
    /**
     * Optional summary of objects that will be cascade-deleted alongside the target. Each entry is
     * rendered as a line in the banner description (e.g. `{ verboseNamePlural: "comments", count: 12 }`).
     * When the server does not surface this data the banner still renders with a generic warning.
     */
    linkedObjectCounts: {
        type: Array,
        default: () => [],
    },
    /** Override the default banner title. When omitted the title is generated from the model name. */
    bannerTitle: {
        type: String,
        default: undefined,
    },
    /**
     * Optional anti-mistake phrase the operator must type before the destroy
     * button enables. Forwarded to `ModelActionForm`, which renders a
     * `TypedConfirmField` inside the body and gates submit until the typed
     * value matches. Recommended for bulk destroys (the kit convention is
     * `"delete N {model}"`). Leave undefined to skip the gate.
     */
    confirmText: {
        type: String,
        default: undefined,
    },
});

const { modelConfig, instanceList, titleStr, pageLoading } = useViewDestroy(props);
// Contribute the page title to the layout's PageTitle display, as Create, Update, and the
// action confirmations do. Without this the Destroy route went straight from the shell
// breadcrumb to the danger card, with no page heading of its own.
usePageTitle(() => ({ title: titleStr.value, loading: pageLoading.value }));
const slots = useSlots();
const theme = useTheme("ViewDestroy", props);
const icon = useIcons("ViewDestroy", props);

const cascadeItems = computed(() =>
    props.linkedObjectCounts.map((entry) => ({
        label: `${entry.count} ${entry.verboseNamePlural || entry.verboseName || entry.label}`,
        description: "will also be removed",
        tone: "danger",
    })),
);

const pkCount = computed(() => (Array.isArray(props.pk) ? props.pk.length : 1));
const bulk = computed(() => pkCount.value > 1);
const modelVerboseName = computed(() =>
    bulk.value
        ? modelConfig.info?.verboseNamePlural || getLowerTitle(getPluralizedTitle(props.model))
        : modelConfig.info?.verboseName || getLowerTitle(props.model),
);
const computedBannerTitle = computed(() => {
    if (props.bannerTitle) {
        return props.bannerTitle;
    }
    if (bulk.value) {
        return `This will permanently delete ${pkCount.value} ${modelVerboseName.value}.`;
    }
    return `This will permanently delete the selected ${modelVerboseName.value}.`;
});
</script>

<template>
    <!-- TODO: theme.hideStyle requires a single themed root -->
    <div v-if="!isEmpty(modelConfig.info)" :class="theme('root')">
        <div :class="theme('card')" data-tone="danger" data-qa="view-destroy-card">
            <!-- @slot [view-destroy-banner] Override the danger banner shown above the confirmation form. -->
            <slot name="view-destroy-banner" :linked-object-counts="linkedObjectCounts" :title="computedBannerTitle">
                <action-banner
                    :theme="theme"
                    :icon="icon"
                    icon-name="triangleExclamation"
                    :title="computedBannerTitle"
                    :description="linkedObjectCounts.length === 0 ? 'This action cannot be undone.' : undefined"
                    description-theme-key="bannerDescription"
                    banner-qa="view-destroy-banner"
                    title-qa="view-destroy-banner-title"
                    description-qa="view-destroy-banner-description"
                >
                    <consequences-bullets
                        v-if="linkedObjectCounts.length > 0"
                        :items="cascadeItems"
                        data-qa="view-destroy-cascade"
                    />
                </action-banner>
            </slot>
            <div :class="theme('body')">
                <model-action-form
                    action="destroy"
                    :app="app"
                    :model="model"
                    :pk="pk"
                    :bare="true"
                    tone="danger"
                    :confirm-text="confirmText"
                    :fetch-state="instanceList.state"
                    :instance-list="instanceList"
                    v-bind="$attrs"
                >
                    <template v-for="(_, slot) in slots" #[slot]="slotProps">
                        <slot :name="slot" v-bind="slotProps || {}" />
                    </template>
                </model-action-form>
            </div>
        </div>
    </div>
    <div v-else><loading-spinner-block /></div>
</template>
