/**
 * @module use/useDevLogger
 * @description Provides a development-only logger that prefixes messages with the component name and field or widget context.
 */
import { FieldContextSymbol, WidgetContextSymbol } from "@vueda/utils/symbols.js";
import { getCurrentInstance, inject, toRaw, unref } from "vue";

/**
 * @typedef {(message:string, ...args: any[]) => void} LoggerMethod
 */

/**
 * @typedef {object} DevLogger
 * @property {LoggerMethod} log - Log a message.
 * @property {LoggerMethod} warn - Log a warning message.
 * @property {LoggerMethod} error - Log an error message.
 * @property {LoggerMethod} info - Log an info message.
 * @property {LoggerMethod} debug - Log a debug message.
 */

/**
 * A utility function to create a logger that can be used in development mode.
 *
 * @param {object} [args={}] - The arguments for the logger.
 * @param {import('@vueda/use/useField.js').FieldContext|null} [args.fieldContext=null] - The field context to use for logging.
 * @param {import('@vueda/use/useWidget.js').WidgetContext|null} [args.widgetContext=null] - The widget context to use for logging.
 * @returns {DevLogger} - The logger object with methods for logging messages.
 */
export function useDevLogger({ fieldContext = null, widgetContext = null } = {}) {
    if (import.meta.env.PROD) {
        // In production, return no-op to avoid slowing things down
        return {
            log: () => {},
            warn: () => {},
            error: () => {},
            info: () => {},
            debug: () => {},
        };
    }

    const instance = getCurrentInstance();
    const componentName = instance?.type?.__name ?? "(unknown component)";

    const resolvedWidgetContext = widgetContext ?? inject(WidgetContextSymbol, null);
    const resolvedFieldContext = fieldContext ?? inject(FieldContextSymbol, null);

    const log = (level, message, ...args) => {
        let contextPart = "";

        if (resolvedWidgetContext?.state?.combinedName) {
            contextPart = `[widget:${resolvedWidgetContext.state.combinedName}]`;
        } else if (resolvedFieldContext?.state?.name) {
            contextPart = `[field:${resolvedFieldContext.state.name}]`;
        }

        const prefix = contextPart ? `[${componentName}] ${contextPart}` : `[${componentName}]`;

        const unrefArgs = args.map((arg) => toRaw(unref(arg)));

        console[level](`${prefix} ${message}`, ...unrefArgs);
    };

    return {
        log: log.bind(null, "log"),
        warn: log.bind(null, "warn"),
        error: log.bind(null, "error"),
        info: log.bind(null, "info"),
        debug: log.bind(null, "debug"),
    };
}
