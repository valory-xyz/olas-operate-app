#!/usr/bin/env bash
# extract-context.sh — Extract structured context from a Pearl logs zip bundle
#
# Usage: extract-context.sh <zipfile> <subcommand> [options]
#
# Subcommands:
#   services                          — All services table (ID, name, chain, addresses, token, version)
#   master-wallet                     — Master EOA + Master Safe addresses by chain
#   log-summary                       — Per-agent log summary: last timestamp, last round
#   os-info                           — OS, platform, memory from os_info.txt
#   balances <address> <chainid>      — Native balances plus recent token transfer activity
#   tx-history <address> <chainid>    — Tx history filtered by --since / --until (unix timestamps)
#     Options: --since <unix-ts>  (default: export_time - 48h)
#              --until <unix-ts>  (default: export_time)
#
# Chain IDs: 1=Ethereum  10=Optimism  100=Gnosis  137=Polygon  8453=Base  34443=Mode
#
# Output:  Human-readable text on stdout
# Logs:    Progress lines on stderr
# Exit:    0=success  1=error
#
# Env vars (optional):
#   ETHERSCAN_API_KEY  — required only for Ethereum (chainid=1)
#
# Examples:
#   extract-context.sh bundle.zip services
#   extract-context.sh bundle.zip master-wallet
#   extract-context.sh bundle.zip log-summary
#   extract-context.sh bundle.zip balances 0xf17be80d... 10
#   extract-context.sh bundle.zip tx-history 0xf17be80d... 10 --since 1743500000 --until 1743600000

set -euo pipefail

# ---------------------------------------------------------------------------
# Args + usage
# ---------------------------------------------------------------------------
usage() {
  cat >&2 << 'HELP_TEXT'
extract-context.sh — Extract structured context from a Pearl logs zip bundle

OVERVIEW
  This script reads a Pearl logs .zip bundle (exported from the Pearl desktop app) and
  extracts structured diagnostic context. It is invoked via curl so it is always the
  latest version:

    curl -fsSL <url> | bash -s -- <zipfile> <subcommand> [options]

  All subcommands read directly from the zip — no temp directory is created.
  Subcommands that make live API calls are clearly marked below.

USAGE
  extract-context.sh <zipfile> <subcommand> [options]

SUBCOMMANDS — ZIP-ONLY (fast, no network calls)

  services
    Reads:   debug_data.json inside the zip
    Outputs: One block per service with:
               - service_config_id (sc-{uuid}) — use this to match log files
               - name, home chain, agent version (owner/repo@tag)
               - Multisig (Safe) address — the service's on-chain safe wallet
               - Agent EOA address(es) — the hot wallet(s) that sign transactions
               - Service token ID, agent type ID
               - Required ERC-20 token contract addresses (from fund_requirements)
    When:    Run first. Use the output to build the service inventory and extract
             addresses needed for on-chain subcommands.

  master-wallet
    Reads:   debug_data.json inside the zip
    Outputs: Master EOA address (owns all Safes) and Master Safe address(es) per chain,
             plus any backup EOAs.
    When:    Run when investigating wallet ownership, funding issues, or Safe setup.
             The Master EOA funds the Agent EOAs and owns the Master Safe.

  log-summary
    Reads:   sc-{uuid}_agent.log files + agent_runner.log inside the zip
    Outputs: One block per agent log file, sorted newest-first, showing:
               - Last log timestamp (local time — compare against export time to gauge staleness)
               - Last ABCI round entered (e.g. reset_and_pause_round = healthy cycle completed;
                 validate_transaction_round with no further transition = likely stuck)
             The entry labelled (current runner) is agent_runner.log — written by whichever
             agent was most recently started.
    When:    Run to identify which service is actively failing vs stopped. A service with a
             recent last-log timestamp but stuck in a non-reset_and_pause_round round is the
             one to focus on. Services whose last log is days before export were likely stopped
             intentionally.
    Note:    Timestamps in agent logs are local time, not UTC. The export time shown is UTC
             (parsed from the zip filename). Do not compute gaps — compare them visually.

  os-info
    Reads:   os_info.txt inside the zip
    Outputs: OS name, platform (x64/arm64), total memory
    When:    Run when the issue might be platform-specific (e.g. Windows-on-ARM, low memory,
             unsupported OS). Also useful context for any bug report.

SUBCOMMANDS — LIVE API CALLS (require network; use Blockscout for most chains, Etherscan V2 for Ethereum)

  balances <address> <chainid>
    Fetches: Current native balance + native balance at log-export time (via block lookup)
             + ERC-20 token activity in the 48h window before export (net flow + recent transfers)
    Outputs: Explorer URL, native balance now vs at export, token transfer summary
    When:    Run for the failing service's Safe address and Agent EOA to check:
               - Is the Safe funded? Did it run out of gas/tokens during the issue window?
               - Did the Agent EOA run out of gas (ETH/xDAI/MATIC etc)?
               - Were there unexpected token inflows or outflows around the failure time?
    Note:    The export-time balance reflects what the agent had when the user exported logs.
             The current balance may differ if the agent has since been topped up or drained.
    Env:     ETHERSCAN_API_KEY required for chainid=1 (Ethereum) only.

  tx-history <address> <chainid> [--since <unix-ts>] [--until <unix-ts>]
    Fetches: Normal transactions + ERC-20 token transfers for <address> in the time window
    Outputs: Explorer URL, time/block window, normal txs (with direction, value, hash, status),
             ERC-20 transfers (with direction, token symbol, amount, hash)
    Default: --since = export_time - 48h, --until = export_time
    When:    Run after balances, for the failing service's Agent EOA, to see:
               - Did the agent successfully submit transactions? Did any fail on-chain?
               - Were there failed txs ([FAILED] flag) that explain a stuck round?
               - What was the last successful action before the failure?
             Also run for the Safe address if investigating DeFi position activity.
    Options: --since <unix-ts>  override window start (unix timestamp)
             --until <unix-ts>  override window end (unix timestamp)
    Env:     ETHERSCAN_API_KEY required for chainid=1 (Ethereum) only.

CHAIN IDS
  1=Ethereum  10=Optimism  100=Gnosis  137=Polygon  8453=Base  34443=Mode

OUTPUT
  Human-readable text on stdout. Progress lines on stderr. Exit: 0=success  1=error.

EXAMPLES
  curl -fsSL <url> | bash -s -- bundle.zip services
  curl -fsSL <url> | bash -s -- bundle.zip master-wallet
  curl -fsSL <url> | bash -s -- bundle.zip log-summary
  curl -fsSL <url> | bash -s -- bundle.zip os-info
  curl -fsSL <url> | bash -s -- bundle.zip balances 0xf17be80d... 10
  curl -fsSL <url> | bash -s -- bundle.zip tx-history 0xf17be80d... 10
  curl -fsSL <url> | bash -s -- bundle.zip tx-history 0xf17be80d... 10 --since 1743500000 --until 1743600000
HELP_TEXT
  exit 1
}

