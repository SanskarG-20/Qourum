"""Static policy checks for runtime source and local-only security headers."""

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOTS = (ROOT / "backend", ROOT / "src", ROOT / "public")
EXTENSIONS = {".py", ".js", ".jsx", ".ts", ".tsx", ".css", ".html"}
EXCLUDED_PARTS = {"__pycache__", "node_modules", "dist"}
FAILURES: list[str] = []


def main() -> int:
    source_files = [ROOT / "index.html", ROOT / "vite.config.js"]
    for source_root in SOURCE_ROOTS:
        if source_root.exists():
            source_files.extend(source_root.rglob("*"))
    for path in source_files:
            if not path.is_file() or path.suffix.lower() not in EXTENSIONS:
                continue
            if EXCLUDED_PARTS.intersection(path.parts):
                continue
            text = path.read_text(encoding="utf-8")
            relpath = path.relative_to(ROOT)
            if re.search(r"supabase", text, re.IGNORECASE):
                FAILURES.append(f"{relpath}: hosted database reference")
            if re.search(r"huggingface\.co|huggingface_hub|hf_hub_download|snapshot_download", text, re.IGNORECASE):
                FAILURES.append(f"{relpath}: runtime model-host reference or download helper")
            if re.search(r"(?:fonts\.googleapis|fonts\.gstatic|cdn\.)", text, re.IGNORECASE):
                FAILURES.append(f"{relpath}: external CDN or font reference")
            for match in re.finditer(r"https?://[^\s\"'`<>]+", text, re.IGNORECASE):
                url = match.group(0).rstrip(")],;}")
                if not re.match(r"https?://(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?(?:/|$)", url, re.IGNORECASE):
                    FAILURES.append(f"{relpath}: external URL {url}")
            if re.search(r"dangerouslySetInnerHTML|\.innerHTML\s*=", text):
                FAILURES.append(f"{relpath}: unsafe HTML insertion")

    html_entry = (ROOT / "index.html").read_text(encoding="utf-8")
    if not re.search(r"connect-src\s+'self'", html_entry):
        FAILURES.append("index.html: CSP must restrict connect-src to self")
    if FAILURES:
        print("Hardening check failed:")
        print("\n".join(f"- {failure}" for failure in FAILURES))
        return 1
    print("Hardening check passed: local-only source, safe HTML rendering, and self-only connect-src.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
