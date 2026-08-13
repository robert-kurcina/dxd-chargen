#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd "$script_dir/.." && pwd)"

if [[ -d "$project_dir/tts/data" ]]; then
  default_source="$project_dir/tts/data"
else
  default_source="$project_dir/tts/character-data"
fi

source_dir="${1:-$default_source}"
data_dir="${2:-$project_dir/creator/data}"
migrated_dir="$data_dir/migrated"
converted_dir="$data_dir/converted"
pml_values="$script_dir/pml-values.json"

if ! command -v jq >/dev/null 2>&1; then
  printf 'Error: jq is required but was not found in PATH.\n' >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  printf 'Error: node is required but was not found in PATH.\n' >&2
  exit 1
fi

typescript_source="$project_dir/creator/script/character-sheet.ts"
javascript_output="$project_dir/creator/script/character-sheet.js"
typescript_compiler="$project_dir/../node_modules/.bin/tsc"
if [[ ! -x "$typescript_compiler" ]]; then
  printf 'Error: TypeScript compiler does not exist: %s\n' "$typescript_compiler" >&2
  exit 1
fi
"$typescript_compiler" --ignoreConfig --strict --target ES2020 --module ES2020 \
  --outDir "$project_dir/creator/script" "$typescript_source"
if [[ ! -d "$source_dir" ]]; then
  printf 'Error: source directory does not exist: %s\n' "$source_dir" >&2
  exit 1
fi
if [[ ! -f "$pml_values" ]]; then
  printf 'Error: PML value manifest does not exist: %s\n' "$pml_values" >&2
  exit 1
fi

mkdir -p "$migrated_dir" "$converted_dir"

copied=0
while IFS= read -r -d '' source_file; do
  filename="$(basename "$source_file")"
  slug="${filename%.json}"
  target="$migrated_dir/$filename"
  temporary="$target.tmp"
  pml="$(jq -er --arg slug "$slug" '.[$slug].pml | numbers' "$pml_values")" || {
    printf 'Error: no numeric PML recorded for %s\n' "$slug" >&2
    exit 1
  }
  jq --sort-keys --argjson pml "$pml" '
    if type != "object" then error("character data must be an object")
    elif has("LuaScriptState") then (.LuaScriptState | fromjson | .textbox)
    elif has("textbox") then .textbox
    else . end
    | if type != "object" or ((.Name // "") == "")
      then error("character data has no populated Name") else . end
    | del(.CharacterLevel)
    | .PML = $pml
    | ([((.HistoryNotes // "") | scan("(?i)Deity\\s*-\\s*([0-9]+)"))][0][0] // "0" | tonumber) as $deity
    | .FavorDice = ($pml + $deity)
  ' "$source_file" > "$temporary"
  mv "$temporary" "$target"
  copied=$((copied + 1))
done < <(find "$source_dir" -maxdepth 1 -type f -name '*.json' -print0 | sort -z)

if [[ "$copied" -eq 0 ]]; then
  printf 'Error: no JSON character files found in %s\n' "$source_dir" >&2
  exit 1
fi

node "$script_dir/convert-character-data.mjs" "$migrated_dir" "$converted_dir" "$javascript_output"
printf 'Copied %d migrated files into %s\n' "$copied" "$migrated_dir"
