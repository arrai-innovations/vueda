<script setup>
import "@vueda/theme/vueda-tailwind/display/ConstraintsBar.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed } from "vue";

/**
 * The active list-constraints band: one strip that hosts the filter chips and
 * the sort chips on a single line, separated by a hairline divider. Filters and
 * sorts are told apart by their own tint (primary for filters, neutral for
 * sorts), so the band reads as two grouped categories rather than one
 * undifferentiated pile. Each group owns its own clear control.
 *
 * Presentational only: the host supplies the two chip groups via the `filters`
 * and `sort` slots and tells the band which groups are active. The band
 * collapses (height 0) when nothing is active, so an unconstrained list spends no
 * vertical chrome. The chip groups stay mounted (the band is clipped, not
 * unmounted) so their toolbar triggers keep working while the band is collapsed.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** True when one or more filters are active; drives the filters group, the divider, and band visibility. */
    filtersActive: {
        type: Boolean,
        default: false,
    },
    /** True when one or more sort fields are active; drives the sort group, the divider, and band visibility. */
    sortsActive: {
        type: Boolean,
        default: false,
    },
});

const active = computed(() => props.filtersActive || props.sortsActive);
const showDivider = computed(() => props.filtersActive && props.sortsActive);

const theme = useTheme("ConstraintsBar", props);
</script>

<template>
    <!-- The band stays mounted and is collapsed via a grid-rows transition rather
         than unmounted, so the slotted groups (and their teleported toolbar
         triggers) are never torn down. -->
    <div
        :class="theme('collapse')"
        :style="{ gridTemplateRows: active ? '1fr' : '0fr' }"
        :data-open="active ? 'true' : 'false'"
        data-qa="constraints-bar"
    >
        <div :class="theme('inner')">
            <div :class="theme('root')">
                <!-- @slot The filter chips group (FilterGroup in hosted mode). -->
                <slot name="filters" />
                <span
                    v-if="showDivider"
                    :class="theme('divider')"
                    data-qa="constraints-bar-divider"
                    aria-hidden="true"
                />
                <!-- @slot The sort chips group (SortGroup in hosted mode). -->
                <slot name="sort" />
            </div>
        </div>
    </div>
</template>
