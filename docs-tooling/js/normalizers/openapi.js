/**
 * Normalize OpenAPI JSON output into the canonical schema.
 */
import { Normalizer } from "../core.js";
import { compact } from "../utils/compact.js";

function typeName(schema) {
    if (!schema) {
        return "unknown";
    }
    if (schema.$ref) {
        return schema.$ref.split("/").pop();
    }
    if (schema.type === "array") {
        return `${typeName(schema.items)}[]`;
    }
    if (schema.type === "string" && schema.format) {
        return `${schema.type}(${schema.format})`;
    }
    if (schema.type) {
        return schema.type;
    }
    if (schema.oneOf) {
        return schema.oneOf.map(typeName).join(" | ");
    }
    if (schema.anyOf) {
        return schema.anyOf.map(typeName).join(" | ");
    }
    if (schema.allOf) {
        return schema.allOf.map(typeName).join(" & ");
    }
    return "object";
}

function refToLink(ref) {
    if (!ref || typeof ref !== "string") {
        return undefined;
    }
    if (!ref.startsWith("#/components/schemas/")) {
        return undefined;
    }
    const name = ref.split("/").pop();
    return `rest:schema:${name}`;
}

function schemaToTypeRef(schema) {
    if (!schema) {
        return undefined;
    }
    let kind;
    if (schema.$ref) {
        kind = "reference";
    } else if (schema.enum) {
        kind = "enum";
    } else if (schema.type === "array") {
        kind = "array";
    } else if (schema.type === "object") {
        kind = "object";
    } else if (
        schema.type === "string" ||
        schema.type === "number" ||
        schema.type === "integer" ||
        schema.type === "boolean"
    ) {
        kind = "primitive";
    } else if (schema.oneOf || schema.anyOf) {
        kind = "union";
    }
    return compact({
        name: typeName(schema),
        kind,
        link: refToLink(schema.$ref),
    });
}

function responseLabel(code, response) {
    if (!response) {
        return code;
    }
    return response.description ? `${code} ${response.description}` : code;
}

function endpointId(method, pathKey) {
    return `rest:endpoint:${method.toUpperCase()}:${pathKey}`;
}

function schemaId(name) {
    return `rest:schema:${name}`;
}

export class OpenApiNormalizer extends Normalizer {
    normalize(payload) {
        if (!payload || !payload.paths) {
            throw new Error("Invalid OpenAPI payload");
        }

        const nodes = [];
        const roots = [];

        const apiRootId = "rest:root";
        nodes.push(
            compact({
                id: apiRootId,
                kind: "api",
                name: payload.info?.title || "API",
                description: payload.info?.description,
                children: [],
            }),
        );
        roots.push(apiRootId);

        for (const [pathKey, methods] of Object.entries(payload.paths || {})) {
            for (const [method, operation] of Object.entries(methods || {})) {
                const id = endpointId(method, pathKey);
                const description = operation.summary || operation.description;

                const signatures = [];
                const parameters = [];

                for (const param of operation.parameters || []) {
                    parameters.push(
                        compact({
                            name: param.name,
                            description: param.description,
                            type: schemaToTypeRef(param.schema),
                            optional: param.required === false,
                            default: param.schema?.default,
                        }),
                    );
                }

                if (operation.requestBody) {
                    const bodySchemas = [];
                    const content = operation.requestBody.content || {};
                    for (const media of Object.values(content)) {
                        if (media.schema) {
                            bodySchemas.push(schemaToTypeRef(media.schema));
                        }
                    }
                    if (bodySchemas.length) {
                        parameters.push(
                            compact({
                                name: "body",
                                description: operation.requestBody.description,
                                type:
                                    bodySchemas.length === 1
                                        ? bodySchemas[0]
                                        : { name: bodySchemas.map((item) => item.name).join(" | ") },
                                optional: operation.requestBody.required === false,
                            }),
                        );
                    }
                }

                const responses = [];
                let endpointReturn;
                for (const [code, response] of Object.entries(operation.responses || {})) {
                    const content = response.content || {};
                    let responseType;
                    for (const media of Object.values(content)) {
                        if (media.schema) {
                            responseType = schemaToTypeRef(media.schema);
                            break;
                        }
                    }
                    if (!endpointReturn && code.startsWith("2") && responseType) {
                        endpointReturn = responseType;
                    }
                    responses.push(
                        compact({
                            id: `${id}:response:${code}`,
                            kind: "response",
                            name: responseLabel(code, response),
                            description: response.description,
                            signatures: responseType
                                ? [
                                      {
                                          returns: responseType,
                                      },
                                  ]
                                : undefined,
                            extensions: { openapi: response },
                        }),
                    );
                }

                const endpointNode = compact({
                    id,
                    kind: "endpoint",
                    name: operation.operationId || `${method.toUpperCase()} ${pathKey}`,
                    description,
                    signatures: [
                        compact({
                            label: method.toUpperCase(),
                            parameters: parameters.length ? parameters : undefined,
                            returns: endpointReturn,
                        }),
                    ],
                    children: responses.length ? responses.map((r) => r.id) : undefined,
                    tags: operation.tags,
                    extensions: {
                        openapi: {
                            operationId: operation.operationId,
                            deprecated: operation.deprecated,
                            security: operation.security,
                            path: pathKey,
                            method,
                        },
                    },
                });

                nodes.push(endpointNode, ...responses);
                nodes.find((node) => node.id === apiRootId)?.children?.push(id);
            }
        }

        for (const [name, schema] of Object.entries(payload.components?.schemas || {})) {
            const members = [];
            const properties = schema.properties || {};
            const required = new Set(schema.required || []);
            for (const [propName, propSchema] of Object.entries(properties)) {
                members.push(
                    compact({
                        name: propName,
                        kind: "property",
                        description: propSchema.description,
                        type: schemaToTypeRef(propSchema),
                        required: required.has(propName),
                        default: propSchema.default,
                        readonly: propSchema.readOnly,
                    }),
                );
            }

            nodes.push(
                compact({
                    id: schemaId(name),
                    kind: schema.enum ? "enum" : "schema",
                    name,
                    description: schema.description,
                    members: members.length ? members : undefined,
                    extensions: { openapi: schema },
                }),
            );
            nodes.find((node) => node.id === apiRootId)?.children?.push(schemaId(name));
        }

        return {
            schemaVersion: "1.0",
            source: "openapi",
            meta: {
                title: payload.info?.title,
                version: payload.info?.version,
            },
            nodes,
            roots,
        };
    }
}
