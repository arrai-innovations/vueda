/**
 * @module utils/actionVariant
 * @description Resolves a model action's Button (tone, emphasis) from two
 * layers. Layer 1 is the action's intrinsic, placement-independent tone (the
 * color axis): a delete/destroy action is destructive, everything else neutral.
 * Layer 2 is contextual (the structure axis): the view's hero action is promoted
 * to a filled CTA, and every other action uses the placement emphasis chosen by
 * where it is rendered (outline in a page-title or action bar, ghost in a dense
 * bulk strip). Shared by `LinkModelView`, the single chokepoint every action
 * button renders through, so the two layers resolve in exactly one place.
 */
import { getActionName } from "@vueda/utils/actionMap.js";

/**
 * Matches the canonical delete/destroy action names (and prefixed / suffixed
 * variants like `bulk_delete` or `destroy_all`) so they pick up the destructive
 * tone without an explicit `actionDetails[name].tone` override.
 */
const DESTRUCTIVE_ACTION_RE = /(?:^|[-_])(?:delete|destroy)(?:[-_]|$)/i;

/**
 * The intrinsic, placement-independent tone for an action. An action whose
 * metadata declares `tone` wins (the override seam for the server or model
 * config); otherwise a delete/destroy action is `destructive` and everything
 * else is `neutral`.
 *
 * @param {string} actionName - The action / view name (e.g. `create`, `destroy`).
 * @param {import('@vueda/stores/storeModelInfo.js').ActionInfo} [actionDetail] - The action's metadata, when available.
 * @returns {'neutral' | 'destructive'} The intrinsic tone.
 */
export function actionTone(actionName, actionDetail) {
    if (actionDetail?.tone === "destructive" || actionDetail?.tone === "neutral") {
        return actionDetail.tone;
    }
    const name = getActionName(actionName) || "";
    return DESTRUCTIVE_ACTION_RE.test(name) ? "destructive" : "neutral";
}

/**
 * @typedef {object} ActionVariantInput
 * @property {string} actionName - The action / view name being rendered.
 * @property {import('@vueda/stores/storeModelInfo.js').ActionInfo} [actionDetail] - The action's metadata, when available.
 * @property {boolean} [primary] - Promote this action to the filled hero CTA for the current view.
 * @property {'neutral' | 'primary' | 'destructive'} [tone] - Explicit tone override; wins over the intrinsic tone.
 * @property {'fill' | 'outline' | 'ghost' | 'link'} [emphasis] - Placement emphasis when not promoted; defaults to `outline`.
 */

/**
 * Folds the two layers into a `{ tone, emphasis }` pair for `Button`. Promotion
 * sets the emphasis to `fill` and, for a neutral action, lifts the tone to
 * `primary` so the hero reads as the earned CTA; a promoted destructive action
 * stays destructive (a filled destructive hero, as on a destroy view). Explicit
 * `tone` overrides the action's intrinsic tone.
 *
 * @param {ActionVariantInput} [input] - The action and its placement context.
 * @returns {{ tone: 'neutral' | 'primary' | 'destructive', emphasis: 'fill' | 'outline' | 'ghost' | 'link' }} The resolved Button axes.
 */
export function resolveActionVariant({ actionName, actionDetail, primary = false, tone, emphasis = "outline" } = {}) {
    const intrinsic = actionTone(actionName, actionDetail);
    const resolvedEmphasis = primary ? "fill" : emphasis;
    const resolvedTone = tone || (primary && intrinsic === "neutral" ? "primary" : intrinsic);
    return { tone: resolvedTone, emphasis: resolvedEmphasis };
}
