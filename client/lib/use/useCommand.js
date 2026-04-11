/**
 * @module use/useCommand
 * @description Provides context pairs for the Command and CommandGroup component trees.
 * Based on the shadcn-vue command implementation.
 */
import { createContext } from "reka-ui";

/**
 * Injects the command context provided by the nearest `ControlCommand` ancestor.
 * `provideCommandContext` is called by `ControlCommand` to supply it.
 *
 * @type {[() => unknown, (context: unknown) => void]}
 */
export const [useCommand, provideCommandContext] = createContext("Command");

/**
 * Injects the command group context provided by the nearest `ControlCommandGroup` ancestor.
 * `provideCommandGroupContext` is called by `ControlCommandGroup` to supply it.
 *
 * @type {[() => unknown, (context: unknown) => void]}
 */
export const [useCommandGroup, provideCommandGroupContext] = createContext("CommandGroup");
