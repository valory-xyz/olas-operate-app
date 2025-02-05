import json
import os
import subprocess
import sys
from pathlib import Path
from typing import TYPE_CHECKING

from operate.constants import DEPLOYMENT


if TYPE_CHECKING:
    from operate.cli import OperateApp


def find_build_directory(config_file: Path, operate: "OperateApp") -> Path:
    """Find the appropriate build directory of the configured service."""
    with open(config_file, "r") as f:
        config = json.load(f)
        config_service_hash = config.get("hash")

    services = operate.service_manager()._get_all_services()
    for service in services:
        if service.hash == config_service_hash:
            build_dir = service.path / DEPLOYMENT
            if not build_dir.exists():
                print(f"{config.get('name')} not deployed.")
                sys.exit(1)
            return build_dir

    print(f"{config.get('name')} not found.")
    sys.exit(1)


def run_analysis(logs_dir, **kwargs):
    """Run the log analysis command."""
    command = [
        "poetry",
        "run",
        "autonomy",
        "analyse",
        "logs",
        "--from-dir",
        logs_dir,
    ]
    if kwargs.get("agent"):
        command.extend(["--agent", kwargs.get("agent")])
    if kwargs.get("reset_db"):
        command.extend(["--reset-db"])
    if kwargs.get("start_time"):
        command.extend(["--start-time", kwargs.get("start_time")])
    if kwargs.get("end_time"):
        command.extend(["--end-time", kwargs.get("end_time")])
    if kwargs.get("log_level"):
        command.extend(["--log-level", kwargs.get("log_level")])
    if kwargs.get("period"):
        command.extend(["--period", kwargs.get("period")])
    if kwargs.get("round"):
        command.extend(["--round", kwargs.get("round")])
    if kwargs.get("behaviour"):
        command.extend(["--behaviour", kwargs.get("behaviour")])
    if kwargs.get("fsm"):
        command.extend(["--fsm"])
    if kwargs.get("include_regex"):
        command.extend(["--include-regex", kwargs.get("include_regex")])
    if kwargs.get("exclude_regex"):
        command.extend(["--exclude-regex", kwargs.get("exclude_regex")])

    try:
        subprocess.run(command, check=True)
        print("Analysis completed successfully.")
    except subprocess.CalledProcessError as e:
        print(f"Command failed with exit code {e.returncode}")
        sys.exit(e.returncode)
    except FileNotFoundError:
        print("Poetry or autonomy not found. Ensure they are installed and accessible.")
        sys.exit(1)


def analyse_logs(operate: "OperateApp", config_path: str, **kwargs):
    config_file = Path(config_path)
    if not config_file.exists():
        print(f"Config file '{config_file}' not found.")
        sys.exit(1)

    # Auto-detect the logs directory
    build_dir = find_build_directory(config_file, operate)
    logs_dir = os.path.join(build_dir, "persistent_data", "logs")
    if not os.path.exists(logs_dir):
        print(f"Logs directory '{logs_dir}' not found.")
        sys.exit(1)

    # Run the analysis
    run_analysis(logs_dir, **kwargs)
