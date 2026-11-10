"""Build browser packages without runtime dependencies. Author: wwj."""
import json
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "extension"
OUTPUT = ROOT / "outputs"


def archive(folder, target, prefix):
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as zipped:
        for item in sorted(folder.rglob("*")):
            if item.is_file() and item.name != ".DS_Store":
                zipped.write(item, Path(prefix) / item.relative_to(folder))


def build():
    OUTPUT.mkdir(exist_ok=True)
    manifest = json.loads((SOURCE / "manifest.json").read_text())
    for script in manifest["content_scripts"][0]["js"]:
        assert (SOURCE / script).is_file(), script
    for browser, name in [("chromium", "conversation-minimap"), ("firefox", "ai-minimap-firefox")]:
        folder = OUTPUT / name
        shutil.copytree(SOURCE, folder, dirs_exist_ok=True)
        version = dict(manifest)
        if browser == "firefox":
            version.update(json.loads((ROOT / "browsers/firefox.json").read_text()))
        (folder / "manifest.json").write_text(json.dumps(version, ensure_ascii=False, indent=2) + "\n")
        archive(folder, OUTPUT / f"{name}.zip", name)
        if browser == "firefox":
            archive(folder, OUTPUT / f"{name}-unsigned.xpi", "")
    safari = ROOT / "safari"
    target = safari / "Conversation Minimap/Conversation Minimap Extension/Resources"
    shutil.copytree(SOURCE, target, dirs_exist_ok=True)
    with zipfile.ZipFile(OUTPUT / "conversation-minimap-safari-project.zip", "w", zipfile.ZIP_DEFLATED) as zipped:
        for item in sorted(safari.rglob("*")):
            if item.is_file() and "xcuserdata" not in item.parts and item.name != ".DS_Store":
                zipped.write(item, item.relative_to(safari))
        zipped.write(ROOT / "docs/SAFARI.md", "SAFARI-INSTALL.md")
    print(f"Built Chromium/Safari and Firefox packages, version {manifest['version']}")


if __name__ == "__main__":
    build()
