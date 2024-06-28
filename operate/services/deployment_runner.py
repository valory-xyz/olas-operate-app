import json
import os
import platform
import shutil
import signal
import subprocess
import sys
import time
import typing as t
from abc import ABC, ABCMeta, abstractmethod
from pathlib import Path
from venv import main as venv_cli

import psutil
from aea.__version__ import __version__ as aea_version
from autonomy.__version__ import __version__ as autonomy_version


class AbstractDeploymentRunner(ABC):
    def __init__(self, work_directory: Path):
        self._work_directory = work_directory

    @abstractmethod
    def start(self):
        pass

    @abstractmethod
    def stop(self):
        pass


def _kill_process(pid: int) -> None:
    """Kill process."""
    print(f"Trying to kill process: {pid}")
    while True:
        if not psutil.pid_exists(pid=pid):
            return
        if psutil.Process(pid=pid).status() in (
            psutil.STATUS_DEAD,
            psutil.STATUS_ZOMBIE,
        ):
            return
        try:
            os.kill(
                pid,
                (
                    signal.CTRL_C_EVENT  # type: ignore
                    if platform.platform() == "Windows"
                    else signal.SIGKILL
                ),
            )
        except OSError:
            return
        time.sleep(1)


class BaseDeploymentRunner(AbstractDeploymentRunner, metaclass=ABCMeta):
    def _run_aea(self, *args: t.List[str], cwd: Path):
        return self._run_cmd(args=[self._aea_bin, *args], cwd=cwd)

    @staticmethod
    def _run_cmd(args: t.List[str], cwd: t.Optional[Path] = None) -> None:
        """Run command in a subprocess."""
        print(f"Running: {' '.join(args)}")
        # print working dir
        print(f"Working dir: {os.getcwd()}")
        result = subprocess.run(  # pylint: disable=subprocess-run-check # nosec
            args=args,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        if result.returncode != 0:
            raise RuntimeError(
                f"Error running: {args} @ {cwd}\n{result.stderr.decode()}"
            )

    def _prepare_agent_env(self):
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

        for var in env:
            # Fix tendermint connection params
            if var.endswith("MODELS_PARAMS_ARGS_TENDERMINT_COM_URL"):
                env[var] = "http://localhost:8080"

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
        print(1111111, "SETUP AGENT", flush=True)
        working_dir = self._work_directory
        env = self._prepare_agent_env()

        # abin = self._aea_bin
        # Fetch agent
        # self._run_cmd(
        #    args=[
        #        abin,
        #        "init",
        #        "--reset",
        #        "--author",
        #        "valory",
        #        "--remote",
        #        "--ipfs",
        #        "--ipfs-node",
        #        "/dns/registry.autonolas.tech/tcp/443/https",
        #    ],
        #    cwd=working_dir,
        # )
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

        # self._run_cmd(
        #    args=[
        #        abin,
        #        "fetch",
        #        env["AEA_AGENT"],
        #        "--alias",
        #        "agent",
        #    ],
        #    cwd=working_dir,
        # )
        self._run_aea("fetch", env["AEA_AGENT"], "--alias", "agent", cwd=working_dir)

        # Add keys
        shutil.copy(
            working_dir / "ethereum_private_key.txt",
            working_dir / "agent" / "ethereum_private_key.txt",
        )

        # self._run_cmd(
        #    args=[abin, "add-key", "ethereum"],
        #    cwd=working_dir / "agent",
        # )
        self._run_aea("add-key", "ethereum", cwd=working_dir / "agent")

        # self._run_cmd(
        #    args=[abin, "issue-certificates"],
        #    cwd=working_dir / "agent",
        # )
        self._run_aea("issue-certificates", cwd=working_dir / "agent")
        print(1111111, "SETUP AGENT complete", flush=True)

    def start(self):
        print(1111111111111111, "START _DEPLOYMENT", flush=True)
        self._setup_agent()
        self._start_tendermint()
        self._start_agent()
        print(1111111111111111, "START _DEPLOYMENT complete", flush=True)

    def stop(self):
        print(1111111111111111, "STOP _DEPLOYMENT", flush=True)
        self._stop_agent()
        self._stop_tendermint()
        print(1111111111111111, "STOP _DEPLOYMENT complete", flush=True)

    def _stop_agent(self) -> None:
        """Start process."""
        pid = self._work_directory / "agent.pid"
        if not pid.exists():
            return
        _kill_process(int(pid.read_text(encoding="utf-8")))

    def _stop_tendermint(self) -> None:
        """Start tendermint process."""
        pid = self._work_directory / "tendermint.pid"
        if not pid.exists():
            return
        _kill_process(int(pid.read_text(encoding="utf-8")))

    @abstractmethod
    def _start_tendermint(self):
        pass

    @abstractmethod
    def _start_agent(self):
        pass

    @property
    @abstractmethod
    def _aea_bin(self):
        pass


class PyInstallerHostDeploymentRunner(BaseDeploymentRunner):
    @property
    def _aea_bin(self) -> str:
        abin = str(Path(sys._MEIPASS) / "aea_bin")  # type: ignore # pylint: disable=protected-access
        return abin

    @property
    def _tendermint_bin(self) -> str:
        return str(Path(sys._MEIPASS) / "tendermint")

    def _start_agent(self) -> None:
        """Start agent process."""
        working_dir = self._work_directory
        env = json.loads((working_dir / "agent.json").read_text(encoding="utf-8"))
        process = subprocess.Popen(  # pylint: disable=consider-using-with # nosec
            args=[self._aea_bin, "run"],
            cwd=working_dir / "agent",
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
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
        tendermint_com = self._tendermint_bin  # type: ignore  # pylint: disable=protected-access
        process = subprocess.Popen(  # pylint: disable=consider-using-with # nosec
            args=[tendermint_com],
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


class HostPythonHostDeploymentRunner(BaseDeploymentRunner):
    @property
    def _aea_bin(self) -> str:
        return str(self._venv_dir / "bin" / "aea")

    def _start_agent(self) -> None:
        """Start agent process."""
        working_dir = self._work_directory
        env = json.loads((working_dir / "agent.json").read_text(encoding="utf-8"))
        print(1111, "START AGENT", working_dir / "agent", (working_dir / "agent").exists(), flush=True)
        print(1111, "START AGENT", working_dir / "agent", (working_dir / "agent").exists(), flush=True)
        process = subprocess.Popen(  # pylint: disable=consider-using-with # nosec
            args=[self._aea_bin, "run"],
            cwd=str(working_dir / "agent"),
            #stdout=subprocess.STDOUT,
            #stderr=subprocess.STDOUT,
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
    def _venv_dir(self):
        return self._work_directory / "venv"

    def _setup_venv(self):
        print("SETUP VENV", flush=True)
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
        print("SETUP VENV COMPLETE", flush=True)

    def _setup_agent(self) -> None:
        self._setup_venv()
        super()._setup_agent()
        # Install agent dependencies
        self._run_aea("-v", "debug", "install", "--timeout", "600",
            cwd=self._work_directory / "agent",
        )


def _get_host_deployment_runner(build_dir: Path) -> BaseDeploymentRunner:
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        deployment_runner = PyInstallerHostDeploymentRunner(build_dir)
    else:
        deployment_runner = HostPythonHostDeploymentRunner(build_dir)
    return deployment_runner


def run_host_deployment(build_dir: Path) -> None:
    """Run host deployment."""
    deployment_runner = _get_host_deployment_runner(build_dir=build_dir)
    deployment_runner.start()


def stop_host_deployment(build_dir: Path) -> None:
    """Stop host deployment."""
    deployment_runner = _get_host_deployment_runner(build_dir=build_dir)
    deployment_runner.stop()
