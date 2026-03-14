/**
 * Base classes for docs-tooling pipelines.
 */

export class Extractor {
    extract(_options) {
        throw new Error("Not implemented");
    }
}

export class Normalizer {
    normalize(_payload) {
        throw new Error("Not implemented");
    }
}
