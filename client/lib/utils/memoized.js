import memoize from "lodash-es/memoize.js";
import snakeCase from "lodash-es/snakeCase.js";

export const memoizedSnakeCase = memoize(snakeCase);
