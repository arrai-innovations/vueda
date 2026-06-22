/**
 * @module vite
 * @description Exports a Vite configuration helper that sets up aliases and de-duplication so that VUEDA, its
 * peer dependencies, and `@arrai-innovations/reactive-helpers` resolve to a single copy each, whether those
 * packages are installed from the registry or wired in with `pnpm link` / `file:` for local development.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const VUEDA_PACKAGE = "@arrai-innovations/vueda";
const REACTIVE_HELPERS_PACKAGE = "@arrai-innovations/reactive-helpers";

const packageRoot = fileURLToPath(new URL(".", import.meta.url));

const readJson = (filePath) => {
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch {
        return null;
    }
};

const readVuedaPackageVersion = () => {
    const packageJsonPath = path.resolve(packageRoot, "../package.json");
    const pkg = readJson(packageJsonPath);
    if (!pkg) {
        console.warn("[vueda] Could not read package.json version:", packageJsonPath);
        return "";
    }
    return pkg.version || "";
};

/**
 * @typedef {"installed"|"linked"|"absent"} DependencyWiring
 */

/**
 * Determine how a dependency is wired into the consuming project.
 *
 * pnpm symlinks everything, so "is it a symlink" tells us nothing. The reliable discriminator is where the
 * symlink's realpath lands: a registry/workspace install always resolves into a `node_modules` tree (e.g.
 * `<root>/node_modules/.pnpm/vue@x/node_modules/vue`), while a `pnpm link` / `file:` dependency resolves to a
 * source checkout that has no `node_modules` segment (e.g. `/home/me/code/vueda/client`).
 *
 * @param {string} packageName - The package to inspect (e.g. `@arrai-innovations/vueda`).
 * @param {string} root - The consuming project root that owns the `node_modules` to inspect.
 * @returns {DependencyWiring} `"installed"`, `"linked"`, or `"absent"`.
 */
const classifyDependency = (packageName, root) => {
    const packagePath = path.resolve(root, "node_modules", packageName);
    let stat;
    try {
        stat = fs.lstatSync(packagePath);
    } catch {
        return "absent";
    }
    // A real directory (npm flat layout, or a hoisted install) is always a normal install.
    if (!stat.isSymbolicLink()) {
        return "installed";
    }
    let real;
    try {
        real = fs.realpathSync(packagePath);
    } catch {
        return "absent";
    }
    const nodeModulesSegment = `${path.sep}node_modules${path.sep}`;
    return `${real}${path.sep}`.includes(nodeModulesSegment) ? "installed" : "linked";
};

/**
 * Collect the union of `peerDependencies` keys declared by a set of package.json files.
 *
 * Peer dependencies are, by definition, packages that must be a single shared instance across the dependency
 * graph (shared Vue reactivity, a single Pinia, one copy of the reactive-helpers classes, etc.), which makes
 * them exactly the set that needs de-duplication. Deriving the list from the manifests keeps it correct as the
 * declared peers evolve, instead of hard-coding names that drift out of date.
 *
 * @param {string[]} packageJsonPaths - Absolute paths to package.json files.
 * @returns {string[]} Sorted, de-duplicated peer dependency names.
 */
const collectPeerDependencies = (packageJsonPaths) => {
    const names = new Set();
    for (const packageJsonPath of packageJsonPaths) {
        const pkg = readJson(packageJsonPath);
        for (const name of Object.keys(pkg?.peerDependencies || {})) {
            names.add(name);
        }
    }
    return [...names].sort();
};

/**
 * Returns a Vite config fragment for vueda, covering `define`, `resolve.alias`, `resolve.dedupe`, and
 * (optionally) `optimizeDeps`. Spread the result into your Vite `defineConfig` or merge it with `mergeConfig`.
 *
 * The fragment guarantees a single copy of VUEDA, reactive-helpers, and their shared peer dependencies by
 * listing them in `resolve.dedupe`, which forces every bare import (from any importer, including a linked
 * package's own internal imports) to resolve from this project's root. This works regardless of whether the
 * packages are installed or linked, and regardless of pnpm's symlinked/hoisted store layout.
 *
 * @param {object} [options] - Configuration options.
 * @param {string} [options.root] - The project root directory. Defaults to process.cwd().
 * @param {boolean} [options.enableDedupe] - Whether to de-duplicate shared peer dependencies. Defaults to true.
 * @param {boolean} [options.enableRuntimeAliases] - Whether to pin vue/pinia/vue-router to their bundler builds. Defaults to true.
 * @param {string[]} [options.excludeFromDedupe] - Peer dependency names to leave out of `resolve.dedupe`.
 * @param {string[]} [options.extraDedupe] - Additional package names to add to `resolve.dedupe`.
 * @param {object} [options.extraAliases] - Additional aliases to include.
 * @param {boolean} [options.manageLinkedOptimizeDeps] - Manage dep pre-bundling for linked packages: pre-bundle
 *   linked reactive-helpers (single instance) and keep linked VUEDA as source. Defaults to true.
 * @param {object} [options.optimizeDeps] - Vite optimizeDeps overrides (merged with the computed include/exclude).
 * @param {boolean} [options.debug] - Log the resolved wiring and dedupe strategy. Defaults to false.
 * @returns {import('vite').UserConfig} A partial Vite config fragment.
 */
