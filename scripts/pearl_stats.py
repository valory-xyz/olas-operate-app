#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ------------------------------------------------------------------------------
#
#   Copyright 2025 Valory AG
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

"""Pearl stats"""

# pylint: disable=too-many-locals, too-many-statements

import argparse
import json
import os
import shutil
import time
import typing as t
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
import requests
from dotenv import load_dotenv
from dune_client.client import DuneClient
from tqdm import tqdm
from web3 import Web3
from web3.middleware import geth_poa_middleware


load_dotenv()

from operate.ledger import DEFAULT_RPCS
from operate.ledger.profiles import CONTRACTS
from operate.operate_types import Chain


SCRIPT_PATH = Path(__file__).resolve().parent
IPFS_ADDRESS = "https://gateway.autonolas.tech/ipfs/"
CID_PREFIX = "f01701220"
DATA_PATH = SCRIPT_PATH / "data"
MINIMUM_WRITE_FILE_DELAY_SECONDS = 20
BLOCK_CHUNK_SIZE = 4000
SECONDS_PER_DAY = 86400
PEARL_TAG = "[Pearl service]"
DUNE_QUERY_ID = 5284913
MAX_WORKERS = 20


SERVICE_REGISTRY: t.Dict = {}
GNOSIS_SAFE_ABI: t.Dict = {}
W3: t.Dict = {}
CHAINS = [
    Chain.BASE,
    Chain.GNOSIS,
    Chain.MODE,
    Chain.OPTIMISTIC,
]


def _load_dune_pearl_staked(update: bool = False) -> t.Dict[str, t.List[int]]:
    dune_db = _load("dune_pearl_staked")
    timestamp = dune_db.get("timestamp", 0)
    now = int(time.time())

    if update or not dune_db or timestamp + SECONDS_PER_DAY < now:
        print("Fetching Dune DB...")
        dune = DuneClient.from_env()
        result = dune.get_latest_result(DUNE_QUERY_ID, max_age_hours=24)
        dune_db["timestamp"] = now

        for row in result.result.rows:
            chain = row["chain"]

            # TODO Patch
            if chain == "optimism":
                chain = "optimistic"

            service_id = row["serviceId"]
            dune_db.setdefault(chain, []).append(service_id)

        _save(dune_db, "dune_pearl_staked")

    print("Done.")
    return dune_db


def _get_safe_owners(chain: Chain, address: str) -> t.Optional[t.List[str]]:
    try:
        w3 = W3[chain]
        abi = GNOSIS_SAFE_ABI[chain]
        safe_contract = w3.eth.contract(
            address=Web3.to_checksum_address(address), abi=abi
        )
        owners = safe_contract.functions.getOwners().call()
        return owners
    except Exception:  # pylint: disable=broad-except
        return None


def _populate_service(
    chain: Chain, services: t.Dict, service_id: int, update: bool = False
) -> None:
    service_key = str(service_id)
    if service_key in services and not update:
        return

    service_registry = SERVICE_REGISTRY[chain]
    (
        security_deposit,
        multisig,
        config_hash,
        threshold,
        max_num_agent_instances,
        num_agent_instances,
        state,
        agent_ids,
    ) = service_registry.functions.getService(service_id).call()

    if state == 0:
        return

    agent_instances = {}
    for agent_id in agent_ids:
        instances = service_registry.functions.getInstancesForAgentId(
            service_id, agent_id
        ).call()[1]
        for instance in instances:
            operator = service_registry.functions.mapAgentInstanceOperators(
                instance
            ).call()
            agent_instances[instance] = {
                "agent_id": agent_id,
                "operator": operator,
                "operator_owners": _get_safe_owners(chain, operator),
            }

    owner = service_registry.functions.ownerOf(service_id).call()

    config_hash = config_hash.hex()
    url = f"{IPFS_ADDRESS}{CID_PREFIX}{config_hash}"
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    metadata = response.json()
    owner_owners = _get_safe_owners(chain, owner)

    services[service_key] = {
        "id": service_id,
        "security_deposit": security_deposit,
        "multisig": multisig,
        "config_hash": config_hash,
        "threshold": threshold,
        "max_num_agent_instances": max_num_agent_instances,
        "num_agent_instances": num_agent_instances,
        "state": state,
        "agent_ids": agent_ids,
        "agent_instances": agent_instances,
        "owner": owner,
        "owner_owners": owner_owners,
        "metadata": metadata,
    }


