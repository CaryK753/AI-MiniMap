"""Build clean, timestamp-stable browser archives. Author: wwj."""
import json
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "extension"
OUTPUT = ROOT / "outputs"


def copy_clean(source, destination):
    if destination.exists():
        shutil.rmtree(destination)
    shutil.copytree(source, destination, ignore=shutil.ignore_patterns(".DS_Store", "__pycache__"))


def add_file(zipped, source, name):
    info = zipfile.ZipInfo(str(name).replace("\\", "/"), date_time=(1980, 1, 1, 0, 0, 0))
    info.compress_type = zipfile.ZIP_DEFLATED
    info.create_system = 3
    info.external_attr = (0o755 if source.stat().st_mode & 0o111 else 0o644) << 16
    zipped.writestr(info, source.read_bytes(), compresslevel=9)


def archive(folder, target, prefix):
    with zipfile.ZipFile(target, "w") as zipped:
        for item in sorted(folder.rglob("*")):
            if item.is_file() and item.name != ".DS_Store":
                add_file(zipped, item, Path(prefix) / item.relative_to(folder))


def build():
    OUTPUT.mkdir(exist_ok=True)
    manifest = json.loads((SOURCE / "manifest.json").read_text())
    for script in manifest["content_scripts"][0]["js"]:
        if not (SOURCE / script).is_file():
            raise ValueError(f"Missing content script: {script}")
    for browser, name in [("chromium", "conversation-minimap"), ("firefox", "ai-minimap-firefox")]:
        folder = OUTPUT / name
        copy_clean(SOURCE, folder)
        version = dict(manifest)
        if browser == "firefox":
            version.update(json.loads((ROOT / "browsers/firefox.json").read_text()))
        (folder / "manifest.json").write_text(json.dumps(version, ensure_ascii=False, indent=2) + "\n")
        archive(folder, OUTPUT / f"{name}.zip", name)
        if browser == "firefox":
            archive(folder, OUTPUT / f"{name}-unsigned.xpi", "")
    safari = ROOT / "safari"
    target = safari / "Conversation Minimap/Conversation Minimap Extension/Resources"
    copy_clean(SOURCE, target)
    with zipfile.ZipFile(OUTPUT / "conversation-minimap-safari-project.zip", "w") as zipped:
        for item in sorted(safari.rglob("*")):
            if item.is_file() and "xcuserdata" not in item.parts and item.name != ".DS_Store":
                add_file(zipped, item, item.relative_to(safari))
        add_file(zipped, ROOT / "docs/SAFARI.md", "SAFARI-INSTALL.md")
    print(f"Built Chromium/Safari and Firefox packages, version {manifest['version']}")


if __name__ == "__main__":
    build()
