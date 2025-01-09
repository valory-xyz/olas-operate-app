#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ------------------------------------------------------------------------------
#
#   Copyright 2024 Valory AG
#
#   Licensed under the Apache License, Version 2.0 (the "License");
#   you may not use this file except in compliance with the License.
#   You may obtain a copy of the License at
#
#       http://www.apache.org/licenses/LICENSE-2.0
#
#   Unless required by applicable law or agreed to in writing, software
#   distributed under the License is distributed on an "AS IS" BASIS,
#   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#   See the License for the specific language governing permissions and
#   limitations under the License.
#
# ------------------------------------------------------------------------------
"""Source code to run and stop deployments created."""
from concurrent.futures import ThreadPoolExecutor
from contextlib import suppress
import json
import os
import platform
import shutil  # nosec
import subprocess  # nosec
import sys  # nosec
import time
import typing as t
from abc import ABC, ABCMeta, abstractmethod
from pathlib import Path
from traceback import print_exc
from typing import Any
from venv import main as venv_cli

import aiohttp
import psutil
import requests
from aea.__version__ import __version__ as aea_version
from autonomy.__version__ import __version__ as autonomy_version
from aea.helpers.logging import setup_logger
from operate import constants
from operate.constants import HEALTH_CHECK_URL
from operate.services.health_checker import HealtChecker
from operate.services.manage import HTTP_OK


class AbstractDeploymentRunner(ABC):
    """Abstract deployment runner."""

    def __init__(self, work_directory: Path) -> None:
        """Init the deployment runner."""
        self._work_directory = work_directory
        self.logger = setup_logger(name="operate.deployment_runner")

    @abstractmethod
    def start(self) -> None:
        """Start the deployment."""

    @abstractmethod
    def stop(self) -> None:
        """Stop the deployment."""


def _kill_process(pid: int) -> None:
    """Kill process."""
    while True:
        if not psutil.pid_exists(pid=pid):
            return
        process = psutil.Process(pid=pid)
        if process.status() in (
            psutil.STATUS_DEAD,
            psutil.STATUS_ZOMBIE,
        ):
            return
        try:
            process.kill()
        except OSError:
            return
        except psutil.AccessDenied:
            return
        time.sleep(1)


def kill_process(pid: int) -> None:
    """Kill the process and all children first."""
    if not psutil.pid_exists(pid=pid):
        return
    current_process = psutil.Process(pid=pid)
    children = list(reversed(current_process.children(recursive=True)))
    for child in children:
        _kill_process(child.pid)
        _kill_process(child.pid)
    _kill_process(pid)
    _kill_process(pid)


