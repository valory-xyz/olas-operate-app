
define setup_env
    $(eval ENV_FILE := $(1).env)
    @echo " - setup env $(ENV_FILE)"
    $(eval include $(1).env)
    $(eval export)
	@cp $(ENV_FILE) .env
endef


./dist/tendermint_win.exe: ./electron/bins/ ./operate/
	pwd
	poetry install --no-root && poetry run pyinstaller operate/tendermint.py --onefile --name tendermint_win
	ls -l dist
	cp dist/tendermint_win.exe ./electron/bins/tendermint_win.exe


./dist/pearl_win.exe: ./operate/  ./dist/tendermint_win.exe
	pwd
	poetry install --no-root && poetry run pyinstaller --collect-data eth_account --collect-all aea --collect-all coincurve --collect-all autonomy --collect-all operate --collect-all aea_ledger_ethereum --collect-all aea_ledger_cosmos --collect-all aea_ledger_ethereum_flashbots --hidden-import aea_ledger_ethereum --hidden-import aea_ledger_cosmos --hidden-import aea_ledger_ethereum_flashbots operate/pearl.py --onefile --name pearl_win


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
	NODE_ENV=${NODE_ENV} GNOSIS_RPC=${GNOSIS_RPC} OPTIMISM_RPC=${OPTIMISM_RPC} BASE_RPC=${BASE_RPC} ETHEREUM_RPC=${ETHEREUM_RPC} MODE_RPC=${MODE_RPC} yarn build:frontend
	NODE_ENV=${NODE_ENV} GNOSIS_RPC=${GNOSIS_RPC} OPTIMISM_RPC=${OPTIMISM_RPC} BASE_RPC=${BASE_RPC} ETHEREUM_RPC=${ETHEREUM_RPC} MODE_RPC=${MODE_RPC} GH_TOKEN=${GH_TOKEN} node build-win.js


.PHONY: build-tenderly
build-tenderly:  ./dist/pearl_win.exe
	$(call setup_env, dev-tenderly)
	cp -f dist/pearl_win.exe ./electron/bins/pearl_win.exe
	NODE_ENV=${NODE_ENV} GNOSIS_RPC=${GNOSIS_RPC} OPTIMISM_RPC=${OPTIMISM_RPC} BASE_RPC=${BASE_RPC} ETHEREUM_RPC=${ETHEREUM_RPC} MODE_RPC=${MODE_RPC} yarn build:frontend
	GH_TOKEN=${GH_TOKEN} node build-win-tenderly.js
