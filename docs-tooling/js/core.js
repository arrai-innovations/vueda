/**
 * Base classes for docs-tooling pipelines.
 */

export class Domain {
  constructor(name, version = null) {
    this.name = name;
    this.version = version;
  }
}

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

export class Renderer {
  render(_canonical) {
    throw new Error("Not implemented");
  }
}

export class Pipeline {
  run(_options) {
    throw new Error("Not implemented");
  }
}