[[ $# -eq 0 || "${1:-}" == "--help" || "${1:-}" == "help" ]] && usage
[[ $# -lt 2 ]] && usage

ZIPFILE="${1}"
SUBCOMMAND="${2}"
shift 2

[[ ! -f "${ZIPFILE}" ]] && { printf '[extract-context] ERROR: zip not found: %s\n' "${ZIPFILE}" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Read a file from the zip to stdout
zip_read() {
  unzip -p "${ZIPFILE}" "${1}" 2>/dev/null || { printf '[extract-context] ERROR: file not found in zip: %s\n' "${1}" >&2; exit 1; }
}

# Read a file from the zip to stdout, return empty string if missing (no exit)
zip_read_optional() {
  unzip -p "${ZIPFILE}" "${1}" 2>/dev/null || true
}

# List files in the zip matching a glob pattern (returns newline-separated names)
zip_list() {
  unzip -l "${ZIPFILE}" | awk '{print $4}' | grep -E "${1}" || true
}

# Parse export timestamp from zip filename: pearl_logs_YYYY-MM-DDTHH-MM-SS...zip
# Returns Unix timestamp
parse_export_ts() {
  local filename
  filename="$(basename "${ZIPFILE}")"
  local raw
  raw=$(printf '%s' "${filename}" | sed -n 's/.*pearl_logs_\([0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}T[0-9]\{2\}-[0-9]\{2\}-[0-9]\{2\}\).*/\1/p')
  if [[ -z "${raw}" ]]; then
    printf '[extract-context] WARNING: could not parse timestamp from filename, using now\n' >&2
    date +%s
    return
  fi
  # Convert 2026-04-02T13-28-30 → 2026-04-02T13:28:30
  local iso="${raw:0:10}T${raw:11:2}:${raw:14:2}:${raw:17:2}"
  date -u -d "${iso}Z" +%s 2>/dev/null || date -j -u -f "%Y-%m-%dT%H:%M:%S" "${iso}" +%s 2>/dev/null || date +%s
}

# Chain ID → explorer base URL and result parsing style
# Style: "etherscan" (result is plain string) | "blockscout" (result is object with .blockNumber)
chain_api_base() {
  local chainid="${1}"
  case "${chainid}" in
    1)     printf 'https://api.etherscan.io/v2/api?chainid=1&apikey=%s' "${ETHERSCAN_API_KEY:-YourApiKeyToken}" ;;
    10)    printf 'https://explorer.optimism.io/api' ;;
    100)   printf 'https://gnosis.blockscout.com/api' ;;
    137)   printf 'https://polygon.blockscout.com/api' ;;
    8453)  printf 'https://base.blockscout.com/api' ;;
    34443) printf 'https://explorer.mode.network/api' ;;
    *)     printf '[extract-context] ERROR: unsupported chainid: %s\n' "${chainid}" >&2; exit 1 ;;
  esac
}

