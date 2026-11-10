"""Check release versions, runtime syntax and public document links. Author: wwj."""
import argparse
import json
import re
import subprocess
from pathlib import Path
from version import PROJECT, ROOT, validate


def check(tag=None):
    package = json.loads((ROOT / "package.json").read_text())
    manifest = json.loads((ROOT / "extension/manifest.json").read_text())
    version = validate(package["version"])
    if manifest["version"] != version:
        raise ValueError("package.json and manifest.json versions differ")
    marketing = re.findall(r'"MARKETING_VERSION": "([^"]+)"', PROJECT.read_text())
    if not marketing or any(item != version for item in marketing):
        raise ValueError("Safari project version differs")
    lock = json.loads((ROOT / "package-lock.json").read_text())
    if lock["version"] != version or lock["packages"][""]["version"] != version:
        raise ValueError("Lockfile product version differs")
    if lock["packages"][""]["devDependencies"] != package["devDependencies"]:
        raise ValueError("Lockfile dependencies differ")
    if tag is not None and tag != f"v{version}":
        raise ValueError(f"Tag {tag!r} must match v{version}")
    for script in manifest["content_scripts"][0]["js"]:
        path = ROOT / "extension" / script
        subprocess.run(["node", "--check", str(path)], check=True)
        lines = [line for line in path.read_text().splitlines() if line.strip() and not line.lstrip().startswith("//")]
        if len(lines) > 300:
            raise ValueError(f"{path.name} exceeds 300 code lines")
    for name in ["README.md", "README.zh-CN.md", "README.en.md"]:
        path = ROOT / name
        for target in re.findall(r"\]\(([^)]+)\)", path.read_text()):
            if not target.startswith(("http", "#")) and not (path.parent / target.split("#")[0]).exists():
                raise ValueError(f"Missing document target: {target}")
    print(f"Version, syntax and documents checked: {version}")
    return version


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--tag")
    check(parser.parse_args().tag)
