import { readFile } from "node:fs/promises";

import Ajv2020 from "ajv/dist/2020.js";

const schemaPath = new URL("../../schema/canonical.schema.json", import.meta.url);

let cachedValidator;

export async function getCanonicalValidator() {
  if (cachedValidator) {
    return cachedValidator;
  }

  const raw = await readFile(schemaPath, "utf-8");
  const schema = JSON.parse(raw);
  const ajv = new Ajv2020({ allErrors: true });
  cachedValidator = ajv.compile(schema);
  return cachedValidator;
}

export async function assertCanonical(payload) {
  const validate = await getCanonicalValidator();
  const valid = validate(payload);
  if (!valid) {
    throw new Error(`Schema errors: ${JSON.stringify(validate.errors, null, 2)}`);
  }
}
