"""Run the local FastAPI API and Vite frontend together for development."""

import os
import signal
import subprocess
import sys
import time


def main() -> int:
    npm = "npm.cmd" if os.name == "nt" else "npm"
    commands = [
        [sys.executable, "-m", "uvicorn", "app.main:app", "--app-dir", "backend", "--host", "127.0.0.1", "--port", "8000"],
        [npm, "run", "dev"],
    ]
    children = [subprocess.Popen(command) for command in commands]

    def stop(_signum=None, _frame=None):
        for child in children:
            if child.poll() is None:
                child.terminate()

    signal.signal(signal.SIGINT, stop)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, stop)
    try:
        while True:
            for child in children:
                code = child.poll()
                if code is not None:
                    stop()
                    return code
            time.sleep(0.2)
    except KeyboardInterrupt:
        stop()
        return 0
    finally:
        for child in children:
            if child.poll() is None:
                child.wait(timeout=5)


if __name__ == "__main__":
    sys.exit(main())
