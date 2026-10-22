---
title: Use VUEDA with Coding Agents
type: how-to
audience: integrator
status: draft
---

# Use VUEDA with Coding Agents

Install the `using-vueda` skill in your application to give Codex or Claude Code
instructions for building with VUEDA. A skill is a Markdown file that tells an
agent when to use a workflow and how to carry it out.

This skill helps with application setup, model registration, views, fields,
actions, permissions, and workflows. It follows your application's conventions
and reads the published VUEDA documentation for the task. It does not install
VUEDA or provide instructions for contributing to the library.

## Install in Your Application

You need Node.js and an installed coding agent. From your application's
repository root, run the command for your agent:

::: code-group

```bash [Codex]
npx skills add arrai-innovations/vueda --skill using-vueda --agent codex
```

```bash [Claude Code]
npx skills add arrai-innovations/vueda --skill using-vueda --agent claude-code
```

```bash [Both]
npx skills add arrai-innovations/vueda --skill using-vueda --agent codex claude-code
```

:::

These commands use the [Skills CLI](https://github.com/vercel-labs/skills) to
install the skill for this project. They do not change your VUEDA dependencies.
The CLI stores the skill under `.agents/skills/using-vueda/` and links it into
`.claude/skills/using-vueda/` when you select Claude Code. Keep the installed
skill, agent links, and `skills-lock.json` in version control to share the
setup with your team.

Check the installation:

```bash
npx skills list --agent codex claude-code
```

Start a new agent session in the application. The agent can select the skill
when your request matches its description. You can also invoke it explicitly:

::: code-group

```text [Codex]
Use $using-vueda to add a read-only list and detail view for our Supplier model.
```

```text [Claude Code]
/using-vueda Add a read-only list and detail view for our Supplier model.
```

:::

Give the agent the application task and any constraints, such as the existing
permission rules or packages that must remain at their current versions. It
uses your project's instructions and checks alongside the skill. See the
[Codex skill documentation](https://learn.chatgpt.com/docs/build-skills) and
[Claude Code skill documentation](https://code.claude.com/docs/en/skills) for
their discovery and invocation controls.

## Documentation and Package Versions

The skill checks the Python `vueda` and JavaScript
`@arrai-innovations/vueda` versions in the relevant application packages. Both
must share a major version; their minor and patch versions can differ.

For major 3, it starts with [the documentation index](https://vueda.dev/v3/llms.txt)
and follows the Markdown links for the task. Each major has one evolving
documentation site. There is no separate site for each client or server release.
When a feature may be newer than your installation, the skill checks the
package changelog or installed API before using it.

For a known API name, the skill includes a symbol lookup script that requires
Node.js 22 or newer. It downloads the selected major's symbol index, searches
it locally, and returns matching names and Markdown links. The agent reads
the matching pages without loading the entire index into its context.
The lookup covers documented APIs and members, including component props
and slots, Python methods, and theme keys. It does not search your application.
If the helper is unavailable, the agent can follow the reference indexes.

The skill needs access to the documentation for those lookups. If it cannot
fetch a page, it can inspect installed source and application examples, and
should tell you which behavior it could not verify.

## Update the Skill

Check for skill updates when you update VUEDA dependencies. With this
installation method, neither Claude Code nor Codex downloads skill updates
automatically. Updating a VUEDA package or the coding agent does not update
the installed skill.

From your application's repository root, check for available updates:

```bash
npx skills check
```

Update this project's copy of `using-vueda`:

```bash
npx skills update using-vueda --project
```

You can also rerun the installation command. Review and commit the changed
skill files and `skills-lock.json` so that your team uses the same copy.
The lockfile records the source and a hash of the skill directory, including
its scripts. See the [Skills CLI reference](https://github.com/vercel-labs/skills/blob/main/docs/commands.md#skills-update)
for update options.

Skill updates provide new instructions and helper behavior. The symbol lookup
helper fetches the current symbol index on each run, so new symbols
and documentation pages do not require a skill update.

The [skill source](https://github.com/arrai-innovations/vueda/blob/main/skills/using-vueda/SKILL.md)
contains the instructions that both agents use.
