"""Release invariants and clean/repeatable packaging. Author: wwj."""
import contextlib
import hashlib
import importlib.util
import io
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "script"))
import check
import version

spec = importlib.util.spec_from_file_location("packager", ROOT / "script/package.py")
packager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packager)


class ReleaseTests(unittest.TestCase):
    def test_reject_invalid_versions(self):
        for value in ["v1.2.3", "1.2", "1.02.3", "1.2.3-beta", "1.2.65536", "1.2.3;exit"]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                version.validate(value)

    def test_tag_matches_version(self):
        current = json.loads((ROOT / "package.json").read_text())["version"]
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(check.check(f"v{current}"), current)
        with self.assertRaises(ValueError):
            check.check("v0.0.0")

    def test_clean_and_timestamp_stable_packages(self):
        saved = packager.ROOT, packager.SOURCE, packager.OUTPUT
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copytree(ROOT / "extension", root / "extension")
            shutil.copytree(ROOT / "browsers", root / "browsers")
            (root / "docs").mkdir()
            (root / "docs/SAFARI.md").write_text("Safari development instructions\n")
            (root / "safari").mkdir()
            packager.ROOT, packager.SOURCE, packager.OUTPUT = root, root / "extension", root / "outputs"
            try:
                with contextlib.redirect_stdout(io.StringIO()):
                    packager.build()
                before = {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in (root / "outputs").glob("*.zip")}
                stale = root / "outputs/conversation-minimap/content/obsolete.js"
                stale.write_text("old file")
                safari_stale = root / "safari/Conversation Minimap/Conversation Minimap Extension/Resources/content/obsolete.js"
                safari_stale.write_text("old native resource")
                with contextlib.redirect_stdout(io.StringIO()):
                    packager.build()
                self.assertFalse(stale.exists())
                self.assertFalse(safari_stale.exists())
                after = {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in (root / "outputs").glob("*.zip")}
                self.assertEqual(before, after)
            finally:
                packager.ROOT, packager.SOURCE, packager.OUTPUT = saved


if __name__ == "__main__":
    unittest.main()
