from pathlib import Path
import json
from tempfile import NamedTemporaryFile, TemporaryFile
from time import sleep
import typing as t
from unittest.mock import patch

from aea_ledger_ethereum import EthereumCrypto
from operate.ledger import get_default_rpc
from operate.ledger.profiles import CONTRACTS, OLAS, USDC
from operate.operate_types import Chain, ContractAddresses, LedgerType
from aea.crypto.registries import make_ledger_api

from autonomy.chain.config import ChainType as ChainProfile

from tests.utils import WEI_MULTIPLIER, send, send_olas


def test_acc_top_up(test_client, local_node):
    operator_crypto = local_node
    pwd = "some_pwd"
    chain_name = "gnosis"
    response = test_client.post("/api/account", json={"password": pwd})
    assert response.status_code == 200, response

    response = test_client.post("api/account/login", json={"password": pwd})
    assert response.status_code == 200, response
    assert response.json() == {"message": "Login successful"}

    response = test_client.post("api/wallet", json={"ledger_type": "ethereum"})
    assert response.status_code == 200, response
    address = response.json()["wallet"]["address"]

    response = test_client.get(f"/api/wallet/balance/{chain_name}/{address}")
    assert response.status_code == 200, response
    assert response.json()["balance"] == 0

    chain = Chain(chain_name)
    # sleep(100)
    topup_amount = int(100 * WEI_MULTIPLIER)
    send(chain, operator_crypto, to=address, amount=topup_amount)

    response = test_client.get(f"/api/wallet/balance/{chain_name}/{address}")
    assert response.status_code == 200, response
    assert response.json()["balance"] == topup_amount

    response = test_client.post("/api/wallet/safe", json={"chain": chain_name})
    assert response.status_code == 200, response
    assert response.json()["message"] == "Safe created!"
    safe_address = response.json()["safe"]

    response = test_client.get(f"/api/wallet/balance/{chain_name}/{safe_address}")
    assert response.status_code == 200, response
    assert response.json()["balance"] > 0

    response = test_client.get(f"/api/wallet/balance/{chain_name}/{address}/olas")
    assert response.status_code == 200, response
    assert response.json()["balance"] == 0
    topup_amount = 100
    send_olas(chain, operator_crypto, to=address, amount=topup_amount)

    response = test_client.get(f"/api/wallet/balance/{chain_name}/{address}/olas")
    assert response.status_code == 200, response
    assert response.json()["balance"] == topup_amount

    response = test_client.get(f"/api/wallet/balance/{chain_name}/{safe_address}/olas")
    assert response.status_code == 200, response
    assert response.json()["balance"] == 0

    send_olas(chain, operator_crypto, to=safe_address, amount=topup_amount)
    response = test_client.get(f"/api/wallet/balance/{chain_name}/{safe_address}/olas")
    assert response.status_code == 200, response
    assert response.json()["balance"] == topup_amount

    template = {
        "agentType": "trader",
        "name": "Trader Agent",
        "hash": "bafybeicts6zhavxzz2rxahz3wzs2pzamoq64n64wp4q4cdanfuz7id6c2q",
        "description": "Trader agent for omen prediction markets",
        "image": "https://operate.olas.network/_next/image?url=%2Fimages%2Fprediction-agent.png&w=3840&q=75",
        "service_version": "v0.18.4",
        "home_chain": "gnosis",
        "configurations": {
            "gnosis": {
                "staking_program_id": "pearl_beta",
                "nft": "bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq",
                "rpc": "http://localhost:8545",
                "agent_id": 14,
                "threshold": 1,
                "use_staking": True,
                "use_mech_marketplace": False,
                "cost_of_bond": 10000000000000000,
                "monthly_gas_estimate": 10000000000000000000,
                "fund_requirements": {
                    "agent": 100000000000000000,
                    "safe": 5000000000000000000,
                },
            }
        },
        "env_variables": {
            "GNOSIS_LEDGER_RPC": {
                "name": "Gnosis ledger RPC",
                "description": "",
                "value": "",
                "provision_type": "computed",
            },
            "STAKING_CONTRACT_ADDRESS": {
                "name": "Staking contract address",
                "description": "",
                "value": "",
                "provision_type": "computed",
            },
            "MECH_ACTIVITY_CHECKER_CONTRACT": {
                "name": "Mech activity checker contract",
                "description": "",
                "value": "",
                "provision_type": "computed",
            },
            "MECH_CONTRACT_ADDRESS": {
                "name": "Mech contract address",
                "description": "",
                "value": "",
                "provision_type": "computed",
            },
            "MECH_REQUEST_PRICE": {
                "name": "Mech request price",
                "description": "",
                "value": "",
                "provision_type": "computed",
            },
            "USE_MECH_MARKETPLACE": {
                "name": "Use Mech marketplace",
                "description": "",
                "value": "",
                "provision_type": "computed",
            },
            "REQUESTER_STAKING_INSTANCE_ADDRESS": {
                "name": "Requester staking instance address",
                "description": "",
                "value": "",
                "provision_type": "computed",
            },
            "PRIORITY_MECH_ADDRESS": {
                "name": "Priority Mech address",
                "description": "",
                "value": "",
                "provision_type": "computed",
            },
        },
    }

    response = test_client.post(f"/api/v2/service", json=template)
    assert response.status_code == 200, response
    service_response = response.json()
    
    print(11111111111111111222222222222222222222, flush=True)
    with patch("operate.services.manage.ServiceManager.deploy_service_locally"):
        response = test_client.post(f"/api/v2/service/{service_response['service_config_id']}", json=template)
    assert response.status_code == 200, response