#!/usr/bin/env bash
# Author: wwj
set -euo pipefail
mode="${1:-run}"
case "$mode" in
  run|--build-only|--verify|--debug|--logs|--telemetry) ;;
  *) echo "Usage: $0 [--build-only|--verify|--debug|--logs|--telemetry]" >&2; exit 2 ;;
esac
root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
app_name="Conversation Minimap"
project_dir="$root_dir/safari/$app_name"
derived_dir="$root_dir/work/safari-derived"
app_bundle="$derived_dir/Build/Products/Release/$app_name.app"
if [[ "$mode" != --build-only ]]; then
  if pgrep -x "$app_name" >/dev/null; then pkill -x "$app_name"; fi
fi
/usr/bin/ditto "$root_dir/extension" "$project_dir/$app_name Extension/Resources"
xcodebuild -project "$project_dir/$app_name.xcodeproj" -scheme "$app_name" -configuration Release \
  -derivedDataPath "$derived_dir" CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual build
/usr/bin/codesign --verify --deep --strict "$app_bundle"
case "$mode" in
  --build-only) ;;
  --debug) lldb -- "$app_bundle/Contents/MacOS/$app_name" ;;
  --logs|--telemetry)
    /usr/bin/open -n "$app_bundle"
    /usr/bin/log stream --info --style compact --predicate 'process == "Conversation Minimap"'
    ;;
  --verify)
    /usr/bin/open -n "$app_bundle"
    sleep 1
    pgrep -x "$app_name" >/dev/null
    ;;
  run) /usr/bin/open -n "$app_bundle" ;;
esac