chain_name() {
  case "${1}" in
    1)     printf 'Ethereum' ;;
    10)    printf 'Optimism' ;;
    100)   printf 'Gnosis' ;;
    137)   printf 'Polygon' ;;
    8453)  printf 'Base' ;;
    34443) printf 'Mode' ;;
    *)     printf 'Chain-%s' "${1}" ;;
  esac
}

chain_explorer_url() {
  local chainid="${1}" addr="${2}" type="${3}"   # type: address | tx
  local base
  case "${chainid}" in
    1)     base='https://etherscan.io' ;;
    10)    base='https://explorer.optimism.io' ;;
    100)   base='https://gnosisscan.io' ;;
    137)   base='https://polygonscan.com' ;;
    8453)  base='https://basescan.org' ;;
    34443) base='https://explorer.mode.network' ;;
    *)     base='https://unknown-explorer' ;;
  esac
  printf '%s/%s/%s' "${base}" "${type}" "${addr}"
}

# Validate EVM address format
validate_address() {
  local address="${1}"
  [[ "${address}" =~ ^0x[0-9a-fA-F]{40}$ ]]
}

# Validate chain ID is supported by this script
validate_chainid() {
  local chainid="${1}"
  [[ "${chainid}" =~ ^[0-9]+$ ]] || return 1
  case "${chainid}" in
    1|10|100|137|8453|34443) return 0 ;;
    *) return 1 ;;
  esac
}

# Call Etherscan V2 or Blockscout API — returns raw JSON
# Usage: api_call <chainid> <query_string>
# query_string examples: "module=account&action=balance&address=0x..."
api_call() {
  local chainid="${1}" qs="${2}"
  if [[ "${chainid}" == "1" ]]; then
    if [[ -z "${ETHERSCAN_API_KEY:-}" ]]; then
      printf '[extract-context] WARNING: ETHERSCAN_API_KEY not set, skipping Ethereum on-chain query\n' >&2
      printf '{"status":"0","message":"SKIPPED","result":"no_api_key"}'
      return
    fi
    local base="https://api.etherscan.io/v2/api?chainid=1&apikey=${ETHERSCAN_API_KEY}"
    curl -sL "${base}&${qs}"
  else
    local base
    base="$(chain_api_base "${chainid}")"
    # Blockscout occasionally returns trailing content after JSON — take first valid JSON line
    curl -sL "${base}?${qs}" | python3 -c "import sys,json; raw=sys.stdin.read().strip(); lines=raw.split('\n'); [print(l) for l in lines if l.startswith('{')]" | head -1
  fi
}

# Get block number closest to a unix timestamp for a given chain
# Returns block number as plain integer string
get_block_at_ts() {
  local chainid="${1}" ts="${2}" closest="${3:-before}"
  printf '[extract-context] Looking up block at timestamp %s on chain %s...\n' "${ts}" "${chainid}" >&2
  local raw
  raw=$(api_call "${chainid}" "module=block&action=getblocknobytime&timestamp=${ts}&closest=${closest}")
  local status
  status=$(printf '%s' "${raw}" | python3 -c "import sys,json; d=json.loads(sys.stdin.read()); print(d.get('status','0'))" 2>/dev/null || printf '0')
  if [[ "${status}" != "1" ]]; then
    printf '[extract-context] WARNING: could not resolve block for ts=%s chain=%s\n' "${ts}" "${chainid}" >&2
    printf '0'
    return
  fi
  # Etherscan: result is a plain string; Blockscout: result is {"blockNumber": "..."}
  printf '%s' "${raw}" | python3 -c "
import sys, json
d = json.loads(sys.stdin.read())
r = d.get('result', '0')
if isinstance(r, dict):
    print(r.get('blockNumber', '0'))
else:
    print(r)
"
}

# Format wei to ETH (18 decimals)
wei_to_eth() {
  python3 -c "v=int('${1}' or '0'); print(f'{v/1e18:.6f}')" 2>/dev/null || printf '?'
}

# Format raw token amount using decimals
format_token() {
  python3 -c "
v = int('${1}' or '0')
d = int('${2}' or '18')
print(f'{v / (10**d):.6f}')
" 2>/dev/null || printf '?'
}

