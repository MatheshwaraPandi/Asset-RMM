import os
import shutil
import tempfile
from datetime import datetime
from pathlib import Path

import PyInstaller.__main__


BASE_DIR = Path(__file__).resolve().parent
BUILD_ROOT = Path(tempfile.gettempdir()) / "asset-rmm-agent-build"
DIST_TARGET = BASE_DIR / "dist_fresh"
EXE_NAME = "AssetScanner_v2"
ENTRYPOINT = BASE_DIR / "agent.py"


def build() -> Path:
    workpath = BUILD_ROOT / "build"
    distpath = BUILD_ROOT / "dist"
    specpath = BASE_DIR

    for path in (workpath, distpath, DIST_TARGET):
        path.mkdir(parents=True, exist_ok=True)

    PyInstaller.__main__.run(
        [
            str(ENTRYPOINT),
            "--onefile",
            "--noconsole",
            f"--name={EXE_NAME}",
            "--clean",
            f"--workpath={workpath}",
            f"--distpath={distpath}",
            f"--specpath={specpath}",
        ]
    )

    built_exe = distpath / f"{EXE_NAME}.exe"
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    final_exe = DIST_TARGET / f"{EXE_NAME}_{timestamp}.exe"
    shutil.copy2(built_exe, final_exe)
    return final_exe


if __name__ == "__main__":
    output = build()
    print(output)
