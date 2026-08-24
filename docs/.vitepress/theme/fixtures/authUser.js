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

/**
 * storeUser state preset: authenticated with a TOTP device enrolled. ViewRecoveryCodes
 * gates its whole body on `loggedInUser.totp_devices` being non-empty, so the codes
 * panel only renders against this preset; plain LOGGED_IN shows its set-up-first path.
 */
export const MFA_ENROLLED = {
    loggedIn: true,
    loggedInUser: { ...DEMO_USER, totp_devices: [{ id: 1, name: "1Password", confirmed: true }] },
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

/**
 * setupTOTPDevice response. `ViewSetupDevice.doAfterSuccess` reads
 * `response.meta.totp_svg_data_uri` and `response.meta.totp_secret`, so the
 * envelope shape matters as much as the values.
 */
export const TOTP_SETUP = {
    meta: {
        totp_secret: "JBSWY3DPEHPK3PXP",
        // Inline SVG stand-in for the server-rendered QR: a bordered placeholder at the
        // same square aspect the real code occupies, so the demo shows the view's actual
        // image sizing rather than collapsing to a broken-image box.
        totp_svg_data_uri:
            "data:image/svg+xml;utf8," +
            encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">' +
                    '<rect width="64" height="64" fill="#fff"/>' +
                    '<rect x="4" y="4" width="16" height="16" fill="#000"/>' +
                    '<rect x="44" y="4" width="16" height="16" fill="#000"/>' +
                    '<rect x="4" y="44" width="16" height="16" fill="#000"/>' +
                    '<rect x="28" y="28" width="8" height="8" fill="#000"/>' +
                    "</svg>",
            ),
    },
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