# ---------------------------------------------------------------------------
# python3 helper: parse debug_data.json from zip, return services list as JSON
# ---------------------------------------------------------------------------
parse_services_json() {
  zip_read "debug_data.json" | python3 -c "
import sys, json
d = json.load(sys.stdin)
svcs = d.get('services', {})
# Normalise: may be {'services': [...]} or [...]
if isinstance(svcs, dict):
    svcs = svcs.get('services', [])
print(json.dumps(svcs))
"
}

parse_addresses_json() {
  zip_read "debug_data.json" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(json.dumps(d.get('addresses', [])))
"
}

# ---------------------------------------------------------------------------
# Subcommand: services
# ---------------------------------------------------------------------------
cmd_services() {
  printf '[extract-context] Parsing services from debug_data.json...\n' >&2

  parse_services_json | python3 -c "
import sys, json
svcs = json.load(sys.stdin)

def safe(obj, *keys, default=''):
    for k in keys:
        if not isinstance(obj, dict): return default
        obj = obj.get(k, default)
    return obj if obj != '' else default

print('=== Services ===')
print()
for s in svcs:
    sid   = safe(s, 'service_config_id')
    name  = safe(s, 'name')
    chain = safe(s, 'home_chain')
    repo  = safe(s, 'agent_release', 'repository')
    ver   = f\"{safe(repo, 'owner')}/{safe(repo, 'name')}@{safe(repo, 'version')}\" if repo else '?'

    ccs = s.get('chain_configs', {})
    cc  = ccs.get(chain, next(iter(ccs.values()), {})) if ccs else {}
    cd  = cc.get('chain_data', {})
    up  = cd.get('user_params', {})

    multisig = safe(cd, 'multisig')
    instances = cd.get('instances', [])
    token    = safe(cd, 'token')
    agent_id = safe(up, 'agent_id')

    # Token contract addresses from fund_requirements (skip zero address)
    fr = up.get('fund_requirements', {})
    token_contracts = [k for k in fr if k != '0x0000000000000000000000000000000000000000']

    print(f'Service:          {sid}')
    print(f'Name:             {name}')
    print(f'Home chain:       {chain}')
    print(f'Version:          {ver}')
    print(f'Multisig (Safe):  {multisig}')
    print(f'Agent EOA(s):     {chr(10).join(instances) if instances else \"-\"}')
    print(f'Service token:    {token}')
    print(f'Agent type ID:    {agent_id}')
    if token_contracts:
        print(f'Required tokens:  {chr(10).join(token_contracts)}')
    print()
"
}

# ---------------------------------------------------------------------------
# Subcommand: master-wallet
# ---------------------------------------------------------------------------
cmd_master_wallet() {
  printf '[extract-context] Parsing master wallet from debug_data.json...\n' >&2

  parse_addresses_json | python3 -c "
import sys, json

CHAIN_NAMES = {
    1: 'Ethereum', 10: 'Optimism', 100: 'Gnosis',
    137: 'Polygon', 8453: 'Base', 34443: 'Mode'
}

addrs = json.load(sys.stdin)
master_eoa = None
master_safes = []
master_safe_backups = []

for entry in addrs:
    if 'masterEoa' in entry:
        master_eoa = entry['masterEoa'].get('address')
    if 'masterSafe' in entry:
        master_safes = entry['masterSafe']
    if 'masterSafeBackups' in entry:
        master_safe_backups = entry['masterSafeBackups']

print('=== Master Wallet ===')
print()
print(f'Master EOA: {master_eoa or \"?\"}')
print()
print('Master Safe(s):')

seen = set()
for s in master_safes:
    addr     = s.get('address', '?')
    chain_id = s.get('evmChainId', '?')
    chain_nm = CHAIN_NAMES.get(chain_id, f'chain-{chain_id}')
    key = (addr, chain_id)
    if key in seen:
        continue
    seen.add(key)
    print(f'  {chain_nm} (chainid={chain_id}): {addr}')

if master_safe_backups:
    print()
    print('Master Safe Backup EOA(s):')
    seen_bu = set()
    for b in master_safe_backups:
        addr  = b.get('address', '?')
        chain_id = b.get('evmChainId', '?')
        chain_nm = CHAIN_NAMES.get(chain_id, f'chain-{chain_id}')
        safe_addr = b.get('safeAddress', '?')
        key = (addr, chain_id)
        if key in seen_bu:
            continue
        seen_bu.add(key)
        print(f'  {chain_nm} (chainid={chain_id}): {addr}  (backup for safe {safe_addr})')
print()
"
}

