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

"""Setup wallet."""

import requests

<<<<<<< HEAD
from operate.operate_types import ChainType
=======
from operate.operate_types import Chain
>>>>>>> origin/refactor/multi-chain-support-frontend
from scripts.fund import fund


print("Setting up user account")
print(
    requests.post(
        "http://localhost:8000/api/account",
        json={
            "password": "password",
        },
    ).json()
)

print("Logging in")
print(
    requests.post(
        "http://localhost:8000/api/account/login",
        json={
            "password": "password",
        },
    ).json()
)

wallet = requests.post(
    "http://localhost:8000/api/wallet",
    json={
        "chain": Chain.GNOSIS,
    },
).json()
print("Setting up wallet")
print(wallet)

print("Funding wallet: ", end="")
fund(wallet["wallet"]["address"], amount=20)

print(
    requests.post(
        "http://localhost:8000/api/wallet/safe",
        json={
            "chain": Chain.GNOSIS,
            "owner": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",  # Backup owner
        },
    ).json()
)

print(
    requests.get(
        "http://localhost:8000/api/wallet",
    ).json()
)
