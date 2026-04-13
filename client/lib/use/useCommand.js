/**
 * @module use/useCommand
 * @description Provides context pairs for the Command and CommandGroup component trees.
 * Based on the shadcn-vue command implementation.
 */
import { createContext } from "reka-ui";

/**
 * Injects the command context provided by the nearest `Command` ancestor.
 * `provideCommandContext` is called by `Command` to supply it.
 *
 * @type {[() => unknown, (context: unknown) => void]}
 */
export const [useCommand, provideCommandContext] = createContext("Command");

/**
 * Injects the command group context provided by the nearest `CommandGroup` ancestor.
 * `provideCommandGroupContext` is called by `CommandGroup` to supply it.
 *
 * @type {[() => unknown, (context: unknown) => void]}
 */
export const [useCommandGroup, provideCommandGroupContext] = createContext("CommandGroup");
