/**
 * @module theme/vueda-tailwind/views
 * @description Tailwind CSS pass-through theme configuration for VUEDA Client page and view-level components.
 */
import "./ActionForm.theme.js";
import "./AuthForm.theme.js";
import "./AuthorizingForm.theme.js";
import "./ModelActionForm.theme.js";
import "./PageTitle.theme.js";
import "./ViewAction.theme.js";
import "./ViewActionNotFound.theme.js";
import "./ViewActivate.theme.js";
import "./ViewDeactivate.theme.js";
import "./ViewDestroy.theme.js";
import "./ViewHistoryList.theme.js";
import "./ViewList.theme.js";
import "./ViewLoading.theme.js";
import "./ViewNotFound.theme.js";
import "./ViewRecoveryCodes.theme.js";
import "./ViewSetupDevice.theme.js";
import "./ViewTwoFactorAuth.theme.js";
import "./ViewUpdate.theme.js";
import "./ViewWorkflowTransition.theme.js";

export default {
    // ---------- Page chrome ----------
    PageTitle: {},
    // ---------- Action forms ----------
    ActionForm: {},
    ModelActionForm: {},
    ViewDestroy: {},
    // ---------- Authentication forms ----------
    AuthForm: {},
    AuthorizingForm: {},
    // ---------- List views ----------
    ViewList: {},
    ViewHistoryList: {},
    // ---------- CRUD views ----------
    ViewUpdate: {},
    // ---------- System views ----------
    ViewLoading: {},
    ViewNotFound: {},
    ViewActionNotFound: {},
    // ---------- Workflow views ----------
    ViewAction: {},
    ViewActivate: {},
    ViewDeactivate: {},
    // ---------- Authentication workflows ----------
    ViewTwoFactorAuth: {},
    ViewSetupDevice: {},
    // ---------- Workflow transitions ----------
    ViewWorkflowTransition: {},
    // ---------- Recovery codes ----------
    ViewRecoveryCodes: {},
};
