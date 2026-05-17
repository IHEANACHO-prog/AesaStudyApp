#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════╗
║         AESA PROJECT — FILE DESTINATION FINDER              ║
║  Run this once from ANYWHERE on your machine.               ║
║  It scans your whole drive and tells you exactly where      ║
║  to paste each of the four output files.                    ║
╚══════════════════════════════════════════════════════════════╝

USAGE:
    python find_paste_locations.py

    Or point it at a specific root to scan faster:
    python find_paste_locations.py E:\\AESA-STUDY
"""

import os
import sys
from pathlib import Path

# ── ANSI colours (disabled automatically on Windows if not supported) ─────────
def _supports_colour():
    if sys.platform == "win32":
        try:
            import ctypes
            kernel = ctypes.windll.kernel32
            kernel.SetConsoleMode(kernel.GetStdHandle(-11), 7)
            return True
        except Exception:
            return False
    return hasattr(sys.stdout, "isatty") and sys.stdout.isatty()

USE_COLOUR = _supports_colour()

def c(text, code):
    return f"\033[{code}m{text}\033[0m" if USE_COLOUR else text

GREEN  = lambda t: c(t, "32")
YELLOW = lambda t: c(t, "33")
CYAN   = lambda t: c(t, "36")
BOLD   = lambda t: c(t, "1")
RED    = lambda t: c(t, "31")
DIM    = lambda t: c(t, "2")

# ── The four files we need to place ──────────────────────────────────────────
#
# Each entry:
#   key          → short label
#   output_file  → filename Claude produced (in your outputs folder)
#   find_by      → list of (filename, required_content_snippet) tuples.
#                  The locator tries each in order; first match wins.
#   hint         → human-readable description of where it should land
#   new_file     → True means the file doesn't exist yet (we find the folder)

TARGETS = [
    {
        "key": "client.ts",
        "output_file": "client.ts",
        "hint": "React Native / Vite frontend API client",
        "new_file": False,
        "find_by": [
            # Existing client.ts that already has aesa_access or API_BASE_URL
            ("client.ts", "aesa_access"),
            ("client.ts", "API_BASE_URL"),
            ("client.ts", "apiRequest"),
        ],
        "folder_fallback": [
            # If no client.ts found yet, look for the api/ folder
            ("api", None),
        ],
    },
    {
        "key": "forum_urls.py",
        "output_file": "forum_urls.py",
        "hint": "New Django URL file for forum endpoints",
        "new_file": True,          # doesn't exist yet — find the urls/ folder
        "find_by": [
            # Sibling files that live in the same urls/ folder
            ("q_and_a_urls.py",  None),
            ("exam_urls.py",     None),
            ("course_urls.py",   None),
            ("user_urls.py",     None),
        ],
    },
    {
        "key": "q_and_a_forum.py",
        "output_file": "q_and_a_forum.py",
        "hint": "Upgraded Django forum view functions",
        "new_file": False,
        "find_by": [
            ("q_and_a_forum.py", "QuestionForum"),
            ("q_and_a_forum.py", "get_questions"),
            ("q_and_a_forum.py", "AnswerForum"),
        ],
    },
    {
        "key": "urls.py  (mysite)",
        "output_file": "urls.py",
        "hint": "Root Django URL config (has TokenObtainPairView)",
        "new_file": False,
        "find_by": [
            ("urls.py", "TokenObtainPairView"),
            ("urls.py", "token_obtain_pair"),
            ("urls.py", "handler.urls"),
        ],
    },
]

# ── Directories to always skip (speeds up scan enormously) ───────────────────
SKIP_DIRS = {
    "__pycache__", ".git", "node_modules", ".venv", "venv", "env",
    ".mypy_cache", ".pytest_cache", "dist", "build", ".expo",
    "android", "ios", ".gradle", ".idea", ".vscode",
    "site-packages", "migrations",   # migrations has tons of urls-like files
}

# ── Core scanner ─────────────────────────────────────────────────────────────

def scan(root: Path):
    """
    Walk the directory tree under `root`.
    Yield (filepath: Path) for every file, skipping SKIP_DIRS.
    """
    for dirpath, dirnames, filenames in os.walk(root):
        # Prune skip dirs in-place so os.walk doesn't descend into them
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fname in filenames:
            yield Path(dirpath) / fname


def file_contains(path: Path, snippet: str) -> bool:
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
        return snippet in text
    except (OSError, PermissionError):
        return False


def find_target(target: dict, all_files: list[Path]) -> dict:
    """
    Returns {
        "matches": list of Path,   # exact file matches (replace here)
        "folders": list of Path,   # parent folders (paste new file here)
        "method":  str,            # how we found it
    }
    """
    results = {"matches": [], "folders": [], "method": ""}

    if not target["new_file"]:
        # Look for the actual file, optionally containing a snippet
        for (fname, snippet) in target["find_by"]:
            hits = [
                p for p in all_files
                if p.name == fname and (snippet is None or file_contains(p, snippet))
            ]
            if hits:
                results["matches"] = hits
                results["method"]  = f'found "{fname}"' + (f' containing "{snippet}"' if snippet else "")
                return results

    else:
        # New file — find the folder where siblings live
        for (sibling_name, snippet) in target["find_by"]:
            sibling_hits = [
                p for p in all_files
                if p.name == sibling_name and (snippet is None or file_contains(p, snippet))
            ]
            if sibling_hits:
                results["folders"] = [p.parent for p in sibling_hits]
                results["method"]  = f'found sibling "{sibling_name}" → use its folder'
                return results

    return results   # empty — not found


# ── Pretty printer ────────────────────────────────────────────────────────────

def print_result(target: dict, result: dict):
    key    = target["key"]
    hint   = target["hint"]
    output = target["output_file"]

    print()
    print(BOLD(f"▸ {key}"))
    print(DIM(f"  {hint}"))
    print(DIM(f"  Output file: {output}"))

    if not result["matches"] and not result["folders"]:
        print(RED("  ✗ NOT FOUND — check the scan root or search manually"))
        return

    print(DIM(f"  Located via: {result['method']}"))

    if result["matches"]:
        print(GREEN("  ✓ REPLACE this file:"))
        for p in result["matches"]:
            print(f"      {CYAN(str(p))}")

    if result["folders"]:
        print(GREEN("  ✓ CREATE new file in this folder:"))
        for folder in result["folders"]:
            full_dest = folder / target["output_file"]
            print(f"      {CYAN(str(full_dest))}")


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    # Determine scan root
    if len(sys.argv) > 1:
        root = Path(sys.argv[1])
    else:
        # Default: scan the whole user home + common drive roots
        candidates = [
            Path.home(),
            Path("C:/"),
            Path("D:/"),
            Path("E:/"),
        ]
        root = next((p for p in candidates if p.exists()), Path.home())

    if not root.exists():
        print(RED(f"Error: '{root}' does not exist."))
        sys.exit(1)

    print()
    print(BOLD("╔══════════════════════════════════════════════════╗"))
    print(BOLD("║       AESA FILE DESTINATION FINDER               ║"))
    print(BOLD("╚══════════════════════════════════════════════════╝"))
    print(f"  Scanning: {CYAN(str(root))}")
    print(DIM("  (skipping node_modules, .git, __pycache__, venv, migrations, ...)"))
    print()

    # Collect all files first (gives a progress feel and avoids repeated walks)
    print(DIM("  Indexing files..."), end="", flush=True)
    all_files = list(scan(root))
    print(f"\r  {GREEN('✓')} Indexed {len(all_files):,} files from {str(root)}")

    # Run each target
    print()
    print(BOLD("─" * 54))
    print(BOLD("  RESULTS"))
    print(BOLD("─" * 54))

    found_count = 0
    for target in TARGETS:
        result = find_target(target, all_files)
        print_result(target, result)
        if result["matches"] or result["folders"]:
            found_count += 1

    # Summary
    print()
    print(BOLD("─" * 54))
    total = len(TARGETS)
    if found_count == total:
        print(GREEN(f"  ✓ All {total}/{total} destinations found."))
    else:
        missing = total - found_count
        print(YELLOW(f"  ⚠ {found_count}/{total} found — {missing} not located."))
        print(DIM("    Try running with your project root as an argument:"))
        print(DIM("    python find_paste_locations.py E:\\AESA-STUDY"))
    print()

    # Quick-copy summary — paste-ready paths
    print(BOLD("  PASTE-READY PATHS"))
    print(BOLD("─" * 54))
    for target in TARGETS:
        result = find_target(target, all_files)
        output = target["output_file"]
        key    = target["key"]
        if result["matches"]:
            print(f"  {YELLOW(output):30s}  →  {result['matches'][0]}")
        elif result["folders"]:
            dest = result["folders"][0] / output
            print(f"  {YELLOW(output):30s}  →  {dest}  {DIM('(new)')}")
        else:
            print(f"  {RED(output):30s}  →  {RED('NOT FOUND')}")
    print()


if __name__ == "__main__":
    main()
