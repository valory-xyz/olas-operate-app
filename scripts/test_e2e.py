#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ------------------------------------------------------------------------------
#
#   Copyright 2021-2024 Valory AG
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
"""This module contains e2e tests."""

from pathlib import Path

import requests
from aea.helpers.yaml_utils import yaml_load
from aea_ledger_ethereum.ethereum import EthereumApi, EthereumCrypto


BASE_URL = "https://localhost:8000/api"


def test_endpoint_e2e() -> None:
    """Test endpoint end to end"""
    with Path("templates/trader.yaml").open("r", encoding="utf-8") as stream:
        trader_template = yaml_load(stream=stream)
        phash = trader_template["hash"]

    print("Creating service using template")

    response = requests.post(
        url=f"{BASE_URL}/services",
        json={**trader_template, "deploy": True},
    ).json()
    print(response)

    input("> Press enter to stop")
    print(
        requests.post(
            url=f"{BASE_URL}/services/{phash}/deployment/stop",
        ).content.decode()
    )

    input("> Press enter to update")

    # Fund agent instance for swapping
    ledger_api = EthereumApi(address="http://localhost:8545")
    crypto = EthereumCrypto(".operate/key")
    (owner,) = response["chain_data"]["instances"]
    tx = ledger_api.get_transfer_transaction(
        sender_address=crypto.address,
        destination_address=owner,
        amount=1000000000000000,
        tx_fee=50000,
        tx_nonce="0x",
        chain_id=100,
    )
    stx = crypto.sign_transaction(transaction=tx)
    digest = ledger_api.send_signed_transaction(stx)
    ledger_api.get_transaction_receipt(tx_digest=digest)

    new_hash = "bafybeicxdpkuk5z5zfbkso7v5pywf4v7chxvluyht7dtgalg6dnhl7ejoe"
    print(
        requests.put(
            url=f"{BASE_URL}/services",
            json={
                "old_service_hash": trader_template["hash"],
                "new_service_hash": new_hash,
                "deploy": True,
            },
        ).content.decode()
    )

    input("> Press enter to stop")
    print(
        requests.post(
            url=f"{BASE_URL}/services/{new_hash}/deployment/stop",
        ).content.decode()
    )


if __name__ == "__main__":
    test_endpoint_e2e()
