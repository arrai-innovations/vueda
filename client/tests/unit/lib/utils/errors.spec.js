import { ConfirmationRequiredError, FormValidationError } from "@vueda/utils/errors.js";
import { describe, expect, it } from "vitest";

describe("lib/utils/errors.js", () => {
    describe("ConfirmationRequiredError", () => {
        it("defaults bulk to false when the caller does not specify a request path", () => {
            const error = new ConfirmationRequiredError(
                { digest: "d1", warnings: { count: ["A negative count is unusual."] } },
                new Response(),
            );

            expect(error.bulk).toBe(false);
            expect(error.messages).toEqual({ count: ["A negative count is unusual."] });
        });

        it("carries bulk:true is bulk:true is passed in", () => {
            const error = new ConfirmationRequiredError(
                { digest: "d1", warnings: { 9: { count: ["A negative count is unusual."] } } },
                new Response(),
                { bulk: true },
            );

            expect(error.bulk).toBe(true);
            expect(error.messages).toEqual({ 9: { count: ["A negative count is unusual."] } });
        });
    });

    describe("FormValidationError", () => {
        it("splits a field-keyed error payload into the errors map", () => {
            const error = new FormValidationError({ name: ["This field may not be blank."] }, new Response());

            expect(error.errors).toEqual({ name: ["This field may not be blank."] });
        });

        it("routes a non-field error into the errors map under non_field_errors", () => {
            const error = new FormValidationError(
                { non_field_errors: ["Only one default address is allowed."] },
                new Response(),
            );

            expect(error.errors).toEqual({ non_field_errors: ["Only one default address is allowed."] });
        });

        it("treats a real field named warnings as a validation-error field, not an advisory channel", () => {
            const error = new FormValidationError({ warnings: ["This field is required."] }, new Response());

            expect(error.errors).toEqual({ warnings: ["This field is required."] });
        });

        it("treats a nested field named warnings (e.g. per-object bulk errors) as an error, not a message", () => {
            const error = new FormValidationError({ 3: { warnings: ["This field is required."] } }, new Response());

            expect(error.errors).toEqual({ "3.warnings": ["This field is required."] });
        });

        it("always leaves messages empty; advisory warnings are ConfirmationRequiredError's concern", () => {
            const error = new FormValidationError(
                { name: ["Invalid."], non_field_errors: ["Bad request."] },
                new Response(),
            );

            expect(error.messages).toEqual({});
        });
    });
});
