import PyInstaller.__main__
import os

def build():
    PyInstaller.__main__.run([
        'agent.py',
        '--onefile',
        '--noconsole',
        '--name=AssetScanner_v2',
        '--clean',
    ])

if __name__ == "__main__":
    build()