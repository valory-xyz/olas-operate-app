cd "$(dirname "$0")"

BIN_DIR="electron/bins/"
mkdir -p $BIN_DIR

poetry install

poetry run pyinstaller operate/services/utils/tendermint.py --onefile --distpath $BIN_DIR

poetry run pyinstaller \
    --collect-data eth_account \
    --collect-all aea \
    --collect-all autonomy \
    --collect-all operate \
    --collect-all aea_ledger_ethereum \
    --collect-all aea_ledger_cosmos \
    --collect-all aea_ledger_ethereum_flashbots \
    --hidden-import aea_ledger_ethereum \
    --hidden-import aea_ledger_cosmos \
    --hidden-import aea_ledger_ethereum_flashbots \
    operate/pearl.py \
    --add-binary ${BIN_DIR}/aea_bin_x64:. \
    --add-binary ${BIN_DIR}/aea_bin_arm64:. \
    --onefile \
    --distpath $BIN_DIR \
    --name pearl_$(uname -m)

