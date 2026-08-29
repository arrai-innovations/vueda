import { ConfirmationRequiredError, FormValidationError, ServerFeedbackError } from "@vueda/utils/errors.js";
import { describe, expect, it } from "vitest";

describe("lib/utils/errors.js", () => {
    describe("ServerFeedbackError", () => {
        it("defaults to empty feedback maps", () => {
            const response = new Response();
            const error = new ServerFeedbackError("Custom feedback", { response, responseData: { detail: "bad" } });

            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe("ServerFeedbackError");
            expect(error.message).toBe("Custom feedback");
            expect(error.response).toBe(response);
            expect(error.responseData).toEqual({ detail: "bad" });
            expect(error.errors).toEqual({});
            expect(error.messages).toEqual({});
        });

        it("accepts explicit feedback maps for custom adapters", () => {
            const error = new ServerFeedbackError("Custom feedback", {
                errors: { name: ["Invalid."] },
                messages: { count: ["Unusual."] },
            });

            expect(error.errors).toEqual({ name: ["Invalid."] });
            expect(error.messages).toEqual({ count: ["Unusual."] });
        });
    });

    describe("FormValidationError", () => {
        it("extends ServerFeedbackError without changing the existing class identity", () => {
            const error = new FormValidationError({ name: ["This field may not be blank."] }, new Response());

            expect(error).toBeInstanceOf(ServerFeedbackError);
            expect(error).toBeInstanceOf(FormValidationError);
            expect(error.name).toBe("FormValidationError");
            expect(error.message).toBe("Form validation error");
        });

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

    describe("ConfirmationRequiredError", () => {
        it("extends ServerFeedbackError without changing the existing class identity", () => {
            const response = new Response();
            const responseData = {
                confirmation_required: true,
                digest: "d1",
                warnings: { count: ["Unusual."] },
            };
            const error = new ConfirmationRequiredError(responseData, response);

            expect(error).toBeInstanceOf(ServerFeedbackError);
            expect(error).toBeInstanceOf(ConfirmationRequiredError);
            expect(error.name).toBe("ConfirmationRequiredError");
            expect(error.message).toBe("Confirmation required");
            expect(error.response).toBe(response);
            expect(error.responseData).toBe(responseData);
            expect(error.digest).toBe("d1");
            expect(error.errors).toEqual({});
            expect(error.messages).toEqual({ count: ["Unusual."] });
        });
    });
});
