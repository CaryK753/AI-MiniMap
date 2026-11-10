"""Synchronize product versions. Author: wwj."""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / "safari/Conversation Minimap/Conversation Minimap.xcodeproj/project.xcproj"


def validate(version):
    if not re.fullmatch(r"(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)", version):
        raise ValueError("Version must be X.Y.Z without a prefix or prerelease suffix")
    if any(int(part) > 65535 for part in version.split(".")):
        raise ValueError("Browser version components must be <= 65535")
    return version


def set_version(version):
    validate(version)
    for relative in ["package.json", "extension/manifest.json"]:
        path = ROOT / relative
        value = json.loads(path.read_text())
        value["version"] = version
        path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    lock_path = ROOT / "package-lock.json"
    if lock_path.exists():
        lock = json.loads(lock_path.read_text())
        lock["version"] = version
        lock["packages"][""]["version"] = version
        lock_path.write_text(json.dumps(lock, indent=2) + "\n")
    PROJECT.write_text(re.sub(r'"MARKETING_VERSION": "[^"]+"', f'"MARKETING_VERSION": "{version}"', PROJECT.read_text()))
    resource = ROOT / "safari/Conversation Minimap/Conversation Minimap Extension/Resources/manifest.json"
    resource.write_text((ROOT / "extension/manifest.json").read_text())
    for name in ["README.md", "README.zh-CN.md", "docs/SAFARI.md"]:
        path = ROOT / name
        text = re.sub(r"(?<=Version )\d+\.\d+\.\d+|(?<=版本 )\d+\.\d+\.\d+|(?<=版本：)\d+\.\d+\.\d+", version, path.read_text())
        path.write_text(text)
    print(f"Version set to {version}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("version")
    args = parser.parse_args()
    set_version(args.version)