export const vuedaViteConfig = (options = {}) => {
    const {
        root = process.cwd(),
        enableDedupe = true,
        enableRuntimeAliases = true,
        excludeFromDedupe = [],
        extraDedupe = [],
        extraAliases = {},
        manageLinkedOptimizeDeps = true,
        optimizeDeps,
        debug = false,
    } = options;

    const topNodeModulesPath = path.resolve(root, "node_modules");
    const vuedaVersion = readVuedaPackageVersion();

    const vuedaWiring = classifyDependency(VUEDA_PACKAGE, root);
    const reactiveHelpersWiring = classifyDependency(REACTIVE_HELPERS_PACKAGE, root);

    // Build the dedupe set from the actual declared peers of vueda + reactive-helpers, plus the packages
    // themselves. vueda is consumed through the `@vueda` alias (a path), but bare imports of it are pinned
    // here too for completeness.
    const excludeSet = new Set(excludeFromDedupe);
    const dedupe = enableDedupe
        ? [
              ...new Set([
                  VUEDA_PACKAGE,
                  REACTIVE_HELPERS_PACKAGE,
                  ...collectPeerDependencies([
                      path.resolve(packageRoot, "../package.json"),
                      path.resolve(topNodeModulesPath, REACTIVE_HELPERS_PACKAGE, "package.json"),
                  ]),
                  ...extraDedupe,
              ]),
          ].filter((name) => !excludeSet.has(name))
        : [];

    const alias = {
        "@vueda": path.resolve(topNodeModulesPath, VUEDA_PACKAGE, "lib"),
        [REACTIVE_HELPERS_PACKAGE]: path.resolve(topNodeModulesPath, REACTIVE_HELPERS_PACKAGE),
        ...(enableRuntimeAliases
            ? {
                  vue: path.resolve(topNodeModulesPath, "vue/dist/vue.runtime.esm-bundler.js"),
                  pinia: path.resolve(topNodeModulesPath, "pinia/dist/pinia.esm-browser.js"),
                  "vue-router": path.resolve(topNodeModulesPath, "vue-router/dist/vue-router.esm-bundler.js"),
              }
            : {}),
        ...extraAliases,
    };

    // Keep linked packages as single module instances in dev. The two arrai packages need OPPOSITE treatment:
    //
    // reactive-helpers (include / pre-bundle): served as source, its bare-specifier entry (the form vueda
    //   imports) receives Vite's `?v=` dependency stamp while its own relative internal imports do not, so the
    //   same file loads under two URLs -> two module instances -> a split crud registry (handlers registered in
    //   one copy are invisible to the other: "Crud method ... is not implemented", missing crud target args).
    //   Pre-bundling collapses every import path into one optimized chunk -> one instance. Editing the linked
    //   source triggers a Vite re-optimize + reload rather than instant HMR (correct over fast).
    //
    // vueda (exclude / keep as source): consumed exclusively through the `@vueda` alias (a path, never a bare
    //   specifier), so it is already a single instance, and source-serving preserves instant HMR while
    //   customizing components.
    const linkedIncludes =
        manageLinkedOptimizeDeps && reactiveHelpersWiring === "linked" ? [REACTIVE_HELPERS_PACKAGE] : [];
    const linkedExcludes = manageLinkedOptimizeDeps && vuedaWiring === "linked" ? [VUEDA_PACKAGE] : [];

    const include = [...new Set([...(optimizeDeps?.include || []), ...linkedIncludes])];
    const exclude = [...new Set([...(optimizeDeps?.exclude || []), ...linkedExcludes])];
    const mergedOptimizeDeps =
        optimizeDeps || include.length || exclude.length
            ? {
                  ...optimizeDeps,
                  ...(include.length ? { include } : {}),
                  ...(exclude.length ? { exclude } : {}),
              }
            : undefined;

    const define = vuedaVersion
        ? {
              __VUEDA_CLIENT_VERSION__: JSON.stringify(vuedaVersion),
          }
        : {};

    if (debug) {
        console.info(
            "[vueda] vite config:\n" +
                `  ${VUEDA_PACKAGE}: ${vuedaWiring}\n` +
                `  ${REACTIVE_HELPERS_PACKAGE}: ${reactiveHelpersWiring}\n` +
                `  resolve.dedupe (${dedupe.length}): ${dedupe.join(", ") || "(none)"}\n` +
                `  optimizeDeps.include: ${mergedOptimizeDeps?.include?.join(", ") || "(none)"}\n` +
                `  optimizeDeps.exclude: ${mergedOptimizeDeps?.exclude?.join(", ") || "(none)"}`,
        );
    }

    return {
        define,
        resolve: {
            alias,
            ...(dedupe.length ? { dedupe } : {}),
        },
        ...(mergedOptimizeDeps ? { optimizeDeps: mergedOptimizeDeps } : {}),
    };
};