def _populate_services(services: t.Dict, chain: Chain, update: bool = False) -> None:
    print(f"Populating {chain.value} services {update=}...")
    service_registry = SERVICE_REGISTRY[chain]
    totalSupply = service_registry.functions.totalSupply().call()

    error_count = 0
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [
            executor.submit(_populate_service, chain, services, service_id, update)
            for service_id in range(1, totalSupply + 1)
        ]
        for future in tqdm(
            as_completed(futures),
            total=len(futures),
            desc="  - Fetching services",
            miniters=1,
        ):
            try:
                future.result()
                _save(services, "services", chain, False)
            except Exception as e:  # pylint: disable=broad-except
                error_count += 1
                print(f"Error occurred: {e}")

    if error_count > 0:
        print("\n" + "=" * 40)
        print(f"WARNING: {error_count} error(s) encountered.")
        print("We recommend to re-run the script.")
        print("=" * 40)

    _save(services, "services", chain)
    print("Done.")
    print("")


def _find_block_range(
    chain: Chain, from_timestamp: int, to_timestamp: int
) -> tuple[int, int]:
    w3 = W3[chain]
    latest = w3.eth.block_number

    # Find smallest block with timestamp >= from_timestamp
    low, high = 0, latest
    start_block = latest
    while low <= high:
        mid = (low + high) // 2
        block = w3.eth.get_block(mid)
        if block.timestamp >= from_timestamp:
            start_block = mid
            high = mid - 1
        else:
            low = mid + 1

    # Find largest block with timestamp <= to_timestamp
    low, high = 0, latest
    end_block = 0
    while low <= high:
        mid = (low + high) // 2
        block = w3.eth.get_block(mid)
        if block.timestamp <= to_timestamp:
            end_block = mid
            low = mid + 1
        else:
            high = mid - 1

    if start_block > end_block:
        raise RuntimeError("start_block > end_block")

    return start_block, end_block


last_write_time = 0.0


def _save(
    data: t.Dict, name: str, chain: t.Optional[Chain] = None, force_write: bool = True
) -> None:
    global last_write_time  # pylint: disable=global-statement
    now = time.time()
    if chain:
        file_path = DATA_PATH / f"{name}_{chain.value}.json"
    else:
        file_path = DATA_PATH / f"{name}.json"

    if force_write or (now - last_write_time) >= MINIMUM_WRITE_FILE_DELAY_SECONDS:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        if file_path.exists():
            backup_path = file_path.with_name(file_path.name + ".bak")
            shutil.copy2(file_path, backup_path)

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, sort_keys=True, indent=2)
        last_write_time = now


def _load(name: str, chain: t.Optional[Chain] = None) -> t.Dict:
    if chain:
        file_path = DATA_PATH / f"{name}_{chain.value}.json"
    else:
        file_path = DATA_PATH / f"{name}.json"

    if not os.path.exists(file_path):
        return {}
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def _get_logs(
    chain: Chain,
    from_block: int,
    to_block: int,
    topics: t.List,
    address: t.Optional[str] = None,
    progress: t.Optional[tqdm] = None,
) -> t.List:
    w3 = W3[chain]
    all_logs = []
    current_block = from_block

    while current_block <= to_block:
        chunk_end = min(current_block + BLOCK_CHUNK_SIZE - 1, to_block)
        params = {
            "fromBlock": current_block,
            "toBlock": chunk_end,
            "topics": topics,
        }
        if address:
            params["address"] = address

        logs = w3.eth.get_logs(params)
        all_logs.extend(logs)

        processed = chunk_end - current_block + 1
        if progress:
            progress.update(processed)

        current_block = chunk_end + 1

    return all_logs