class BaseDeploymentRunner(AbstractDeploymentRunner, metaclass=ABCMeta):
    """Base deployment with aea support."""

    TM_CONTROL_URL = constants.TM_CONTROL_URL
    SLEEP_BEFORE_TM_KILL = 2  # seconds

    def __init__(self, work_directory):
        super().__init__(work_directory)
        self._tm_process: t.Optional[subprocess.Popen] = None
        self._agent_process: t.Optional[subprocess.Popen] = None
        self._health_checker = HealtChecker(
            work_directory, self._restart_by_healthchecker
        )
        self._tm_file = None
        self._agent_file = None

    def _start_process(self, *args, **kwargs) -> subprocess.Popen:
        proc = subprocess.Popen(
            *args,
            **{
                **dict(
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.STDOUT,
                    creationflags=(
                        0x00000200 if platform.system() == "Windows" else 0
                    ),  # Detach process from the main process
                ),
                **kwargs,
            },
        )
        return proc

    def _run_aea(self, *args: str, cwd: Path) -> Any:
        """Run aea command."""
        return self._run_cmd(args=[self._aea_bin, *args], cwd=cwd)

    def _run_cmd(self, args: t.List[str], cwd: t.Optional[Path] = None) -> None:
        """Run command in a subprocess."""
        self.logger.info(
            f"Running: {' '.join(args)}  at Working dir: {cwd or os.getcwd()}"
        )
        result = subprocess.run(  # pylint: disable=subprocess-run-check # nosec
            args=args,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=240,
        )
        if result.returncode != 0:
            err_msg = f"Error running: {args} @ {cwd}, return code: {result.returncode } \n{result.stdout} \n {result.stderr}"
            self.logger.error(err_msg)
            raise RuntimeError(err_msg)

    def _prepare_agent_env(self) -> Any:
        """Prepare agent env, add keys, run aea commands."""
        working_dir = self._work_directory
        env = json.loads((working_dir / "agent.json").read_text(encoding="utf-8"))
        # Patch for trader agent
        if "SKILL_TRADER_ABCI_MODELS_PARAMS_ARGS_STORE_PATH" in env:
            data_dir = working_dir / "data"
            data_dir.mkdir(exist_ok=True)
            env["SKILL_TRADER_ABCI_MODELS_PARAMS_ARGS_STORE_PATH"] = str(data_dir)

        # TODO: Dynamic port allocation, backport to service builder
        env["CONNECTION_ABCI_CONFIG_HOST"] = "localhost"
        env["CONNECTION_ABCI_CONFIG_PORT"] = "26658"
        env["PYTHONUTF8"] = "1"
        for var in env:
            # Fix tendermint connection params
            if var.endswith("MODELS_PARAMS_ARGS_TENDERMINT_COM_URL"):
                env[var] = self.TM_CONTROL_URL

            if var.endswith("MODELS_PARAMS_ARGS_TENDERMINT_URL"):
                env[var] = "http://localhost:26657"

            if var.endswith("MODELS_PARAMS_ARGS_TENDERMINT_P2P_URL"):
                env[var] = "localhost:26656"

            if var.endswith("MODELS_BENCHMARK_TOOL_ARGS_LOG_DIR"):
                benchmarks_dir = working_dir / "benchmarks"
                benchmarks_dir.mkdir(exist_ok=True, parents=True)
                env[var] = str(benchmarks_dir.resolve())

        (working_dir / "agent.json").write_text(
            json.dumps(env, indent=4),
            encoding="utf-8",
        )
        return env

    def _setup_agent(self) -> None:
        """Setup agent."""
        self.logger.info("[DEPLOYMENT] Setting up the agent")
        working_dir = self._work_directory
        env = self._prepare_agent_env()

        self._run_aea(
            "init",
            "--reset",
            "--author",
            "valory",
            "--remote",
            "--ipfs",
            "--ipfs-node",
            "/dns/registry.autonolas.tech/tcp/443/https",
            cwd=working_dir,
        )

        self._run_aea("fetch", env["AEA_AGENT"], "--alias", "agent", cwd=working_dir)

        # Add keys
        shutil.copy(
            working_dir / "ethereum_private_key.txt",
            working_dir / "agent" / "ethereum_private_key.txt",
        )

        self._run_aea("add-key", "ethereum", cwd=working_dir / "agent")

        self._run_aea("issue-certificates", cwd=working_dir / "agent")

    def start(self) -> None:
        """Start the deployment."""
        try:
            self._setup_agent()
            self._start_tendermint()
            self._start_agent()
            self.logger.info("[DEPLOYMENT] Started")
            self._health_checker.start()
            self.logger.info("[DEPLOYMENT] healthchecker Started")
        except Exception as e:
            self.logger.exception("[DEPLOYMENT] start ERROR: {e}")
            raise

    def _restart_by_healthchecker(self):
        self._stop_agent()
        self._stop_tendermint()

        self._start_tendermint()
        self._start_agent()

    def stop(self) -> None:
        """Stop the deployment."""
        self._health_checker.stop()
        self._stop_agent()
        self._stop_tendermint()

    def _stop_process(self, proc: t.Optional[subprocess.Popen]):
        if not proc:
            return False

        if proc.poll() == None:
            kill_process(proc.pid)

        with suppress(Exception):
            proc.stdout.close()

        return True

    def _stop_agent(self) -> None:
        """Start process."""
        if self._stop_process(self._agent_process):
            return
        if self._agent_file:
            with suppress(Exception):
                self._agent_file.close()

        pid = self._work_directory / "agent.pid"
        if not pid.exists():
            return
        kill_process(int(pid.read_text(encoding="utf-8")))

    def _get_tm_exit_url(self) -> str:
        return f"{self.TM_CONTROL_URL}/exit"

    def _stop_tendermint(self) -> None:
        """Start tendermint process."""
        try:
            requests.get(self._get_tm_exit_url(), timeout=(1, 10))
            time.sleep(self.SLEEP_BEFORE_TM_KILL)
        except requests.ConnectionError:
            print(f"No Tendermint process listening on {self._get_tm_exit_url()}.")
        except Exception:  # pylint: disable=broad-except
            print_exc()

        if self._tm_file:
            with suppress(Exception):
                self._tm_file.close()
        if self._stop_process(self._tm_process):
            return

        pid = self._work_directory / "tendermint.pid"
        if not pid.exists():
            return
        kill_process(int(pid.read_text(encoding="utf-8")))

    @abstractmethod
    def _start_tendermint(self) -> None:
        """Start tendermint  process."""

    @abstractmethod
    def _start_agent(self) -> None:
        """Start aea process."""

    @property
    @abstractmethod
    def _aea_bin(self) -> str:
        """Return aea_bin path."""
        raise NotImplementedError


