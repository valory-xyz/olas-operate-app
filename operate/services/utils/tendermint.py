# -*- coding: utf-8 -*-
# ------------------------------------------------------------------------------
#
#   Copyright 2021-2023 Valory AG
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

"""Tendermint manager."""
import json
import logging
import os
import platform
import re
import shutil
import signal
import stat
import subprocess  # nosec:
import sys
import traceback
from logging import Logger
from pathlib import Path
from threading import Event, Thread
from typing import Any, Callable, Dict, List, Optional, Tuple, cast

import requests
from flask import Flask, Response, jsonify, request
from werkzeug.exceptions import InternalServerError, NotFound


ENCODING = "utf-8"
DEFAULT_LOG_FILE = "com.log"
DEFAULT_TENDERMINT_LOG_FILE = "tendermint.log"

CONFIG_OVERRIDE = [
    ("fast_sync = true", "fast_sync = false"),
    ("max_num_outbound_peers = 10", "max_num_outbound_peers = 0"),
    ("pex = true", "pex = false"),
]
TM_STATUS_ENDPOINT = "http://localhost:26657/status"

_TCP = "tcp://"
ENCODING = "utf-8"
DEFAULT_P2P_LISTEN_ADDRESS = f"{_TCP}0.0.0.0:26656"
DEFAULT_RPC_LISTEN_ADDRESS = f"{_TCP}0.0.0.0:26657"

IS_DEV_MODE = False

logging.basicConfig(
    filename=os.environ.get("LOG_FILE", DEFAULT_LOG_FILE),
    level=logging.DEBUG,
    format="%(asctime)s %(levelname)s %(name)s %(threadName)s : %(message)s",  # noqa : W1309
)


