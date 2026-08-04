export const OPENAPI_DEPRECATED_ENDPOINT_MESSAGE = "this endpoint will be removed in the next major release.";

export function deprecatedLifecycle(description) {
    const normalizedDescription = typeof description === "string" ? description.trim() : "";
    return {
        status: "deprecated",
        ...(normalizedDescription ? { description: normalizedDescription } : {}),
    };
}

export function deprecatedLifecycleFromVueTags(tags) {
    const deprecated = tags?.deprecated;
    if (!deprecated) {
        return undefined;
    }

    const firstTag = Array.isArray(deprecated) ? deprecated[0] : deprecated;
    if (!firstTag) {
        return deprecatedLifecycle();
    }
    if (typeof firstTag === "string") {
        return deprecatedLifecycle(firstTag);
    }
    return deprecatedLifecycle(firstTag.description || firstTag.text);
}

export function extractDeprecatedTagFromText(value) {
    if (!value) {
        return { description: undefined, lifecycle: undefined };
    }

    const lines = String(value).split(/\r?\n/);
    let deprecatedText;
    const keptLines = [];

    for (const line of lines) {
        const match = line.match(/^\s*@deprecated(?:\s+(.+))?\s*$/);
        if (match && deprecatedText === undefined) {
            deprecatedText = match[1] || "";
            continue;
        }
        keptLines.push(line);
    }

    const description =
        keptLines
            .join("\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim() || undefined;
    return {
        description,
        lifecycle: deprecatedText === undefined ? undefined : deprecatedLifecycle(deprecatedText),
    };
}
