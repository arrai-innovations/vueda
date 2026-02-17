import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const VUEDA_PACKAGE = "@arrai-innovations/vueda";
const REACTIVE_HELPERS_PACKAGE = "@arrai-innovations/reactive-helpers";
const DEFAULT_EXCLUDE_PACKAGES = ["vite", "vue", "vue-router", "pinia"];

const packageRoot = fileURLToPath(new URL(".", import.meta.url));

const readVuedaPackageVersion = () => {
    const packageJsonPath = path.resolve(packageRoot, "../package.json");
    try {
        const contents = fs.readFileSync(packageJsonPath, "utf-8");
        return JSON.parse(contents).version || "";
    } catch {
        console.warn("[vueda] Could not read package.json version:", packageJsonPath);
        return "";
    }
};

const isNpmLinked = (packageName, baseDir) => {
    try {
        const packagePath = path.resolve(baseDir, "node_modules", packageName);
        return fs.lstatSync(packagePath).isSymbolicLink();
    } catch {
        return false;
    }
};

const generateAliasesForLinkedPackage = (
    packageName,
    { baseDir, topNodeModulesPath, excludePackages = DEFAULT_EXCLUDE_PACKAGES },
) => {
    const packageNodeModulesPath = path.resolve(baseDir, "node_modules", packageName, "node_modules");
    const aliases = {};

    const traverseModules = (dir, scope = "") => {
        let entries = [];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            if (!entry.isDirectory()) {
                continue;
            }

            const name = entry.name;
            if (name.startsWith(".")) {
                continue;
            }

            const fullName = scope ? `${scope}/${name}` : name;
            const entryPath = path.join(dir, name);

            if (name.startsWith("@")) {
                traverseModules(entryPath, name);
                continue;
            }

            if (excludePackages.includes(name) || excludePackages.includes(fullName)) {
                continue;
            }

            const topModulePath = path.join(topNodeModulesPath, fullName);
            if (fs.existsSync(topModulePath)) {
                aliases[fullName] = path.resolve(topModulePath);
            }
        }
    };

    traverseModules(packageNodeModulesPath);

    return aliases;
};

export const vuedaViteConfig = (options = {}) => {
    const {
        root = process.cwd(),
        enableSourceAlias = true,
        enableSymlinkFixes = true,
        enableRuntimeAliases = true,
        excludePackages = DEFAULT_EXCLUDE_PACKAGES,
        extraAliases = {},
        optimizeDeps,
    } = options;

    const topNodeModulesPath = path.resolve(root, "node_modules");
    const vuedaVersion = readVuedaPackageVersion();

    const isVuedaLinked = enableSymlinkFixes ? isNpmLinked(VUEDA_PACKAGE, root) : false;
    const isReactiveHelpersLinked = enableSymlinkFixes ? isNpmLinked(REACTIVE_HELPERS_PACKAGE, root) : false;
    const isNestedReactiveHelpersLinked =
        enableSymlinkFixes && isVuedaLinked
            ? isNpmLinked(REACTIVE_HELPERS_PACKAGE, path.resolve(root, "node_modules", VUEDA_PACKAGE))
            : false;

    const dynamicAliases = enableSymlinkFixes
        ? {
              ...(isReactiveHelpersLinked
                  ? generateAliasesForLinkedPackage(REACTIVE_HELPERS_PACKAGE, {
                        baseDir: root,
                        topNodeModulesPath,
                        excludePackages,
                    })
                  : {}),
              ...(isVuedaLinked
                  ? generateAliasesForLinkedPackage(VUEDA_PACKAGE, {
                        baseDir: root,
                        topNodeModulesPath,
                        excludePackages,
                    })
                  : {}),
              ...(isNestedReactiveHelpersLinked
                  ? generateAliasesForLinkedPackage(REACTIVE_HELPERS_PACKAGE, {
                        baseDir: path.resolve(root, "node_modules", VUEDA_PACKAGE),
                        topNodeModulesPath,
                        excludePackages,
                    })
                  : {}),
          }
        : {};

    const alias = {
        ...dynamicAliases,
        ...(enableSourceAlias
            ? { "@vueda": path.resolve(topNodeModulesPath, VUEDA_PACKAGE, "lib") }
            : {}),
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

    const define = vuedaVersion
        ? {
              __VUEDA_CLIENT_VERSION__: JSON.stringify(vuedaVersion),
          }
        : {};

    return {
        define,
        resolve: {
            alias,
        },
        ...(optimizeDeps ? { optimizeDeps } : {}),
    };
};
