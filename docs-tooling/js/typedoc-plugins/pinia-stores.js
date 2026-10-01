/**
 * TypeDoc plugin that documents the members of Pinia options stores.
 *
 * `defineStore("id", { state, getters, actions })` returns a store definition function, so TypeDoc
 * sees only that function and Pinia's own `$id`. The state keys, getters, and actions exist only in
 * the options object passed to `defineStore`. This plugin hands each of them to TypeDoc's converter
 * as a child of the store, so each gets its JSDoc, its inferred type or signature, and a member ID.
 */
import { Converter, ReflectionKind, TypeScript as ts } from "typedoc";

/**
 * Return the options object literal of a `defineStore(id, options)` variable declaration. Return null
 * when the declaration is not a `defineStore` call or its second argument is not an object literal.
 */
function storeOptions(declaration) {
    const call = declaration && ts.isVariableDeclaration(declaration) ? declaration.initializer : null;
    if (!call || !ts.isCallExpression(call) || call.expression.getText() !== "defineStore") {
        return null;
    }
    const options = call.arguments[1];
    return options && ts.isObjectLiteralExpression(options) ? options : null;
}

/**
 * Return the member nodes of one section of the options object: the object `state` returns, the
 * `getters` object literal, or the `actions` object literal.
 */
function sectionMembers(property) {
    let value = property.initializer ?? null;
    if (ts.isMethodDeclaration(property)) {
        value = property;
    }
    if (!value) {
        return [];
    }
    if (ts.isObjectLiteralExpression(value)) {
        return value.properties;
    }
    // state: () => ({ ... }) or state() { return { ... }; }
    let body = value.body;
    if (body && ts.isParenthesizedExpression(body)) {
        body = body.expression;
    }
    if (body && ts.isBlock(body)) {
        const returned = body.statements.find((statement) => ts.isReturnStatement(statement))?.expression;
        body = returned && ts.isParenthesizedExpression(returned) ? returned.expression : returned;
    }
    return body && ts.isObjectLiteralExpression(body) ? body.properties : [];
}

/**
 * Return the function an entry names, for an entry written as `name,` or `name: otherName`, or null.
 * TypeDoc would otherwise document such an entry as a property typed `Function`, without the
 * function's JSDoc or signature.
 */
function referencedFunction(checker, member) {
    let target = null;
    if (ts.isShorthandPropertyAssignment(member)) {
        target = checker.getShorthandAssignmentValueSymbol(member);
    } else if (ts.isPropertyAssignment(member) && ts.isIdentifier(member.initializer)) {
        target = checker.getSymbolAtLocation(member.initializer);
    }
    if (target && target.flags & ts.SymbolFlags.Alias) {
        target = checker.getAliasedSymbol(target);
    }
    if (!target || !(target.flags & ts.SymbolFlags.Function)) {
        return null;
    }
    // TypeScript marks a JavaScript function that assigns to `this` as a class too, and TypeDoc then
    // converts it as one. An action uses `this` for the store, so present the symbol without the
    // class flag.
    if (target.flags & ts.SymbolFlags.Class) {
        return Object.create(target, { flags: { value: target.flags & ~ts.SymbolFlags.Class } });
    }
    return target;
}

export function load(app) {
    app.converter.on(Converter.EVENT_CREATE_DECLARATION, (context, reflection) => {
        const symbol = context.project.getSymbolFromReflection(reflection);
        const options = storeOptions(symbol?.valueDeclaration);
        if (!options) {
            return;
        }
        const scope = context.withScope(reflection);
        for (const section of options.properties) {
            const name = section.name?.getText();
            if (!["state", "getters", "actions"].includes(name)) {
                continue;
            }
            for (const member of sectionMembers(section)) {
                const memberSymbol = member.name ? context.checker.getSymbolAtLocation(member.name) : null;
                if (!memberSymbol) {
                    continue;
                }
                const target = referencedFunction(context.checker, member);
                if (!target) {
                    context.converter.convertSymbol(scope, memberSymbol);
                    continue;
                }
                // Convert the named function under the entry's name, and list it as a method like
                // the actions declared in place.
                context.converter.convertSymbol(scope, target, memberSymbol);
                const child = reflection.getChildByName(memberSymbol.name);
                if (child?.kind === ReflectionKind.Function) {
                    child.kind = ReflectionKind.Method;
                }
                // Pinia binds `this` to the store, so an `@this` tag is not a parameter callers pass.
                for (const signature of child?.signatures ?? []) {
                    signature.parameters = signature.parameters?.filter((parameter) => parameter.name !== "this");
                }
            }
        }
    });
}