def _populate_services_safe_transactions(
    services: t.Dict,
    txs: t.Dict,
    chain: Chain,
    days: t.List[date],
    update: bool = False,
) -> None:
    print(f"Populating {chain.value} services transactions {update=}...")

    if not services:
        print("No services.")
        return

    error_count = 0

    pending_days = []
    for day in days:
        day_str = datetime(day.year, day.month, day.day, tzinfo=timezone.utc).strftime(
            "%Y-%m-%d"
        )
        if day_str not in txs or update:
            pending_days.append(day)

    if not pending_days:
        print("No pending days to process.")
        return

    progress_bars = []
    for i, day in enumerate(pending_days):
        pbar = tqdm(
            total=1,
            desc=f"  - [Thread waiting...] Fetching {chain.value} logs for {day.strftime('%Y-%m-%d')} (blocks ???-???)",
            position=i,
            unit="blocks",
        )
        progress_bars.append(pbar)

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = []
        for i, day in enumerate(pending_days):
            futures.append(
                executor.submit(
                    _populate_services_safe_transactions_for_day,
                    services,
                    txs,
                    chain,
                    day,
                    update,
                    progress_bars[i],
                )
            )
        for future in as_completed(futures):
            try:
                future.result()
                _save(txs, "txs", chain, False)
                _save(services, "services", chain, False)
            except Exception as e:  # pylint: disable=broad-except
                error_count += 1
                tqdm.write(f"Error occurred: {e}")

    for pbar in progress_bars:
        pbar.close()

    if error_count > 0:
        print("\n" + "=" * 40)
        print(f"WARNING: {error_count} error(s) encountered.")
        print("We recommend to re-run the script.")
        print("=" * 40)

    _save(txs, "txs", chain)
    _save(services, "services", chain)
    print("Done.")


def _populate_services_safe_transactions_for_day(
    services: t.Dict,
    txs: t.Dict,
    chain: Chain,
    day: date,
    update: bool = False,
    progress: tqdm = None,
) -> None:
    dt = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
    day_str = dt.strftime("%Y-%m-%d")

    if day_str in txs and not update:
        return

    from_ts = int(dt.timestamp())
    to_ts = from_ts + SECONDS_PER_DAY - 1
    from_block, to_block = _find_block_range(chain, from_ts, to_ts)
    total_blocks = 2 * (to_block - from_block + 1)

    if progress:
        progress.reset(total=total_blocks)
        progress.n = 0
        progress.set_description_str(
            f"  - Fetching {chain.value} logs for {day_str} (blocks {from_block}-{to_block})"
        )

    # Get logs for service transactions (ExecutionSuccess event)
    event_signature = "ExecutionSuccess(bytes32,uint256)"
    event_topic = Web3.keccak(text=event_signature).hex()
    multisig_to_service = {
        Web3.to_checksum_address(s["multisig"]): sid
        for sid, s in services.items()
        if "multisig" in s
    }

    logs = _get_logs(
        chain,
        from_block,
        to_block,
        [event_topic],
        progress=progress,
    )

    txs.setdefault(day_str, {})
    for log in logs:
        address = log["address"]
        if address in multisig_to_service:
            tx_hash = log["transactionHash"].hex()
            service_key = multisig_to_service[address]
            txs[day_str].setdefault(service_key, []).append(tx_hash)

    # Get logs for service creation (CreateService event)
    event_signature = "CreateService(uint256,bytes32)"
    event_topic = Web3.keccak(text=event_signature).hex()
    service_registry_address = CONTRACTS[Chain(chain)]["service_registry"]
    w3 = W3[chain]

    logs = _get_logs(
        chain,
        from_block,
        to_block,
        [event_topic],
        service_registry_address,
        progress,
    )

    for log in logs:
        block = w3.eth.get_block(log["blockNumber"])
        service_id = int(log["topics"][1].hex(), 16)
        service_key = str(service_id)
        if service_key not in services:
            _populate_service(chain, services, service_id, update=True)

        service = services[service_key]
        service["create_service_event"] = {
            "block_number": log["blockNumber"],
            "block_timestamp": block["timestamp"],
            "tx_hash": log["transactionHash"].hex(),
            "config_hash": log["data"].hex(),
        }


