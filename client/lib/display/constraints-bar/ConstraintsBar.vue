<script setup>
import "@vueda/theme/vueda-tailwind/display/ConstraintsBar.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed } from "vue";

/**
 * The active list-constraints band: one strip that hosts the scope chips, the
 * filter chips, and the sort chips on a single line, with a hairline divider
 * between each pair of active groups. The groups are told apart by their own
 * tint (info for scopes, primary for filters, neutral for sorts), so the band
 * reads as grouped categories rather than one undifferentiated pile. Each group
 * owns its own clear control.
 *
 * Presentational only: the host supplies the chip groups via the `scopes`,
 * `filters`, and `sort` slots and tells the band which groups are active. The
 * band collapses (height 0) when nothing is active, so an unconstrained list
 * spends no vertical chrome. The chip groups stay mounted (the band is clipped,
 * not unmounted) so their toolbar triggers keep working while the band is
 * collapsed.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** True when one or more scopes are active; drives the dividers and band visibility. */
    scopesActive: {
        type: Boolean,
        default: false,
    },
    /** True when one or more filters are active; drives the dividers and band visibility. */
    filtersActive: {
        type: Boolean,
        default: false,
    },
    /** True when one or more sort fields are active; drives the dividers and band visibility. */
    sortsActive: {
        type: Boolean,
        default: false,
    },
});

const active = computed(() => props.scopesActive || props.filtersActive || props.sortsActive);
// A divider precedes a group when that group is active and an earlier group is too.
const showFiltersDivider = computed(() => props.filtersActive && props.scopesActive);
const showSortDivider = computed(() => props.sortsActive && (props.scopesActive || props.filtersActive));

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
                <!-- @slot The scope chips group (ScopeGroup in hosted mode). -->
                <slot name="scopes" />
                <span
                    v-if="showFiltersDivider"
                    :class="theme('divider')"
                    data-qa="constraints-bar-divider"
                    aria-hidden="true"
                />
                <!-- @slot The filter chips group (FilterGroup in hosted mode). -->
                <slot name="filters" />
                <span
                    v-if="showSortDivider"
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