# ---------------------------------------------------------------------------
# Subcommand: log-summary
# ---------------------------------------------------------------------------
cmd_log_summary() {
  local export_ts
  export_ts=$(parse_export_ts)
  local export_iso
  export_iso=$(date -d "@${export_ts}" --utc +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null \
    || date -r "${export_ts}" -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null \
    || printf '%s' "${export_ts}")

  printf '[extract-context] Scanning agent logs (export time: %s)...\n' "${export_iso}" >&2

  # Collect sc-{uuid}_agent.log files (exclude _prev_ variants)
  local agent_logs
  agent_logs=$(zip_list '^sc-[0-9a-f-]*_agent\.log$')

  # Build list of label|filename pairs; append agent_runner.log if present
  local entries=""
  while IFS= read -r fname; do
    [[ -z "${fname}" ]] && continue
    local label
    label=$(printf '%s' "${fname}" | sed 's/_agent\.log$//')
    entries="${entries}${label}|${fname}"$'\n'
  done <<< "${agent_logs}"

  local runner_present
  runner_present=$(zip_list '^agent_runner\.log$')
  if [[ -n "${runner_present}" ]]; then
    entries="${entries}(current runner)|agent_runner.log"$'\n'
  fi

  if [[ -z "${entries}" ]]; then
    printf '=== Log Summary ===\n\nNo agent log files found in zip.\n\n'
    return
  fi

  printf '=== Log Summary (export: %s) ===\n\n' "${export_iso}"

  # Feed all log contents into Python for parsing and sorting.
  # Protocol: for each file we write a header line "FILE:<label>" followed by
  # the raw log content, then a sentinel "---END---".
  {
    while IFS='|' read -r label fname; do
      [[ -z "${fname}" ]] && continue
      printf '[extract-context] Reading %s...\n' "${fname}" >&2
      printf 'FILE:%s\n' "${label}"
      zip_read_optional "${fname}"
      printf '\n---END---\n'
    done <<< "${entries}"
  } | python3 -c "
import sys, re

export_iso = '${export_iso}'

# Timestamp patterns
bracket_ts = re.compile(r'^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})')   # [YYYY-MM-DD HH:MM:SS
plain_ts   = re.compile(r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})')      # YYYY-MM-DD HH:MM:SS
round_pat  = re.compile(r\"Entered in the '([^']+_round)'\")

def parse_ts(line):
    m = bracket_ts.match(line) or plain_ts.match(line)
    return m.group(1) if m else None

blocks = []
current_label = None
lines_buf = []

for raw_line in sys.stdin:
    line = raw_line.rstrip('\n')
    if line.startswith('FILE:'):
        if current_label is not None:
            blocks.append((current_label, lines_buf))
        current_label = line[5:]
        lines_buf = []
    elif line == '---END---':
        pass
    else:
        lines_buf.append(line)

if current_label is not None:
    blocks.append((current_label, lines_buf))

results = []
for label, lines in blocks:
    last_ts = None
    last_round = None

    for line in lines:
        ts = parse_ts(line)
        if ts:
            last_ts = ts
        m = round_pat.search(line)
        if m:
            last_round = m.group(1)
    sort_key = last_ts or '0000-00-00 00:00:00'

    parts = [
        f'Service:    {label}',
        f'Last log:   {last_ts or \"unknown\"}  (export: {export_iso})',
    ]
    if last_round:
        parts.append(f'Last round: {last_round}')

    results.append((sort_key, '\n'.join(parts)))

results.sort(key=lambda x: x[0], reverse=True)
for _, body in results:
    print(body)
    print()
"

  if [[ -n "${runner_present}" ]]; then
    printf 'Note: agent_runner.log is written by whichever agent was most recently started.\n'
    printf '      The entry above labelled (current runner) reflects that log.\n\n'
  fi
}

# ---------------------------------------------------------------------------
# Subcommand: os-info
# ---------------------------------------------------------------------------
cmd_os_info() {
  printf '[extract-context] Reading os_info.txt...\n' >&2
  printf '=== OS Info ===\n\n'
  zip_read "os_info.txt"
  printf '\n'
}