def _generate_dataframes(data: t.Dict) -> t.Tuple[pd.DataFrame, pd.DataFrame]:
    rows_services = []
    for chain, content in data.items():
        dune_pearl_staked = content.get("dune_pearl_staked", [])
        services = content.get("services", {})
        for service_key, service in services.items():
            _id = service.get("id", int(service_key))
            creation_ts = service.get("create_service_event", {}).get(
                "block_timestamp", 0
            )
            creation_date = (
                datetime.fromtimestamp(creation_ts, timezone.utc).date()
                if creation_ts
                else None
            )

            agent_instances = service.get("agent_instances", {})
            if agent_instances:
                first_agent = next(iter(agent_instances.values()))
                operator = first_agent.get("operator")
                operator_owners = first_agent.get("operator_owners")
            else:
                operator = service.get("owner")
                operator_owners = service.get("owner_owners")

            is_pearl = False
            metadata_description = service.get("metadata", {}).get("description", "")
            if PEARL_TAG.lower() in metadata_description.lower():
                is_pearl = True

            if service_key in dune_pearl_staked:
                is_pearl = True

            rows_services.append(
                {
                    "chain": chain.value,
                    "service_id": _id,
                    "creation_timestamp": creation_ts,
                    "is_pearl": is_pearl,
                    "creation_date": creation_date,
                    "operator": operator,
                    "operator_owners": operator_owners,
                }
            )

    df_services = pd.DataFrame(rows_services)

    rows_txs = []
    for chain, content in data.items():
        txs = content.get("txs", {})
        for tx_date_str, services_for_date in txs.items():
            tx_date = date.fromisoformat(tx_date_str)
            for service_key, tx_hashes in services_for_date.items():
                rows_txs.append(
                    {
                        "chain": chain.value,
                        "tx_date": tx_date,
                        "service_id": int(service_key),
                        "tx_count": len(tx_hashes),
                    }
                )

    df_txs = pd.DataFrame(rows_txs)

    return (df_services, df_txs)


def bold(text: str) -> str:
    """Return text formatted in bold."""
    return f"\033[1m{text}\033[0m"


def underline(text: str) -> str:
    """Return text formatted with underline."""
    return f"\033[4m{text}\033[0m"


def print_subtitle(text: str) -> None:
    """Print text as a subtitle."""
    print("\n\n" + bold(underline(text)) + "\n")


def print_title(title: str) -> None:
    """Print text as a title."""
    line = "\u2550" * (8 + len(title))
    print(bold(f"\n{line}\n    {title}    \n{line}\n"))