class PyInstallerHostDeploymentRunner(BaseDeploymentRunner):
    """Deployment runner within pyinstaller env."""

    @property
    def _aea_bin(self) -> str:
        """Return aea_bin path."""
        abin = str(Path(os.path.dirname(sys.executable)) / "aea_bin")  # type: ignore # pylint: disable=protected-access
        return abin

    @property
    def _tendermint_bin(self) -> str:
        """Return tendermint path."""
        return str(Path(os.path.dirname(sys.executable)) / "tendermint_bin")  # type: ignore # pylint: disable=protected-access

    def _make_log_file(self, name):
        file_path = Path(self._work_directory) / f"../{name}.extra.log"
        return open(file_path, "a+")

    def _start_agent(self) -> None:
        """Start agent process."""
        self.logger.info("[DEPLOYMENT] Starting up agent")
        working_dir = self._work_directory
        agent_working_dir = working_dir / "agent"
        env = json.loads((working_dir / "agent.json").read_text(encoding="utf-8"))
        env["PYTHONUTF8"] = "1"
        env["PYTHONIOENCODING"] = "utf8"
        env = {**os.environ, **env}
        self._agent_file = self._make_log_file("aea")
        process = self._start_process(  # pylint: disable=consider-using-with # nosec
            args=[self._aea_bin, "run"],
            cwd=agent_working_dir,
            env=env,
            stdout=self._agent_file,
        )
        (working_dir / "agent.pid").write_text(
            data=str(process.pid),
            encoding="utf-8",
        )
        self._agent_process = process
        if process.poll() is not None:
            raise RuntimeError(f"AEA crashed! {agent_working_dir}")

    def _start_tendermint(self) -> None:
        """Start tendermint process."""
        self.logger.info("[DEPLOYMENT] Starting up tendermint")
        working_dir = self._work_directory
        env = json.loads((working_dir / "tendermint.json").read_text(encoding="utf-8"))
        env["PYTHONUTF8"] = "1"
        env["PYTHONIOENCODING"] = "utf8"

        env = {
            **os.environ,
            **env,
        }

        if platform.system() == "Windows":
            # to look up for bundled in tendermint.exe
            env["PATH"] = os.path.dirname(sys.executable) + ";" + os.environ["PATH"]
        else:
            env["PATH"] = os.path.dirname(sys.executable) + ":" + os.environ["PATH"]

        tendermint_com = self._tendermint_bin  # type: ignore  # pylint: disable=protected-access
        self._tm_file = self._make_log_file("tm")
        process = self._start_process(
            args=[tendermint_com], cwd=working_dir, env=env, stdout=self._tm_file
        )
        self._tm_process = process

        (working_dir / "tendermint.pid").write_text(
            data=str(process.pid),
            encoding="utf-8",
        )
        if process.poll() is not None:
            raise RuntimeError("Tendermint crashed!")


class PyInstallerHostDeploymentRunnerMac(PyInstallerHostDeploymentRunner):
    """Mac deployment runner."""


class PyInstallerHostDeploymentRunnerWindows(PyInstallerHostDeploymentRunner):
    """Windows deployment runner."""

    @property
    def _aea_bin(self) -> str:
        """Return aea_bin path."""
        abin = str(Path(os.path.dirname(sys.executable)) / "aea_win.exe")  # type: ignore # pylint: disable=protected-access
        return abin

    @property
    def _tendermint_bin(self) -> str:
        """Return tendermint path."""
        return str(Path(os.path.dirname(sys.executable)) / "tendermint_win.exe")  # type: ignore # pylint: disable=protected-access


