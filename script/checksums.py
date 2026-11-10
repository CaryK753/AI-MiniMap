"""Write release SHA-256 checksums. Author: wwj."""
import argparse
import hashlib
from pathlib import Path


def write(folder):
    files = sorted([*folder.glob("*.zip"), *folder.glob("*.xpi")])
    if not files:
        raise ValueError("No release archives found")
    output = folder / "SHA256SUMS"
    output.write_text("".join(f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}\n" for path in files))
    print(f"Checksums written for {len(files)} archives")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("folder", type=Path)
    write(parser.parse_args().folder)
