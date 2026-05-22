<script setup>
import ConsequencesBullets from "@vueda/components/ConsequencesBullets.vue";
import LoadingSpinnerBlock from "@vueda/components/LoadingSpinnerBlock.vue";
import ModelActionForm from "@vueda/components/ModelActionForm.vue";
import { useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { useViewDestroy } from "@vueda/use/useViewDestroy.js";
import { getLowerTitle, getPluralizedTitle } from "@vueda/utils/case.js";
import isEmpty from "lodash-es/isEmpty.js";
import { computed, useSlots } from "vue";

/**
 * View that presents a confirmation form and displays a list of selected items to be deleted via
 * ModelActionForm, then sends a DELETE request when the user confirms.
 *
 * Wraps the ModelActionForm in a destructive-toned card with a danger banner so the blast radius is
 * legible at a glance. The banner exposes a `linkedObjectCounts` prop and a `banner` slot for
 * surfacing cascading-delete summaries when the server provides them.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
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

const { modelConfig, handleDelete, instanceList } = useViewDestroy(props);
const slots = useSlots();
const theme = useTheme("ViewDestroy", props);
const icon = useIcons("ViewDestroy");

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
    <div v-if="!isEmpty(modelConfig.info)" :class="theme('root')">
        <div :class="theme('card')" data-tone="danger" data-qa="view-destroy-card">
            <!-- @slot [view-destroy-banner] Override the danger banner shown above the confirmation form. -->
            <slot name="view-destroy-banner" :linked-object-counts="linkedObjectCounts" :title="computedBannerTitle">
                <div :class="theme('banner')" data-qa="view-destroy-banner">
                    <div
                        v-if="$slots['banner-icon'] || icon('triangleExclamation')"
                        :class="theme('bannerIcon')"
                        aria-hidden="true"
                    >
                        <!-- @slot [banner-icon] Replaces the icon shown in the danger banner; receives no slot props. -->
                        <slot name="banner-icon">
                            <component
                                :is="icon('triangleExclamation').component"
                                v-bind="icon('triangleExclamation').props"
                                aria-hidden="true"
                            />
                        </slot>
                    </div>
                    <div :class="theme('bannerBody')">
                        <div :class="theme('bannerTitle')" data-qa="view-destroy-banner-title">
                            {{ computedBannerTitle }}
                        </div>
                        <p
                            v-if="linkedObjectCounts.length === 0"
                            :class="theme('bannerDescription')"
                            data-qa="view-destroy-banner-description"
                        >
                            This action cannot be undone.
                        </p>
                        <consequences-bullets v-else :items="cascadeItems" data-qa="view-destroy-cascade" />
                    </div>
                </div>
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
                    :run-action="handleDelete"
                    :fetch-state="instanceList.state"
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