# ---------------------------------------------------------------------------
# Subcommand: balances <address> <chainid>
# ---------------------------------------------------------------------------
cmd_balances() {
  local address="${1:-}"
  local chainid="${2:-}"
  [[ -z "${address}" || -z "${chainid}" ]] && { printf 'Usage: balances <address> <chainid>\n' >&2; exit 1; }
  validate_address "${address}" || { printf '[extract-context] ERROR: invalid address format: %s\n' "${address}" >&2; exit 1; }
  validate_chainid "${chainid}" || { printf '[extract-context] ERROR: unsupported chainid: %s (supported: 1, 10, 100, 137, 8453, 34443)\n' "${chainid}" >&2; exit 1; }

  local chain_nm export_ts
  chain_nm=$(chain_name "${chainid}")
  export_ts=$(parse_export_ts)
  local export_iso
  export_iso=$(date -d "@${export_ts}" --utc +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -r "${export_ts}" -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || printf '%s' "${export_ts}")

  printf '[extract-context] Fetching balances for %s on %s (chainid=%s)...\n' "${address}" "${chain_nm}" "${chainid}" >&2

  # --- Get export-time block ---
  local export_block
  export_block=$(get_block_at_ts "${chainid}" "${export_ts}" "before")

  # --- Current native balance ---
  printf '[extract-context] Fetching current native balance...\n' >&2
  local cur_native_raw
  cur_native_raw=$(api_call "${chainid}" "module=account&action=balance&address=${address}&tag=latest")
  local cur_native_wei
  cur_native_wei=$(printf '%s' "${cur_native_raw}" | python3 -c "import sys,json; d=json.loads(sys.stdin.read()); print(d.get('result','0') if d.get('status')=='1' else '0')" 2>/dev/null || printf '0')
  local cur_native_eth
  cur_native_eth=$(wei_to_eth "${cur_native_wei}")

  # --- Export-time native balance ---
  local exp_native_eth="(block lookup failed)"
  if [[ "${export_block}" != "0" ]]; then
    printf '[extract-context] Fetching native balance at export block %s...\n' "${export_block}" >&2
    local exp_native_raw
    exp_native_raw=$(api_call "${chainid}" "module=account&action=balance&address=${address}&tag=${export_block}")
    local exp_native_wei
    exp_native_wei=$(printf '%s' "${exp_native_raw}" | python3 -c "import sys,json; d=json.loads(sys.stdin.read()); print(d.get('result','0') if d.get('status')=='1' else '0')" 2>/dev/null || printf '0')
    exp_native_eth=$(wei_to_eth "${exp_native_wei}")
  fi

  # --- Recent ERC-20 token transfers (to infer token holdings) ---
  printf '[extract-context] Fetching recent ERC-20 token transfers...\n' >&2
  local since_48h=$(( export_ts - 172800 ))
  local start_block
  start_block=$(get_block_at_ts "${chainid}" "${since_48h}" "after")
  local tokentx_raw
  if [[ "${export_block}" == "0" ]]; then
    printf '[extract-context] WARNING: export block lookup failed; skipping ERC-20 token transfer query.\n' >&2
    tokentx_raw='{"status":"1","message":"export block lookup failed; tokentx query skipped","result":[]}'
  else
    tokentx_raw=$(api_call "${chainid}" "module=account&action=tokentx&address=${address}&startblock=${start_block}&endblock=${export_block}&sort=desc&page=1&offset=50")
  fi

  printf '=== Balances: %s on %s (chainid=%s) ===\n\n' "${address}" "${chain_nm}" "${chainid}"
  printf 'Explorer:          %s\n' "$(chain_explorer_url "${chainid}" "${address}" "address")"
  printf '\n'
  printf 'Native balance (current):          %s ETH/native\n' "${cur_native_eth}"
  printf 'Native balance (at export %s): %s ETH/native\n' "${export_iso}" "${exp_native_eth}"
  printf '\n'

  # Parse and display recent token transfers
  printf '%s\n' "${tokentx_raw}" | ADDRESS_LOWER="${address,,}" python3 -c "
import sys, json
import os
from collections import defaultdict

address_lower = os.environ.get('ADDRESS_LOWER', '').lower()

raw = sys.stdin.read().strip()
try:
    d = json.loads(raw)
except Exception:
    print('ERC-20 token transfers: (parse error)')
    sys.exit(0)

if d.get('status') != '1':
    print(f'ERC-20 token transfers: {d.get(\"message\", \"no data\")}')
    sys.exit(0)

txs = d.get('result', [])
if not txs:
    print('ERC-20 token transfers: none in window')
    sys.exit(0)

# Group by token symbol, show net flow
flows = defaultdict(int)
decimals = {}
for tx in txs:
    sym  = tx.get('tokenSymbol', '?')
    dec  = int(tx.get('tokenDecimal', '18') or '18')
    val  = int(tx.get('value', '0') or '0')
    decimals[sym] = dec
    if tx.get('to', '').lower() == address_lower:
        flows[sym] += val
    else:
        flows[sym] -= val

print('ERC-20 token activity (last 48h window, incoming=+, outgoing=-):')
for sym, net in flows.items():
    dec = decimals.get(sym, 18)
    human = net / (10 ** dec)
    print(f'  {sym}: {human:+.6f}')
print()
print(f'Recent ERC-20 transfers ({min(len(txs),10)} most recent):')
for tx in txs[:10]:
    ts_human = tx.get('timeStamp','?')
    sym  = tx.get('tokenSymbol','?')
    dec  = int(tx.get('tokenDecimal','18') or '18')
    val  = int(tx.get('value','0') or '0')
    human = val / (10 ** dec)
    direction = 'IN ' if tx.get('to','').lower() == address_lower else 'OUT'
    print(f'  {direction} {human:.6f} {sym}  tx={tx.get(\"hash\",\"?\")[:20]}...  time={tx.get(\"timeStamp\",\"?\")}')
"
  printf '\n'
}