class PearlDataSummarizer:
    """PearlDataSummarizer"""

    def __init__(self, df_services: pd.DataFrame, df_txs: pd.DataFrame) -> None:
        """Initializes the PearlDataSummarizer"""
        self.df_services = df_services
        self.df_txs = df_txs
        self.df_services_pearl = df_services[df_services["is_pearl"]]
        self.df_txs_pearl = df_txs.merge(
            self.df_services_pearl[["chain", "service_id"]],
            on=["chain", "service_id"],
            how="inner",
        )

    def print_summary(
        self, from_date: date, to_date: date, periods_before: int = 1
    ) -> None:
        """print_summary"""
        print_title("Summary of Pearl Services")
        print(f"From date: {from_date}")
        print(f"To date:   {to_date}")
        print_subtitle("Pearl Services Created")
        print(self._services_creted_table(from_date, to_date))
        print_subtitle("Pearl DAAs")
        print(self._daa_table(from_date, to_date))
        print_subtitle("Pearl DAUs")
        print(self._dau_table(from_date, to_date))
        print_subtitle("Pearl operators with multiple services")
        print(self._multi_service_operators_table(from_date, to_date))
        print_subtitle("Pearl WoW")
        print(self._wow_table(from_date, to_date, periods_before))
        print_subtitle("Pearl dropped services")
        print(self._dropped_services_table(from_date, to_date, periods_before))

    def _services_creted_table(self, from_date: date, to_date: date) -> pd.DataFrame:
        from_ts = int(
            datetime.combine(
                from_date, datetime.min.time(), tzinfo=timezone.utc
            ).timestamp()
        )
        to_ts = int(
            datetime.combine(
                to_date, datetime.max.time(), tzinfo=timezone.utc
            ).timestamp()
        )

        df_created = self.df_services_pearl[
            (self.df_services_pearl["creation_timestamp"] >= from_ts)
            & (self.df_services_pearl["creation_timestamp"] <= to_ts)
        ]
        services_created_df = (
            df_created.pivot_table(
                index="creation_date", columns="chain", aggfunc="size", fill_value=0
            )
            .assign(total=lambda df: df.sum(axis=1))
            .sort_index()
        )
        total_row = services_created_df.sum(numeric_only=True)
        total_row.name = "TOTAL"
        services_created_df = pd.concat(
            [services_created_df, pd.DataFrame([total_row])]
        )
        return services_created_df

    def _daa_table(self, from_date: date, to_date: date) -> pd.DataFrame:
        df_active_txs = self.df_txs_pearl[
            (self.df_txs_pearl["tx_date"] >= from_date)
            & (self.df_txs_pearl["tx_date"] <= to_date)
            & (self.df_txs_pearl["tx_count"] > 0)
        ]
        daa_df = df_active_txs.pivot_table(
            index="tx_date",
            columns="chain",
            values="service_id",
            aggfunc="nunique",
            fill_value=0,
        )
        daa_df["total"] = daa_df.sum(axis=1)
        daa_df = daa_df.sort_index()
        return daa_df

    def _dau_table(self, from_date: date, to_date: date) -> pd.DataFrame:
        df_active_txs = self.df_txs_pearl[
            (self.df_txs_pearl["tx_date"] >= from_date)
            & (self.df_txs_pearl["tx_date"] <= to_date)
            & (self.df_txs_pearl["tx_count"] > 0)
        ].merge(
            self.df_services_pearl,
            on=["service_id", "chain"],
            how="inner",
        )
        dau_df = df_active_txs.pivot_table(
            index="tx_date",
            columns="chain",
            values="operator",
            aggfunc="nunique",
            fill_value=0,
        )
        df_dau_total = (
            df_active_txs.groupby("tx_date")["operator"].nunique().rename("global_dau")
        )
        dau_df["global_dau"] = df_dau_total
        dau_df = dau_df.sort_index()
        return dau_df

    def _multi_service_operators_table(
        self, from_date: date, to_date: date
    ) -> pd.DataFrame:
        df_active_txs = self.df_txs_pearl[
            (self.df_txs_pearl["tx_date"] >= from_date)
            & (self.df_txs_pearl["tx_date"] <= to_date)
            & (self.df_txs_pearl["tx_count"] > 0)
        ].merge(
            self.df_services_pearl,
            on=["service_id", "chain"],
            how="inner",
        )
        operator_service_counts = (
            df_active_txs.drop_duplicates(subset=["operator", "chain", "service_id"])
            .groupby("operator", dropna=False)
            .size()
        )
        operators_multi_services = operator_service_counts[
            operator_service_counts > 1
        ].index

        df_active_txs_multi_service_operators = df_active_txs[
            df_active_txs["operator"].isin(operators_multi_services)
        ]
        grouped_services = (
            df_active_txs_multi_service_operators.drop_duplicates(
                subset=["operator", "chain", "service_id"]
            )
            .groupby(["operator", "chain"], dropna=False)["service_id"]
            .apply(lambda s: sorted(set(s)))
            .reset_index()
        )

        output = (
            grouped_services.pivot(
                index="operator", columns="chain", values="service_id"
            )
            .map(
                lambda lst: ", ".join(str(s) for s in lst)
                if isinstance(lst, (list, set))
                else "-"
            )
            .fillna("-")
        )
        return output

    def _wow_table(
        self, from_date: date, to_date: date, periods_before: int
    ) -> pd.DataFrame:
        period_length = to_date - from_date + timedelta(days=1)
        prev_to_date = (
            from_date - timedelta(days=1) - period_length * (periods_before - 1)
        )
        prev_from_date = prev_to_date - period_length + timedelta(days=1)

        print(f"Previous period: from {prev_from_date} to {prev_to_date}.")
        print(f"Current period: from {from_date} to {to_date}.")
        print()

        # Previous period txs
        df_prev_period_txs = self.df_txs_pearl[
            (self.df_txs_pearl["tx_date"] >= prev_from_date)
            & (self.df_txs_pearl["tx_date"] <= prev_to_date)
        ]

        # Current period txs of services that were active in the previous period
        df_curr_period_txs = (
            self.df_txs_pearl[
                (self.df_txs_pearl["tx_date"] >= from_date)
                & (self.df_txs_pearl["tx_date"] <= to_date)
            ]
            .merge(
                df_prev_period_txs[["chain", "service_id"]],
                on=["chain", "service_id"],
                how="inner",
            )
            .drop_duplicates()
        )

        prev_counts = df_prev_period_txs.groupby("chain")["service_id"].nunique()
        curr_counts = df_curr_period_txs.groupby("chain")["service_id"].nunique()

        rows = []
        all_chains = set(prev_counts.index).union(curr_counts.index)

        for chain in sorted(all_chains):
            prev_count = prev_counts.get(chain, 0)
            curr_count = curr_counts.get(chain, 0)
            pct = round((curr_count / prev_count) * 100, 1) if prev_count else 0.0

            rows.append(
                {
                    "chain": chain,
                    "active_in_prev_period": prev_count,
                    "active_in_curr_period": curr_count,
                    "percent_active": pct,
                }
            )

        wow_df = pd.DataFrame(rows)
        totals = {
            "chain": "TOTAL",
            "active_in_prev_period": wow_df["active_in_prev_period"].sum(),
            "active_in_curr_period": wow_df["active_in_curr_period"].sum(),
        }
        totals["percent_active"] = (
            round(
                (totals["active_in_curr_period"] / totals["active_in_prev_period"])
                * 100,
                1,
            )
            if totals["active_in_prev_period"]
            else 0.0
        )

        wow_df.loc[len(wow_df)] = totals
        wow_df = wow_df.set_index("chain")
        return wow_df

    def _dropped_services_table(
        self, from_date: date, to_date: date, periods_before: int
    ) -> pd.DataFrame:
        period_length = to_date - from_date + timedelta(days=1)
        prev_to_date = (
            from_date - timedelta(days=1) - period_length * (periods_before - 1)
        )
        prev_from_date = prev_to_date - period_length + timedelta(days=1)

        print(f"Previous period: from {prev_from_date} to {prev_to_date}.")
        print(f"Current period: from {from_date} to {to_date}.")
        print()

        # Previous period txs
        df_prev_period_txs = self.df_txs_pearl[
            (self.df_txs_pearl["tx_date"] >= prev_from_date)
            & (self.df_txs_pearl["tx_date"] <= prev_to_date)
        ]

        # Current period txs of services that were active in the previous period
        df_curr_period_txs = (
            self.df_txs_pearl[
                (self.df_txs_pearl["tx_date"] >= from_date)
                & (self.df_txs_pearl["tx_date"] <= to_date)
            ]
            .merge(
                df_prev_period_txs[["chain", "service_id"]],
                on=["chain", "service_id"],
                how="inner",
            )
            .drop_duplicates()
        )

        prev_services = (
            df_prev_period_txs.groupby("chain")["service_id"].apply(set).to_dict()
        )
        curr_services = (
            df_curr_period_txs.groupby("chain")["service_id"].apply(set).to_dict()
        )

        all_chains = set(prev_services.keys()).union(curr_services.keys())
        rows = []

        for chain in all_chains:
            prev = prev_services.get(chain, set())
            curr = curr_services.get(chain, set())
            dropped = sorted(prev - curr)
            if dropped:
                dropped_str = ", ".join(str(s) for s in dropped)
                rows.append({"chain": chain, "dropped_service_ids": dropped_str})

        return pd.DataFrame(rows).set_index("chain")