class StoppableThread(
    Thread,
):
    """Thread class with a stop() method."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        """Initialise the thread."""
        super().__init__(*args, **kwargs)
        self._stop_event = Event()

    def stop(self) -> None:
        """Set the stop event."""
        self._stop_event.set()

    def stopped(self) -> bool:
        """Check if the thread is stopped."""
        return self._stop_event.is_set()


class TendermintParams:  # pylint: disable=too-few-public-methods
    """Tendermint node parameters."""

    def __init__(  # pylint: disable=too-many-arguments
        self,
        proxy_app: str,
        rpc_laddr: str = DEFAULT_RPC_LISTEN_ADDRESS,
        p2p_laddr: str = DEFAULT_P2P_LISTEN_ADDRESS,
        p2p_seeds: Optional[List[str]] = None,
        consensus_create_empty_blocks: bool = True,
        home: Optional[str] = None,
        use_grpc: bool = False,
    ):
        """
        Initialize the parameters to the Tendermint node.

        :param proxy_app: ABCI address.
        :param rpc_laddr: RPC address.
        :param p2p_laddr: P2P address.
        :param p2p_seeds: P2P seeds.
        :param consensus_create_empty_blocks: if true, Tendermint node creates empty blocks.
        :param home: Tendermint's home directory.
        :param use_grpc: Whether to use a gRPC server, or TCP
        """

        self.proxy_app = proxy_app
        self.rpc_laddr = rpc_laddr
        self.p2p_laddr = p2p_laddr
        self.p2p_seeds = p2p_seeds
        self.consensus_create_empty_blocks = consensus_create_empty_blocks
        self.home = home
        self.use_grpc = use_grpc

    def __str__(self) -> str:
        """Get the string representation."""
        return (
            f"{self.__class__.__name__}("
            f"    proxy_app={self.proxy_app},\n"
            f"    rpc_laddr={self.rpc_laddr},\n"
            f"    p2p_laddr={self.p2p_laddr},\n"
            f"    p2p_seeds={self.p2p_seeds},\n"
            f"    consensus_create_empty_blocks={self.consensus_create_empty_blocks},\n"
            f"    home={self.home},\n"
            ")"
        )

    def build_node_command(self, debug: bool = False) -> List[str]:
        """Build the 'node' command."""
        p2p_seeds = ",".join(self.p2p_seeds) if self.p2p_seeds else ""
        cmd = [
            "tendermint",
            "node",
            f"--proxy_app={self.proxy_app}",
            f"--rpc.laddr={self.rpc_laddr}",
            f"--p2p.laddr={self.p2p_laddr}",
            f"--p2p.seeds={p2p_seeds}",
            f"--consensus.create_empty_blocks={str(self.consensus_create_empty_blocks).lower()}",
            f"--abci={'grpc' if self.use_grpc else 'socket'}",
        ]
        if debug:
            cmd.append("--log_level=debug")
        if self.home is not None:  # pragma: nocover
            cmd += ["--home", self.home]
        return cmd

    @staticmethod
    def get_node_command_kwargs() -> Dict:
        """Get the node command kwargs"""
        kwargs = {
            "bufsize": 1,
            "universal_newlines": True,
            "stdout": subprocess.PIPE,
            "stderr": subprocess.STDOUT,
        }
        if platform.system() == "Windows":  # pragma: nocover
            kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP  # type: ignore
        else:
            kwargs["preexec_fn"] = os.setsid  # type: ignore
        return kwargs


class TendermintNode:
    """A class to manage a Tendermint node."""

    def __init__(
        self,
        params: TendermintParams,
        logger: Optional[Logger] = None,
        write_to_log: bool = False,
    ):
        """
        Initialize a Tendermint node.

        :param params: the parameters.
        :param logger: the logger.
        :param write_to_log: Write to log file.
        """
        self.params = params
        self._process: Optional[subprocess.Popen] = None
        self._monitoring: Optional[StoppableThread] = None
        self._stopping = False
        self.logger = logger or logging.getLogger()
        self.log_file = os.environ.get("LOG_FILE", DEFAULT_TENDERMINT_LOG_FILE)
        self.write_to_log = write_to_log

    def _build_init_command(self) -> List[str]:
        """Build the 'init' command."""
        cmd = [
            "tendermint",
            "init",
        ]
        if self.params.home is not None:  # pragma: nocover
            cmd += ["--home", self.params.home]
        return cmd

    def init(self) -> None:
        """Initialize Tendermint node."""
        cmd = self._build_init_command()
        subprocess.call(cmd)  # nosec

    def _monitor_tendermint_process(
        self,
    ) -> None:
        """Check server status."""
        if self._monitoring is None:
            raise ValueError("Monitoring is not running")
        self.log("Monitoring thread started\n")
        while not self._monitoring.stopped():
            try:
                if self._process is not None and self._process.stdout is not None:
                    line = self._process.stdout.readline()
                    self.log(line)
                    for trigger in [
                        # this occurs when we lose connection from the tm side
                        "RPC HTTP server stopped",
                        # whenever the node is stopped because of a closed connection
                        # from on any of the tendermint modules (abci, p2p, rpc, etc)
                        # we restart the node
                        "Stopping abci.socketClient for error: read message: EOF",
                    ]:
                        if self._monitoring.stopped():
                            break
                        if line.find(trigger) >= 0:
                            self._stop_tm_process()
                            # we can only reach this step if monitoring was activated
                            # so we make sure that after reset the monitoring continues
                            self._start_tm_process()
                            self.log(
                                f"Restarted the HTTP RPC server, as a connection was dropped with message:\n\t\t {line}\n"
                            )
            except Exception as e:  # pylint: disable=broad-except
                self.log(f"Error!: {str(e)}")
        self.log("Monitoring thread terminated\n")

    def _start_tm_process(self, debug: bool = False) -> None:
        """Start a Tendermint node process."""
        if self._process is not None or self._stopping:  # pragma: nocover
            return
        cmd = self.params.build_node_command(debug)
        kwargs = self.params.get_node_command_kwargs()
        self.log(f"Starting Tendermint: {cmd}\n")
        self._process = (
            subprocess.Popen(  # nosec # pylint: disable=consider-using-with,W1509
                cmd, **kwargs
            )
        )
        self.log("Tendermint process started\n")

    def _start_monitoring_thread(self) -> None:
        """Start a monitoring thread."""
        self._monitoring = StoppableThread(target=self._monitor_tendermint_process)
        self._monitoring.start()

    def start(self, debug: bool = False) -> None:
        """Start a Tendermint node process."""
        self._start_tm_process(debug)
        self._start_monitoring_thread()

    def _stop_tm_process(self) -> None:
        """Stop a Tendermint node process."""
        if self._process is None or self._stopping:
            return

        self._stopping = True
        if platform.system() == "Windows":
            self._win_stop_tm()
        else:
            # this will raise an exception if the process
            # is not terminated within the specified timeout
            self._unix_stop_tm()

        self._stopping = False
        self._process = None
        self.log("Tendermint process stopped\n")

    def _win_stop_tm(self) -> None:
        """Stop a Tendermint node process on Windows."""
        os.kill(self._process.pid, signal.CTRL_C_EVENT)  # type: ignore  # pylint: disable=no-member
        try:
            self._process.wait(timeout=5)  # type: ignore
        except subprocess.TimeoutExpired:  # nosec
            os.kill(self._process.pid, signal.CTRL_BREAK_EVENT)  # type: ignore  # pylint: disable=no-member

    def _unix_stop_tm(self) -> None:
        """Stop a Tendermint node process on Unix."""
        self._process.send_signal(signal.SIGTERM)  # type: ignore
        try:
            self._process.wait(timeout=5)  # type: ignore
        except subprocess.TimeoutExpired:  # nosec
            self.log("Tendermint process did not stop gracefully\n")

        # if the process is still running poll will return None
        poll = self._process.poll()  # type: ignore
        if poll is not None:
            return

        self._process.terminate()  # type: ignore
        self._process.wait(3)  # type: ignore

    def _stop_monitoring_thread(self) -> None:
        """Stop a monitoring process."""
        if self._monitoring is not None:
            self._monitoring.stop()  # set stop event
            self._monitoring.join()

    def stop(self) -> None:
        """Stop a Tendermint node process."""
        self._stop_tm_process()
        self._stop_monitoring_thread()

    @staticmethod
    def _write_to_console(line: str) -> None:
        """Write line to console."""
        sys.stdout.write(str(line))
        sys.stdout.flush()

    def _write_to_file(self, line: str) -> None:
        """Write line to console."""
        with open(self.log_file, "a", encoding=ENCODING) as file:
            file.write(line)

    def log(self, line: str) -> None:
        """Open and write a line to the log file."""
        self._write_to_console(line=line)
        if self.write_to_log:
            self._write_to_file(line=line)

    def prune_blocks(self) -> int:
        """Prune blocks from the Tendermint state"""
        return subprocess.call(  # nosec:
            [
                "tendermint",
                "--home",
                str(self.params.home),
                "unsafe-reset-all",
            ]
        )

    def reset_genesis_file(
        self,
        genesis_time: str,
        initial_height: str,
        period_count: str,
    ) -> None:
        """Reset genesis file."""

        genesis_file = Path(str(self.params.home), "config", "genesis.json")
        genesis_config = json.loads(genesis_file.read_text(encoding=ENCODING))
        genesis_config["genesis_time"] = genesis_time
        genesis_config["initial_height"] = initial_height
        genesis_config["chain_id"] = f"autonolas-{period_count}"
        genesis_file.write_text(json.dumps(genesis_config, indent=2), encoding=ENCODING)


def load_genesis() -> Any:
    """Load genesis file."""
    return json.loads(
        Path(os.environ["TMHOME"], "config", "genesis.json").read_text(
            encoding=ENCODING
        )
    )


def get_defaults() -> Dict[str, str]:
    """Get defaults from genesis file."""
    genesis = load_genesis()
    return dict(genesis_time=genesis.get("genesis_time"))


def override_config_toml() -> None:
    """Update sync method."""

    config_path = str(Path(os.environ["TMHOME"]) / "config" / "config.toml")
    logging.info(config_path)
    with open(config_path, "r", encoding=ENCODING) as fp:
        config = fp.read()

    for old, new in CONFIG_OVERRIDE:
        config = config.replace(old, new)

    with open(config_path, "w+", encoding=ENCODING) as fp:
        fp.write(config)


def update_peers(validators: List[Dict], config_path: Path) -> None:
    """Fix peers."""

    config_text = config_path.read_text(encoding="utf-8")

    new_peer_string = 'persistent_peers = "'
    for peer in validators:
        hostname = peer["hostname"]
        if hostname in ("localhost", "0.0.0.0"):  # nosec
            # This (tendermint) node will be running in a docker container and no other node
            # will be running in the same container. If we receive either localhost or 0.0.0.0,
            # we make an assumption that the address belongs to a node running on the
            # same machine with a different docker container and different p2p port so,
            # we replace the hostname with the docker's internal host url.
            hostname = "localhost"
        new_peer_string += (
            peer["peer_id"] + "@" + hostname + ":" + str(peer["p2p_port"]) + ","
        )
    new_peer_string = new_peer_string[:-1] + '"\n'

    updated_config = re.sub('persistent_peers = ".*\n', new_peer_string, config_text)
    config_path.write_text(updated_config, encoding="utf-8")


def update_external_address(external_address: str, config_path: Path) -> None:
    """Update the external address."""
    config_text = config_path.read_text(encoding="utf-8")
    new_external_address = f'external_address = "{external_address}"\n'
    updated_config = re.sub(
        'external_address = ".*\n', new_external_address, config_text
    )
    config_path.write_text(updated_config, encoding="utf-8")


def update_genesis_config(data: Dict) -> None:
    """Update genesis.json file for the tendermint node."""

    genesis_file = Path(os.environ["TMHOME"]) / "config" / "genesis.json"
    genesis_data = {}
    genesis_data["genesis_time"] = data["genesis_config"]["genesis_time"]
    genesis_data["chain_id"] = data["genesis_config"]["chain_id"]
    genesis_data["initial_height"] = "0"
    genesis_data["consensus_params"] = data["genesis_config"]["consensus_params"]
    genesis_data["validators"] = [
        {
            "address": validator["address"],
            "pub_key": validator["pub_key"],
            "power": validator["power"],
            "name": validator["name"],
        }
        for validator in data["validators"]
    ]
    genesis_data["app_hash"] = ""
    genesis_file.write_text(json.dumps(genesis_data, indent=2), encoding=ENCODING)


class PeriodDumper:
    """Dumper for tendermint data."""

    resets: int
    dump_dir: Path
    logger: logging.Logger

    def __init__(self, logger: logging.Logger, dump_dir: Optional[Path] = None) -> None:
        """Initialize object."""

        self.resets = 0
        self.logger = logger
        self.dump_dir = Path(dump_dir or "/tm_state")

        if self.dump_dir.is_dir():
            shutil.rmtree(str(self.dump_dir), onerror=self.readonly_handler)
        self.dump_dir.mkdir(exist_ok=True)

    @staticmethod
    def readonly_handler(
        func: Callable, path: str, execinfo: Any  # pylint: disable=unused-argument
    ) -> None:
        """If permission is readonly, we change and retry."""
        try:
            os.chmod(path, stat.S_IWRITE)
            func(path)
        except (FileNotFoundError, OSError):
            return

    def dump_period(self) -> None:
        """Dump tendermint run data for replay"""
        store_dir = self.dump_dir / f"period_{self.resets}"
        store_dir.mkdir(exist_ok=True)
        try:
            shutil.copytree(
                os.environ["TMHOME"], str(store_dir / ("node" + os.environ["ID"]))
            )
            self.logger.info(f"Dumped data for period {self.resets}")
        except OSError as e:
            self.logger.info(
                f"Error occurred while dumping data for period {self.resets}: {e}"
            )
        self.resets += 1


def create_app(  # pylint: disable=too-many-statements
    debug: bool = False,
) -> Tuple[Flask, TendermintNode]:
    """Create the Tendermint server app"""
    write_to_log = os.environ.get("WRITE_TO_LOG", "false").lower() == "true"
    tendermint_params = TendermintParams(
        proxy_app=os.environ["PROXY_APP"],
        p2p_laddr=os.environ["P2P_LADDR"],
        rpc_laddr=os.environ["RPC_LADDR"],
        consensus_create_empty_blocks=os.environ["CREATE_EMPTY_BLOCKS"] == "true",
        home=os.environ["TMHOME"],
        use_grpc=os.environ["USE_GRPC"] == "true",
    )

    app = Flask(__name__)  # pylint: disable=redefined-outer-name
    period_dumper = PeriodDumper(
        logger=app.logger,
        dump_dir=Path(os.environ["TMSTATE"]),
    )
    tendermint_node = TendermintNode(
        tendermint_params,
        logger=app.logger,
        write_to_log=write_to_log,
    )
    tendermint_node.init()
    override_config_toml()
    tendermint_node.start(debug=debug)

    @app.get("/params")
    def get_params() -> Dict:
        """Get tendermint params."""
        try:
            priv_key_file = (
                Path(os.environ["TMHOME"]) / "config" / "priv_validator_key.json"
            )
            priv_key_data = json.loads(priv_key_file.read_text(encoding=ENCODING))
            del priv_key_data["priv_key"]
            status = requests.get(TM_STATUS_ENDPOINT).json()
            priv_key_data["peer_id"] = status["result"]["node_info"]["id"]
            return {
                "params": priv_key_data,
                "status": True,
                "error": None,
            }
        except (FileNotFoundError, json.JSONDecodeError):
            return {"params": {}, "status": False, "error": traceback.format_exc()}

    @app.post("/params")
    def update_params() -> Dict:
        """Update validator params."""

        try:
            data: Dict = json.loads(request.get_data().decode(ENCODING))
            cast(logging.Logger, app.logger).debug(  # pylint: disable=no-member
                f"Data update requested with data={data}"
            )

            cast(logging.Logger, app.logger).info(  # pylint: disable=no-member
                "Updating genesis config."
            )
            update_genesis_config(data=data)

            cast(logging.Logger, app.logger).info(  # pylint: disable=no-member
                "Updating peristent peers."
            )
            config_path = Path(os.environ["TMHOME"]) / "config" / "config.toml"
            update_peers(
                validators=data["validators"],
                config_path=config_path,
            )
            update_external_address(
                external_address=data["external_address"],
                config_path=config_path,
            )

            return {"status": True, "error": None}
        except (FileNotFoundError, json.JSONDecodeError, PermissionError):
            return {"status": False, "error": traceback.format_exc()}

    @app.route("/gentle_reset")
    def gentle_reset() -> Tuple[Any, int]:
        """Reset the tendermint node gently."""
        try:
            tendermint_node.stop()
            tendermint_node.start()
            return jsonify({"message": "Reset successful.", "status": True}), 200
        except Exception as e:  # pylint: disable=W0703
            return jsonify({"message": f"Reset failed: {e}", "status": False}), 200

    @app.route("/app_hash")
    def app_hash() -> Tuple[Any, int]:
        """Get the app hash."""
        try:
            non_routable, loopback = "0.0.0.0", "127.0.0.1"  # nosec
            endpoint = f"{tendermint_params.rpc_laddr.replace('tcp', 'http').replace(non_routable, loopback)}/block"
            height = request.args.get("height")
            params = {"height": height} if height is not None else None
            res = requests.get(endpoint, params)
            app_hash_ = res.json()["result"]["block"]["header"]["app_hash"]
            return jsonify({"app_hash": app_hash_}), res.status_code
        except Exception as e:  # pylint: disable=W0703
            return (
                jsonify({"error": f"Could not get the app hash: {str(e)}"}),
                200,
            )

    @app.route("/hard_reset")
    def hard_reset() -> Tuple[Any, int]:
        """Reset the node forcefully, and prune the blocks"""
        try:
            tendermint_node.stop()
            if IS_DEV_MODE:
                period_dumper.dump_period()

            return_code = tendermint_node.prune_blocks()
            if return_code:
                tendermint_node.start()
                raise RuntimeError("Could not perform `unsafe-reset-all` successfully!")
            defaults = get_defaults()
            tendermint_node.reset_genesis_file(
                request.args.get("genesis_time", defaults["genesis_time"]),
                # default should be 1: https://github.com/tendermint/tendermint/pull/5191/files
                request.args.get("initial_height", "1"),
                request.args.get("period_count", "0"),
            )
            tendermint_node.start()
            return jsonify({"message": "Reset successful.", "status": True}), 200
        except Exception as e:  # pylint: disable=W0703
            return jsonify({"message": f"Reset failed: {e}", "status": False}), 200

    @app.errorhandler(404)  # type: ignore
    def handle_notfound(e: NotFound) -> Response:
        """Handle server error."""
        cast(logging.Logger, app.logger).info(e)  # pylint: disable=E
        return Response("Not Found", status=404, mimetype="application/json")

    @app.errorhandler(500)  # type: ignore
    def handle_server_error(e: InternalServerError) -> Response:
        """Handle server error."""
        cast(logging.Logger, app.logger).info(e)  # pylint: disable=E
        return Response("Error Closing Node", status=500, mimetype="application/json")

    return app, tendermint_node


def create_server() -> Any:
    """Function to retrieve just the app to be used by flask entry point."""
    flask_app, _ = create_app()
    return flask_app


if __name__ == "__main__":
    # Start the Flask server programmatically
    app = create_server()
    app.run(host="localhost", port=8080)