# ---------------------------------------------------------------------------
# Subcommand: tx-history <address> <chainid> [--since <ts>] [--until <ts>]
# ---------------------------------------------------------------------------
cmd_tx_history() {
  local address="${1:-}"
  local chainid="${2:-}"
  [[ -z "${address}" || -z "${chainid}" ]] && { printf 'Usage: tx-history <address> <chainid> [--since <unix-ts>] [--until <unix-ts>]\n' >&2; exit 1; }
  validate_address "${address}" || { printf '[extract-context] ERROR: invalid address format: %s\n' "${address}" >&2; exit 1; }
  validate_chainid "${chainid}" || { printf '[extract-context] ERROR: unsupported chainid: %s (supported: 1, 10, 100, 137, 8453, 34443)\n' "${chainid}" >&2; exit 1; }
  shift 2

  local export_ts
  export_ts=$(parse_export_ts)
  local since_ts=$(( export_ts - 172800 ))   # default: 48h before export
  local until_ts="${export_ts}"

  while [[ $# -gt 0 ]]; do
    case "${1}" in
      --since)
        [[ $# -lt 2 ]] && { printf 'Usage: tx-history <address> <chainid> [--since <unix-ts>] [--until <unix-ts>]\n' >&2; exit 1; }
        since_ts="${2}"
        shift 2
        ;;
      --until)
        [[ $# -lt 2 ]] && { printf 'Usage: tx-history <address> <chainid> [--since <unix-ts>] [--until <unix-ts>]\n' >&2; exit 1; }
        until_ts="${2}"
        shift 2
        ;;
      *) printf '[extract-context] WARNING: unknown option: %s\n' "${1}" >&2; shift ;;
    esac
  done

  [[ "${since_ts}" =~ ^[0-9]+$ ]] || { printf '[extract-context] ERROR: --since must be a unix timestamp: %s\n' "${since_ts}" >&2; exit 1; }
  [[ "${until_ts}" =~ ^[0-9]+$ ]] || { printf '[extract-context] ERROR: --until must be a unix timestamp: %s\n' "${until_ts}" >&2; exit 1; }

  local chain_nm
  chain_nm=$(chain_name "${chainid}")
  printf '[extract-context] Fetching tx history for %s on %s (%s → %s)...\n' \
    "${address}" "${chain_nm}" "${since_ts}" "${until_ts}" >&2

  # Resolve blocks for time range
  local start_block end_block
  start_block=$(get_block_at_ts "${chainid}" "${since_ts}" "after")
  end_block=$(get_block_at_ts "${chainid}" "${until_ts}" "before")

  printf '[extract-context] Block range: %s → %s\n' "${start_block}" "${end_block}" >&2

  if [[ "${start_block}" -eq 0 || "${end_block}" -eq 0 ]]; then
    printf '[extract-context] WARNING: could not resolve block range for %s on %s (%s → %s resolved to %s → %s); skipping on-chain tx queries.\n' \
      "${address}" "${chain_nm}" "${since_ts}" "${until_ts}" "${start_block}" "${end_block}" >&2
    printf '=== Tx History: %s on %s (chainid=%s) ===\n\n' "${address}" "${chain_nm}" "${chainid}"
    printf 'Explorer:   %s\n' "$(chain_explorer_url "${chainid}" "${address}" "address")"
    printf 'Window:     %s  →  %s\n' "${since_ts}" "${until_ts}"
    printf 'Blocks:     %s  →  %s\n\n' "${start_block}" "${end_block}"
    printf 'Normal transactions: skipped (block lookup failed)\n'
    printf 'ERC-20 transfers: skipped (block lookup failed)\n\n'
    return 0
  fi

  if [[ "${start_block}" -gt "${end_block}" ]]; then
    printf '[extract-context] WARNING: invalid block range for %s on %s (start_block %s > end_block %s); skipping on-chain tx queries.\n' \
      "${address}" "${chain_nm}" "${start_block}" "${end_block}" >&2
    printf '=== Tx History: %s on %s (chainid=%s) ===\n\n' "${address}" "${chain_nm}" "${chainid}"
    printf 'Explorer:   %s\n' "$(chain_explorer_url "${chainid}" "${address}" "address")"
    printf 'Window:     %s  →  %s\n' "${since_ts}" "${until_ts}"
    printf 'Blocks:     %s  →  %s\n\n' "${start_block}" "${end_block}"
    printf 'Normal transactions: skipped (invalid block range)\n'
    printf 'ERC-20 transfers: skipped (invalid block range)\n\n'
    return 0
  fi

  local since_iso until_iso
  since_iso=$(date -d "@${since_ts}" --utc +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -r "${since_ts}" -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || printf '%s' "${since_ts}")
  until_iso=$(date -d "@${until_ts}" --utc +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -r "${until_ts}" -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || printf '%s' "${until_ts}")

  # Fetch normal transactions
  printf '[extract-context] Fetching normal transactions...\n' >&2
  local txlist_raw
  txlist_raw=$(api_call "${chainid}" "module=account&action=txlist&address=${address}&startblock=${start_block}&endblock=${end_block}&sort=desc&page=1&offset=50")

  # Fetch ERC-20 token transfers
  printf '[extract-context] Fetching ERC-20 token transfers...\n' >&2
  local tokentx_raw
  tokentx_raw=$(api_call "${chainid}" "module=account&action=tokentx&address=${address}&startblock=${start_block}&endblock=${end_block}&sort=desc&page=1&offset=50")

  printf '=== Tx History: %s on %s (chainid=%s) ===\n\n' "${address}" "${chain_nm}" "${chainid}"
  printf 'Explorer:   %s\n' "$(chain_explorer_url "${chainid}" "${address}" "address")"
  printf 'Window:     %s  →  %s\n' "${since_iso}" "${until_iso}"
  printf 'Blocks:     %s  →  %s\n\n' "${start_block}" "${end_block}"

  # Parse and display normal txs
  printf '%s\n' "${txlist_raw}" | ADDRESS_LOWER="${address,,}" python3 -c "
import sys, json
import os

address_lower = os.environ.get('ADDRESS_LOWER', '').lower()

raw = sys.stdin.read().strip()
try:
    d = json.loads(raw)
except Exception as e:
    print(f'Normal transactions: (parse error: {e})')
    sys.exit(0)

if d.get('status') != '1':
    msg = d.get('message','no data')
    result = d.get('result','')
    print(f'Normal transactions: {msg}' + (f' ({result})' if result and result != msg else ''))
    sys.exit(0)

txs = d.get('result', [])
print(f'Normal transactions ({len(txs)} in window, showing up to 50, newest first):')
if not txs:
    print('  (none)')
else:
    for tx in txs:
        ts   = tx.get('timeStamp','?')
        h    = tx.get('hash','?')
        frm  = tx.get('from','?')
        to   = tx.get('to','?')
        val  = int(tx.get('value','0') or '0')
        eth  = val / 1e18
        err  = ' [FAILED]' if tx.get('isError','0') == '1' else ''
        direction = 'OUT' if frm.lower() == address_lower else 'IN '
        print(f'  {direction} {eth:.6f} ETH  {h[:20]}...  {ts}{err}')
        print(f'      from={frm[:20]}...  to={to[:20]}...')
" 2>/dev/null || printf 'Normal transactions: (error parsing response)\n'

  printf '\n'

  # Parse and display token transfers
  printf '%s\n' "${tokentx_raw}" | ADDRESS_LOWER="${address,,}" python3 -c "
import sys, json
import os

address_lower = os.environ.get('ADDRESS_LOWER', '').lower()

raw = sys.stdin.read().strip()
try:
    d = json.loads(raw)
except Exception as e:
    print(f'ERC-20 transfers: (parse error: {e})')
    sys.exit(0)

if d.get('status') != '1':
    msg = d.get('message','no data')
    result = d.get('result','')
    print(f'ERC-20 transfers: {msg}' + (f' ({result})' if result and result != msg else ''))
    sys.exit(0)

txs = d.get('result', [])
print(f'ERC-20 token transfers ({len(txs)} in window, showing up to 50, newest first):')
if not txs:
    print('  (none)')
else:
    for tx in txs:
        ts   = tx.get('timeStamp','?')
        h    = tx.get('hash','?')
        sym  = tx.get('tokenSymbol','?')
        dec  = int(tx.get('tokenDecimal','18') or '18')
        val  = int(tx.get('value','0') or '0')
        human = val / (10 ** dec)
        direction = 'IN ' if tx.get('to','').lower() == address_lower else 'OUT'
        print(f'  {direction} {human:.6f} {sym}  {h[:20]}...  {ts}')
" 2>/dev/null || printf 'ERC-20 transfers: (error parsing response)\n'

  printf '\n'
}

# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------
case "${SUBCOMMAND}" in
  services)         cmd_services ;;
  master-wallet)    cmd_master_wallet ;;
  log-summary)      cmd_log_summary ;;
  os-info)          cmd_os_info ;;
  balances)         cmd_balances "${@}" ;;
  tx-history)       cmd_tx_history "${@}" ;;
  *)
    printf '[extract-context] ERROR: unknown subcommand: %s\n' "${SUBCOMMAND}" >&2
    usage
    ;;
esac