class HostPythonHostDeploymentRunner(BaseDeploymentRunner):
    """Deployment runner for host installed python."""

    @property
    def _aea_bin(self) -> str:
        """Return aea_bin path."""
        return str(self._venv_dir / "bin" / "aea")

    def _start_agent(self) -> None:
        """Start agent process."""
        working_dir = self._work_directory
        env = json.loads((working_dir / "agent.json").read_text(encoding="utf-8"))
        env["PYTHONUTF8"] = "1"
        env["PYTHONIOENCODING"] = "utf8"

        process = subprocess.Popen(  # pylint: disable=consider-using-with # nosec
            args=[self._aea_bin, "run"],
            cwd=str(working_dir / "agent"),
            env={**os.environ, **env},
            creationflags=(
                0x00000008 if platform.system() == "Windows" else 0
            ),  # Detach process from the main process
        )
        (working_dir / "agent.pid").write_text(
            data=str(process.pid),
            encoding="utf-8",
        )

    def _start_tendermint(self) -> None:
        """Start tendermint process."""
        working_dir = self._work_directory
        env = json.loads((working_dir / "tendermint.json").read_text(encoding="utf-8"))
        env["PYTHONUTF8"] = "1"
        env["PYTHONIOENCODING"] = "utf8"

        process = subprocess.Popen(  # pylint: disable=consider-using-with # nosec
            args=[
                str(self._venv_dir / "bin" / "flask"),
                "run",
                "--host",
                "localhost",
                "--port",
                "8080",
            ],
            cwd=working_dir,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            env={**os.environ, **env},
            creationflags=(
                0x00000008 if platform.system() == "Windows" else 0
            ),  # Detach process from the main process
        )
        (working_dir / "tendermint.pid").write_text(
            data=str(process.pid),
            encoding="utf-8",
        )

    @property
    def _venv_dir(self) -> Path:
        """Get venv dir for aea."""
        return self._work_directory / "venv"

    def _setup_venv(self) -> None:
        """Perform venv setup, install deps."""
        self._venv_dir.mkdir(exist_ok=True)
        venv_cli(args=[str(self._venv_dir)])
        pbin = str(self._venv_dir / "bin" / "python")
        # Install agent dependencies
        self._run_cmd(
            args=[
                pbin,
                "-m",
                "pip",
                "install",
                f"open-autonomy[all]=={autonomy_version}",
                f"open-aea-ledger-ethereum=={aea_version}",
                f"open-aea-ledger-ethereum-flashbots=={aea_version}",
                f"open-aea-ledger-cosmos=={aea_version}",
                # Install tendermint dependencies
                "flask",
                "requests",
            ],
        )

    def _setup_agent(self) -> None:
        """Prepare agent."""
        self._setup_venv()
        super()._setup_agent()
        # Install agent dependencies
        self._run_aea(
            "-v",
            "debug",
            "install",
            "--timeout",
            "600",
            cwd=self._work_directory / "agent",
        )


DEPLOYMENTS_RUNNING = {}


def _get_deployment_runner_class() -> t.Type[BaseDeploymentRunner]:
    deployment_runner_class: t.Type[BaseDeploymentRunner]

    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        # pyinstaller inside!
        if platform.system() == "Darwin":
            deployment_runner_class = PyInstallerHostDeploymentRunnerMac
        elif platform.system() == "Windows":
            deployment_runner_class = PyInstallerHostDeploymentRunnerWindows
        else:
            raise ValueError(f"Platform not supported {platform.system()}")
    else:
        deployment_runner_class = HostPythonHostDeploymentRunner
    return deployment_runner_class


def _get_host_deployment_runner(build_dir: Path) -> BaseDeploymentRunner:
    """Return depoyment runner according to running env."""
    if build_dir not in DEPLOYMENTS_RUNNING:
        deployment_runner_class = _get_deployment_runner_class()
        deployment_runner = deployment_runner_class(work_directory=build_dir)
        DEPLOYMENTS_RUNNING[build_dir] = deployment_runner
    return DEPLOYMENTS_RUNNING[build_dir]


def run_host_deployment(build_dir: Path) -> None:
    """Run host deployment."""
    deployment_runner = _get_host_deployment_runner(build_dir=build_dir)
    deployment_runner.start()


def stop_host_deployment(build_dir: Path) -> None:
    """Stop host deployment."""
    deployment_runner = _get_host_deployment_runner(build_dir=build_dir)
    deployment_runner.stop()
    if build_dir in DEPLOYMENTS_RUNNING:
        del DEPLOYMENTS_RUNNING[build_dir]
