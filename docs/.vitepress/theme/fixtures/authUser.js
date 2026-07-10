/**
 * Fixtures and mock builders for the live auth-view demos rendered by AuthDemo.
 *
 * The real storeUser actions hit the network via fetchHelper, which never resolves
 * in the docs build. AuthDemo mounts each auth view in an isolated sub-app and
 * replaces the actions the view calls with these canned, offline behaviors, so the
 * demos exercise the real view and theme against believable store state and results.
 */
import { FormValidationError } from "@vueda/utils/errors.js";

/** Canned authenticated user, shaped like the current-user endpoint payload. */
export const DEMO_USER = {
    id: 1,
    email: "ada@example.com",
    first_name: "Ada",
    last_name: "Lovelace",
    recently_logged_in: true,
};

/** storeUser state preset: signed out, idle. */
export const LOGGED_OUT = {
    loggedIn: false,
    loggedInUser: {},
    initialized: true,
    pendingFlow: null,
};

/** storeUser state preset: authenticated. */
export const LOGGED_IN = {
    loggedIn: true,
    loggedInUser: { ...DEMO_USER },
    initialized: true,
    pendingFlow: null,
};

/** storeUser state preset: credentials accepted, a second factor is now required. */
export const MFA_PENDING = {
    loggedIn: false,
    loggedInUser: {},
    initialized: true,
    pendingFlow: { id: "mfa_authenticate" },
};

/** Verified 2FA methods returned by getTwoFactorAuthMethod. */
export const TWO_FACTOR_METHODS = ["totp", "sms", "email"];

/** Eight recovery codes, matching the documented grouping. */
export const RECOVERY_CODES = [
    "rt3m-9kdq-pzn4",
    "4j2s-bvxm-twc8",
    "h8nq-zd7r-yfa1",
    "m6kx-3pw2-l9eu",
    "cr5v-jbn4-xaw7",
    "q1zd-ph8t-ekm3",
    "w0fy-72ng-srt6",
    "xb9c-uea4-vhk2",
];

/** TOTP setup payload, mirroring setupTOTPDevice (the view renders the QR and secret). */
export const TOTP_SETUP = {
    secret: "JBSWY3DPEHPK3PXP",
    // 1x1 transparent PNG stand-in; the real endpoint returns a server-rendered QR.
    qr_code:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
};

/**
 * Build a FormValidationError carrying Django-style field errors, e.g.
 * `formError({ password: ["This password is too common."] })`.
 *
 * @param {{ [field: string]: string[] }} fields
 * @returns {FormValidationError}
 */
export function formError(fields) {
    return new FormValidationError({ ...fields }, undefined);
}

/** Fixed delay (ms) so demos show their loading state before resolving; 0 disables it. */
export const DEMO_LATENCY_MS = 600;
