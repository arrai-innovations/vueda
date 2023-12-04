import { combineErrors } from "@/utils/errors";

export default function formatError(error) {
    const errorArray = combineErrors(error);
    const messages = errorArray.map((error) => {
        if (error?.responseData?.serverStack && process.env.NODE_ENV === "development") {
            return `Error from the server: ${error?.response?.statusText}\n${error?.responseData?.detail || ""}\n${
                error?.responseData?.serverStack
            }`;
        }
        if (error?.responseData?.detail) {
            return `Error from the server: ${error?.response?.statusText}\n${error?.responseData?.detail || ""}`;
        }
        if (error?.response) {
            return `Error from the server: ${error?.response?.statusText}\n${error?.responseData || ""}`;
        }
        if (error?.stack && process.env.NODE_ENV === "development") {
            return error.stack;
        }
        if (error?.errors) {
            return error.errors.map(formatError).join("\n");
        }
        return error;
    });
    return messages.join("\n");
}
