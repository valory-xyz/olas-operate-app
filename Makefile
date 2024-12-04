
define setup_env
    $(eval ENV_FILE := $(1).env)
    @echo " - setup env $(ENV_FILE)"
    $(eval include $(1).env)
    $(eval export)
endef


./trader/:
	pwd
	git clone https://github.com/valory-xyz/trader.git

./dist/aea_win.exe: ./trader/
	mkdir -p dist
	cd trader && poetry install && rm -fr ./open-aea  && git clone https://github.com/valory-xyz/open-aea.git -b fix/1.5.2_encoding && poetry run pip install ./open-aea/ && poetry run pyinstaller --collect-data eth_account --collect-all aea --collect-all autonomy --collect-all operate --collect-all aea_ledger_ethereum --collect-all aea_ledger_cosmos --collect-all aea_ledger_ethereum_flashbots --hidden-import aea_ledger_ethereum --hidden-import aea_ledger_cosmos --hidden-import aea_ledger_ethereum_flashbots --hidden-import grpc --hidden-import openapi_core --collect-all google.protobuf --collect-all openapi_core --collect-all openapi_spec_validator --collect-all asn1crypto --hidden-import py_ecc --hidden-import pytz --onefile pyinstaller/trader_bin.py --name trader_win
	cp -f trader/dist/trader_win.exe ./dist/aea_win.exe
	pwd


./dist/aea_bin: ./trader/
	mkdir -p dist
	cd trader && poetry install && rm -fr ./open-aea  && git clone https://github.com/valory-xyz/open-aea.git -b fix/1.5.2_encoding && poetry run pip install ./open-aea/ && poetry run pyinstaller --collect-data eth_account --collect-all aea --collect-all autonomy --collect-all operate --collect-all aea_ledger_ethereum --collect-all aea_ledger_cosmos --collect-all aea_ledger_ethereum_flashbots --hidden-import aea_ledger_ethereum --hidden-import aea_ledger_cosmos --hidden-import aea_ledger_ethereum_flashbots --hidden-import grpc --hidden-import openapi_core --collect-all google.protobuf --collect-all openapi_core --collect-all openapi_spec_validator --collect-all asn1crypto --hidden-import py_ecc --hidden-import pytz --onefile pyinstaller/trader_bin.py --name trader_bin
	cp -f trader/dist/trader_bin ./dist/aea_bin
	pwd


./dist/tendermint_win.exe: ./operate/
	pwd
	poetry install && poetry run pyinstaller operate/services/utils/tendermint.py --onefile --name tendermint_win


./dist/pearl_win.exe: ./operate/ ./dist/aea_win.exe ./dist/tendermint_win.exe
	pwd
	poetry install && rm -fr ./open-aea  && git clone https://github.com/valory-xyz/open-aea.git -b fix/1.5.2_encoding && poetry run pip install ./open-aea/ && poetry run pyinstaller --collect-data eth_account --collect-all aea --collect-all coincurve --collect-all autonomy --collect-all operate --collect-all aea_ledger_ethereum --collect-all aea_ledger_cosmos --collect-all aea_ledger_ethereum_flashbots --hidden-import aea_ledger_ethereum --hidden-import aea_ledger_cosmos --hidden-import aea_ledger_ethereum_flashbots operate/pearl.py --add-binary dist/aea_win.exe:.  --add-binary dist/tendermint_win.exe:. --onefile --name pearl_win


./electron/bins/:
	mkdir -p ./electron/bins/

./electron/bins/tendermint.exe: ./electron/bins/
	curl -L https://github.com/tendermint/tendermint/releases/download/v0.34.19/tendermint_0.34.19_windows_amd64.tar.gz -o tendermint.tar.gz
	tar -xvf tendermint.tar.gz tendermint.exe
	cp ./tendermint.exe ./electron/bins/tendermint.exe

.PHONY: build
build: ./dist/pearl_win.exe ./electron/bins/tendermint.exe
	$(call setup_env, prod)
	cp -f dist/pearl_win.exe ./electron/bins/pearl_win.exe
	NODE_ENV=${NODE_ENV} GNOSIS_RPC=${GNOSIS_RPC} OPTIMISM_RPC=${OPTIMISM_RPC} BASE_RPC=${BASE_RPC} ETHEREUM_RPC=${ETHEREUM_RPC} yarn build:frontend
	NODE_ENV=${NODE_ENV} GNOSIS_RPC=${GNOSIS_RPC} OPTIMISM_RPC=${OPTIMISM_RPC} BASE_RPC=${BASE_RPC} ETHEREUM_RPC=${ETHEREUM_RPC} GH_TOKEN=${GH_TOKEN} node build-win.js


.PHONY: build-tenderly
build-tenderly:  ./dist/pearl_win.exe
	$(call setup_env, dev-tenderly)
	cp -f dist/pearl_win.exe ./electron/bins/pearl_win.exe
	NODE_ENV=${NODE_ENV} GNOSIS_RPC=${GNOSIS_RPC} OPTIMISM_RPC=${OPTIMISM_RPC} BASE_RPC=${BASE_RPC} ETHEREUM_RPC=${ETHEREUM_RPC} yarn build:frontend
	GH_TOKEN=${GH_TOKEN} node build-win-tenderly.js