from pathlib import Path
import json
from tempfile import NamedTemporaryFile, TemporaryFile
from time import sleep
import typing as t
from unittest.mock import patch
import autonomy
from aea_ledger_ethereum import EthereumCrypto
from operate.ledger import get_default_rpc
import operate.ledger
from operate.ledger.profiles import CONTRACTS, OLAS, USDC, STAKING
from operate.operate_types import Chain, ContractAddresses, LedgerType
from aea.crypto.registries import make_ledger_api
import operate
from autonomy.chain.config import ChainType as ChainProfile
import json
import subprocess
import sys
import time
from typing import Dict
import psutil
import pytest
from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi.testclient import TestClient
from operate.cli import create_app
import operate.operate_types
from operate.services.deployment_runner import kill_process


class OwnTestClient(TestClient):
    def __init__(
        self,
        app,
        home_dir,
        base_url="http://testserver",
        raise_server_exceptions=True,
        root_path="",
        backend="asyncio",
        backend_options=None,
        cookies=None,
        headers=None,
        follow_redirects=True,
    ):
        self._test_app = app
        self._home_dir = home_dir
        super().__init__(
            app,
            base_url,
            raise_server_exceptions,
            root_path,
            backend,
            backend_options,
            cookies,
            headers,
            follow_redirects,
        )


@pytest.fixture
def test_client():
    with TemporaryDirectory() as tmp_dir:
        home_dir = Path(tmp_dir)
        app = create_app(home=home_dir)
        client = OwnTestClient(app=app, home_dir=home_dir)
        yield client


AUTONOLAS_REGISITRIES_DIR = Path(__file__).parent.parent / "autonolas-registries"
WAIT_NODE_STARTED_TIMEOUT = 10


@pytest.fixture
def hardhat_node():
    work_dir = AUTONOLAS_REGISITRIES_DIR
    subprocess.run(["yarn", "install"], shell=True, cwd=work_dir)
    subprocess.run(["yarn", "hardhat", "compile"], shell=True, cwd=work_dir)
    init_json_file = work_dir / "initDeploy.json"
    """
    init_json_file.unlink(missing_ok=True)
    p = subprocess.Popen(
        "yarn hardhat node",
        shell=True,
        cwd=work_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    """
    try:
        start_time = time.time()
        while (start_time + WAIT_NODE_STARTED_TIMEOUT) > time.time():
            if init_json_file.exists():
                break
            time.sleep(1)
        else:
            raise RuntimeError("Failed to start hardhat node within timeout!")

        data = json.loads(init_json_file.read_text())
        data["rpc_url"] = "http://127.0.0.1:8545"
        yield data
    finally:
        """kill_process(p.pid)"""


@pytest.fixture
def local_node(hardhat_node):
    local_rpc = "http://localhost:8545"
    operate.ledger.GNOSIS_RPC = local_rpc
    CONTRACTS[Chain.GNOSIS] = ContractAddresses(
        {
            "service_manager": hardhat_node["serviceManager"],
            "service_registry": hardhat_node["serviceRegistry"],
            "service_registry_token_utility": hardhat_node[
                "serviceRegistryTokenUtility"
            ],
            "gnosis_safe_proxy_factory": hardhat_node["gnosisSafeProxyFactory"],
            "gnosis_safe_same_address_multisig": hardhat_node["gnosismultisig"],
            "multisend": hardhat_node["multiSend"],
        }
    )
    OLAS[Chain.GNOSIS] = hardhat_node["ERC20Token"]

    from autonomy.chain.base import registry_contracts

    registry_contracts.gnosis_safe

    import packages.valory.contracts.gnosis_safe.contract as safe_contract_module

    safe_contract_module.NULL_ADDRESS = "0x" + "0" * 40
    safe_contract_module.SAFE_CONTRACT = hardhat_node["gnosisSafe"]
    safe_contract_module.DEFAULT_CALLBACK_HANDLER = hardhat_node["operator"]["address"]
    safe_contract_module.PROXY_FACTORY_CONTRACT = hardhat_node["gnosisSafeProxyFactory"]
    with NamedTemporaryFile() as tmp_file:
        tmp_file.write(hardhat_node["operator"]["privateKey"].encode("utf-8"))
        tmp_file.flush()
        operator_crypto = EthereumCrypto(tmp_file.name)

    autonomy.chain.constants.CHAIN_NAME_TO_CHAIN_ID["gnosis"] = (
        autonomy.chain.constants.CHAIN_NAME_TO_CHAIN_ID["local"]
    )
    operate.ledger.GNOSIS_RPC = local_rpc
    operate.ledger.DEFAULT_RPCS[Chain.GNOSIS] = local_rpc
    operate.operate_types._CHAIN_ID_TO_CHAIN_NAME[31337] = Chain.GNOSIS
    STAKING[Chain.GNOSIS]["pearl_beta"] = hardhat_node["stakingAddress"]
    with patch("operate.ledger.get_default_rpc", return_value=local_rpc):
        yield operator_crypto
