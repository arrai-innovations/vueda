{#-
    Renders one release section of a package changelog. The config's
    title_format supplies the "## v<version> (<date>)" heading above this
    output.

    The page layout puts each change type under a "###" heading. Each area with
    fragments of that type becomes a "####" heading beneath it, in config order.
    Building with `--name by-area` swaps the two levels, for reading every change
    to one area together while redrafting before a release.

    A fragment is a complete list entry. Its issue links go at the end of its
    first line, before a trailing colon.
-#}
{%- set newline = "\n" -%}
{%- set by_area = versiondata.name == "by-area" -%}
{%- macro entry(text, issues) -%}
    {%- set parts = text.split(newline, 1) -%}
    {%- set head = parts[0] -%}
    {%- if issues -%}
        {%- set links = " (" ~ issues | join(", ") ~ ")" -%}
        {%- if head.endswith(":") -%}
            {%- set head = head[:-1] ~ links ~ ":" -%}
        {%- else -%}
            {%- set head = head ~ links -%}
        {%- endif -%}
    {%- endif -%}
    {{- head ~ newline -}}
    {%- if parts | length > 1 -%}
        {{- parts[1] ~ newline -}}
    {%- endif -%}
{%- endmacro -%}
{%- macro entries(area, category) -%}
    {%- for text, issues in sections[area][category].items() -%}
        {{- entry(text, issues) -}}
    {%- endfor -%}
{%- endmacro -%}
{%- if by_area -%}
    {%- for area, categories in sections.items() if categories -%}
        {{- newline ~ "### " ~ area ~ newline -}}
        {%- for category, definition in definitions.items() if categories.get(category) -%}
            {{- newline ~ "#### " ~ definition.name ~ newline ~ newline -}}
            {{- entries(area, category) -}}
        {%- endfor -%}
    {%- endfor -%}
{%- else -%}
    {%- for category, definition in definitions.items() -%}
        {%- set areas = [] -%}
        {%- for area, categories in sections.items() if categories.get(category) -%}
            {%- set _ = areas.append(area) -%}
        {%- endfor -%}
        {%- if areas -%}
            {{- newline ~ "### " ~ definition.name ~ newline -}}
            {%- for area in areas -%}
                {{- newline ~ "#### " ~ area ~ newline ~ newline -}}
                {{- entries(area, category) -}}
            {%- endfor -%}
        {%- endif -%}
    {%- endfor -%}
{%- endif -%}
{{- newline -}}