def _date_range(start: date, end: date) -> t.List[date]:
    return [start + timedelta(days=i) for i in range((end - start).days + 1)]


def main() -> None:
    """Main method"""
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--from-date",
        type=lambda s: datetime.strptime(s, "%Y-%m-%d").date(),
        help="Start date in YYYY-MM-DD",
    )
    parser.add_argument(
        "--to-date",
        type=lambda s: datetime.strptime(s, "%Y-%m-%d").date(),
        help="End date in YYYY-MM-DD",
    )
    parser.add_argument(
        "--periods-before",
        type=int,
        help="Number of periods to look back for comparison. Compares the current period (`from_date` to `to_date`) with the period that occurred exactly this many periods before.",
        default=1,
    )
    parser.add_argument(
        "--update",
        action="store_true",
        help="If set, perform an update operation",
    )

    args = parser.parse_args()

    utc_today = datetime.now(timezone.utc).date()
    default_to_date = utc_today - timedelta(days=1)
    default_from_date = default_to_date - timedelta(days=6)

    from_date = args.from_date if args.from_date else default_from_date
    to_date = args.to_date if args.to_date else default_to_date

    today = date.today()
    if to_date >= today:
        print(f"WARNING: Excluding incomplete days (today or future): {to_date}.")
        to_date = min(to_date, today - timedelta(days=1))

    period_length = to_date - from_date + timedelta(days=1)
    prev_to_date = (
        from_date - timedelta(days=1) - period_length * (args.periods_before - 1)
    )
    prev_from_date = prev_to_date - period_length + timedelta(days=1)

    days = sorted(
        set(_date_range(from_date, to_date))
        | set(_date_range(prev_from_date, prev_to_date))
    )

    print_title("Collecting data")
    print(f"From date: {from_date}")
    print(f"To date: {to_date}")

    for chain in CHAINS:
        rpc = DEFAULT_RPCS[Chain(chain)]
        w3 = Web3(Web3.HTTPProvider(rpc))

        if Chain(chain) == Chain.OPTIMISTIC:
            w3.middleware_onion.inject(geth_poa_middleware, layer=0)

        W3[Chain(chain)] = w3

        service_registry_address = CONTRACTS[Chain(chain)]["service_registry"]
        with open(
            SCRIPT_PATH / "abis" / "ServiceRegistryL2.json", "r", encoding="utf-8"
        ) as f:
            service_registry_abi = json.load(f)["abi"]
        SERVICE_REGISTRY[Chain(chain)] = w3.eth.contract(
            address=service_registry_address, abi=service_registry_abi
        )

        with open(
            SCRIPT_PATH / "abis" / "GnosisSafe_V1_3_0.json", "r", encoding="utf-8"
        ) as f:
            gnosis_safe_abi = json.load(f)["abi"]
        GNOSIS_SAFE_ABI[Chain(chain)] = gnosis_safe_abi

    print_subtitle("Loading Dune data")
    dune_pearl_staked = _load_dune_pearl_staked(update=args.update)

    data = {}
    for chain in CHAINS:
        print_subtitle(f"Processing chain {chain.value}")

        services = _load("services", chain)
        _populate_services(services, chain, update=args.update)

        txs = _load("txs", chain)
        _populate_services_safe_transactions(
            services, txs, chain, days, update=args.update
        )

        data[chain] = {
            "services": services,
            "txs": txs,
            "dune_pearl_staked": dune_pearl_staked.get(chain.value, []),
        }

    (df_services, df_txs) = _generate_dataframes(data)
    print("")
    PearlDataSummarizer(df_services, df_txs).print_summary(
        from_date, to_date, args.periods_before
    )


if __name__ == "__main__":
    main()
