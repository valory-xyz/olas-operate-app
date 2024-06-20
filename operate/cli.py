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

"""Operate app CLI module."""

import asyncio
import logging
import os
import signal
import traceback
import typing as t
import uuid
from pathlib import Path

from aea.helpers.logging import setup_logger
from clea import group, params, run
from compose.project import ProjectError
from docker.errors import APIError
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing_extensions import Annotated
from uvicorn.main import run as uvicorn

from operate import services
from operate.account.user import UserAccount
from operate.constants import KEY, KEYS, OPERATE, SERVICES
from operate.ledger import get_ledger_type_from_chain_type
from operate.types import ChainType, DeploymentStatus
from operate.wallet.master import MasterWalletManager


DEFAULT_HARDHAT_KEY = (
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
).encode()
DEFAULT_MAX_RETRIES = 3
USER_NOT_LOGGED_IN_ERROR = JSONResponse(
    content={"error": "User not logged in!"}, status_code=401
)


def service_not_found_error(service: str) -> JSONResponse:
    """Service not found error response"""
    return JSONResponse(
        content={"error": f"Service {service} not found"}, status_code=404
    )


class OperateApp:
    """Operate app."""

    def __init__(
        self,
        home: t.Optional[Path] = None,
        logger: t.Optional[logging.Logger] = None,
    ) -> None:
        """Initialize object."""
        super().__init__()
        self._path = (home or (Path.cwd() / OPERATE)).resolve()
        self._services = self._path / SERVICES
        self._keys = self._path / KEYS
        self._master_key = self._path / KEY
        self.setup()

        self.logger = logger or setup_logger(name="operate")
        self.keys_manager = services.manage.KeysManager(
            path=self._keys,
            logger=self.logger,
        )
        self.password: t.Optional[str] = os.environ.get("OPERATE_USER_PASSWORD")

    def create_user_account(self, password: str) -> UserAccount:
        """Create a user account."""
        self.password = password
        return UserAccount.new(
            password=password,
            path=self._path / "user.json",
        )

    def service_manager(self) -> services.manage.ServiceManager:
        """Load service manager."""
        return services.manage.ServiceManager(
            path=self._services,
            keys_manager=self.keys_manager,
            wallet_manager=self.wallet_manager,
            logger=self.logger,
        )

    @property
    def user_account(self) -> t.Optional[UserAccount]:
        """Load user account."""
        return (
            UserAccount.load(self._path / "user.json")
            if (self._path / "user.json").exists()
            else None
        )

    @property
    def wallet_manager(self) -> MasterWalletManager:
        """Load master wallet."""
        manager = MasterWalletManager(
            path=self._path / "wallets",
            password=self.password,
        )
        manager.setup()
        return manager

    def setup(self) -> None:
        """Make the root directory."""
        self._path.mkdir(exist_ok=True)
        self._services.mkdir(exist_ok=True)
        self._keys.mkdir(exist_ok=True)

    @property
    def json(self) -> dict:
        """Json representation of the app."""
        return {
            "name": "Operate HTTP server",
            "version": "0.1.0.rc0",
            "home": str(self._path),
        }


def create_app(  # pylint: disable=too-many-locals, unused-argument, too-many-statements
    home: t.Optional[Path] = None,
) -> FastAPI:
    """Create FastAPI object."""

    logger = setup_logger(name="operate")
    operate = OperateApp(home=home, logger=logger)
    funding_jobs: t.Dict[str, asyncio.Task] = {}
    healthcheck_jobs: t.Dict[str, asyncio.Task] = {}

    # Create shutdown endpoint
    shutdown_endpoint = uuid.uuid4().hex
    (operate._path / "operate.kill").write_text(  # pylint: disable=protected-access
        shutdown_endpoint
    )

    def schedule_funding_job(
        service: str,
        from_safe: bool = True,
    ) -> None:
        """Schedule a funding job."""
        logger.info(f"Starting funding job for {service}")
        if service in funding_jobs:
            logger.info(f"Cancelling existing funding job for {service}")
            cancel_funding_job(service=service)

        loop = asyncio.get_running_loop()
        funding_jobs[service] = loop.create_task(
            operate.service_manager().funding_job(
                hash=service,
                loop=loop,
                from_safe=from_safe,
            )
        )

    def schedule_healthcheck_job(
        service: str,
    ) -> None:
        """Schedule a healthcheck job."""
        logger.info(f"Starting healthcheck job for {service}")
        if service in healthcheck_jobs:
            logger.info(f"Cancelling existing healthcheck_jobs job for {service}")
            cancel_healthcheck_job(service=service)

        loop = asyncio.get_running_loop()
        healthcheck_jobs[service] = loop.create_task(
            operate.service_manager().healthcheck_job(
                hash=service,
            )
        )

    def cancel_funding_job(service: str) -> None:
        """Cancel funding job."""
        if service not in funding_jobs:
            return
        status = funding_jobs[service].cancel()
        if not status:
            logger.info(f"Funding job cancellation for {service} failed")

    def pause_all_services_on_startup() -> None:
        logger.info("Stopping services on startup...")
        service_hashes = [i["hash"] for i in operate.service_manager().json]

        for service in service_hashes:
            if not operate.service_manager().exists(service=service):
                continue
            deployment = operate.service_manager().create_or_load(service).deployment
            if deployment.status == DeploymentStatus.DELETED:
                continue
            logger.info(f"stopping service {service}")
            deployment.stop(force=True)
            logger.info(f"Cancelling funding job for {service}")
            cancel_funding_job(service=service)
        logger.info("Stopping services on startup done.")

    def cancel_healthcheck_job(service: str) -> None:
        """Cancel healthcheck job."""
        if service not in healthcheck_jobs:
            return
        status = healthcheck_jobs[service].cancel()
        if not status:
            logger.info(f"Healthcheck job cancellation for {service} failed")

    # on backend app started we assume there are now started agents, so we force to pause all
    pause_all_services_on_startup()

    app = FastAPI()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["GET", "POST", "PUT", "DELETE"],
    )

    def with_retries(f: t.Callable) -> t.Callable:
        """Retries decorator."""

        async def _call(request: Request) -> JSONResponse:
            """Call the endpoint."""
            logger.info(f"Calling `{f.__name__}` with retries enabled")
            retries = 0
            errors = []
            while retries < DEFAULT_MAX_RETRIES:
                try:
                    return await f(request)
                except (APIError, ProjectError) as e:
                    logger.error(f"Error {e}\n{traceback.format_exc()}")
                    error = {"traceback": traceback.format_exc()}
                    if "has active endpoints" in e.explanation:
                        error["error"] = "Service is already running"
                    else:
                        error["error"] = str(e)
                    errors.append(error)
                    return JSONResponse(content={"errors": errors}, status_code=500)
                except Exception as e:  # pylint: disable=broad-except
                    errors.append(
                        {"error": str(e.args[0]), "traceback": traceback.format_exc()}
                    )
                    logger.error(f"Error {str(e.args[0])}\n{traceback.format_exc()}")
                retries += 1
            return JSONResponse(content={"errors": errors}, status_code=500)

        return _call

    @app.get(f"/{shutdown_endpoint}")
    async def _kill_server(request: Request) -> JSONResponse:
        """Kill backend server from inside."""
        os.kill(os.getpid(), signal.SIGINT)

    @app.get("/api")
    @with_retries
    async def _get_api(request: Request) -> JSONResponse:
        """Get API info."""
        return JSONResponse(content=operate.json)

    @app.get("/api/account")
    @with_retries
    async def _get_account(request: Request) -> t.Dict:
        """Get account information."""
        return {"is_setup": operate.user_account is not None}

    @app.post("/api/account")
    @with_retries
    async def _setup_account(request: Request) -> t.Dict:
        """Setup account."""
        if operate.user_account is not None:
            return JSONResponse(
                content={"error": "Account already exists"},
                status_code=400,
            )

        data = await request.json()
        operate.create_user_account(
            password=data["password"],
        )
        return JSONResponse(content={"error": None})

    @app.put("/api/account")
    @with_retries
    async def _update_password(request: Request) -> t.Dict:
        """Update password."""
        if operate.user_account is None:
            return JSONResponse(
                content={"error": "Account does not exist"},
                status_code=400,
            )

        data = await request.json()
        try:
            operate.user_account.update(
                old_password=data["old_password"],
                new_password=data["new_password"],
            )
            return JSONResponse(content={"error": None})
        except ValueError as e:
            return JSONResponse(
                content={"error": str(e), "traceback": traceback.format_exc()},
                status_code=400,
            )

    @app.post("/api/account/login")
    @with_retries
    async def _validate_password(request: Request) -> t.Dict:
        """Validate password."""
        if operate.user_account is None:
            return JSONResponse(
                content={"error": "Account does not exist"},
                status_code=400,
            )

        data = await request.json()
        if not operate.user_account.is_valid(password=data["password"]):
            return JSONResponse(
                content={"error": "Password is not valid"},
                status_code=401,
            )

        operate.password = data["password"]
        return JSONResponse(
            content={"message": "Login successful"},
            status_code=200,
        )

    @app.get("/api/wallet")
    @with_retries
    async def _get_wallets(request: Request) -> t.List[t.Dict]:
        """Get wallets."""
        wallets = []
        for wallet in operate.wallet_manager:
            wallets.append(wallet.json)
        return JSONResponse(content=wallets)

    @app.get("/api/wallet/{chain}")
    @with_retries
    async def _get_wallet_by_chain(request: Request) -> t.List[t.Dict]:
        """Create wallet safe"""
        ledger_type = get_ledger_type_from_chain_type(
            chain=ChainType.from_string(request.path_params["chain"])
        )
        manager = operate.wallet_manager
        if not manager.exists(ledger_type=ledger_type):
            return JSONResponse(
                content={"error": "Wallet does not exist"},
                status_code=404,
            )
        return JSONResponse(
            content=manager.load(ledger_type=ledger_type).json,
        )

    @app.post("/api/wallet")
    @with_retries
    async def _create_wallet(request: Request) -> t.List[t.Dict]:
        """Create wallet"""
        if operate.user_account is None:
            return JSONResponse(
                content={"error": "Cannot create wallet; User account does not exist!"},
                status_code=400,
            )

        if operate.password is None:
            return JSONResponse(
                content={"error": "You need to login before creating a wallet"},
                status_code=401,
            )

        data = await request.json()
        chain_type = ChainType(data["chain_type"])
        ledger_type = get_ledger_type_from_chain_type(chain=chain_type)
        manager = operate.wallet_manager
        if manager.exists(ledger_type=ledger_type):
            return JSONResponse(
                content={
                    "wallet": manager.load(ledger_type=ledger_type).json,
                    "mnemonic": None,
                }
            )
        wallet, mnemonic = manager.create(ledger_type=ledger_type)
        return JSONResponse(content={"wallet": wallet.json, "mnemonic": mnemonic})

    @app.get("/api/wallet/safe")
    @with_retries
    async def _get_safes(request: Request) -> t.List[t.Dict]:
        """Create wallet safe"""
        safes = []
        for wallet in operate.wallet_manager:
            safes.append({wallet.ledger_type: wallet.safe})
        return JSONResponse(content=safes)

    @app.get("/api/wallet/safe/{chain}")
    @with_retries
    async def _get_safe(request: Request) -> t.List[t.Dict]:
        """Create wallet safe"""
        ledger_type = get_ledger_type_from_chain_type(
            chain=ChainType.from_string(request.path_params["chain"])
        )
        manager = operate.wallet_manager
        if not manager.exists(ledger_type=ledger_type):
            return JSONResponse(
                content={"error": "Wallet does not exist"},
                status_code=404,
            )
        return JSONResponse(
            content={
                "safe": manager.load(ledger_type=ledger_type).safe,
            },
        )

    @app.post("/api/wallet/safe")
    @with_retries
    async def _create_safe(request: Request) -> t.List[t.Dict]:
        """Create wallet safe"""
        if operate.user_account is None:
            return JSONResponse(
                content={"error": "Cannot create safe; User account does not exist!"},
                status_code=400,
            )

        if operate.password is None:
            return JSONResponse(
                content={"error": "You need to login before creating a safe"},
                status_code=401,
            )

        data = await request.json()
        chain_type = ChainType(data["chain_type"])
        ledger_type = get_ledger_type_from_chain_type(chain=chain_type)
        manager = operate.wallet_manager
        if not manager.exists(ledger_type=ledger_type):
            return JSONResponse(content={"error": "Wallet does not exist"})

        wallet = manager.load(ledger_type=ledger_type)
        if wallet.safe is not None:
            return JSONResponse(
                content={"safe": wallet.safe, "message": "Safe already exists!"}
            )

        wallet.create_safe(  # pylint: disable=no-member
            chain_type=chain_type,
            owner=data.get("owner"),
        )
        wallet.transfer(
            to=t.cast(str, wallet.safe),
            amount=int(1e18),
            chain_type=chain_type,
            from_safe=False,
        )
        return JSONResponse(content={"safe": wallet.safe, "message": "Safe created!"})

    @app.put("/api/wallet/safe")
    @with_retries
    async def _update_safe(request: Request) -> t.List[t.Dict]:
        """Create wallet safe"""
        # TODO: Extract login check as decorator
        if operate.user_account is None:
            return JSONResponse(
                content={"error": "Cannot create safe; User account does not exist!"},
                status_code=400,
            )

        if operate.password is None:
            return JSONResponse(
                content={"error": "You need to login before creating a safe"},
                status_code=401,
            )

        data = await request.json()
        chain_type = ChainType(data["chain_type"])
        ledger_type = get_ledger_type_from_chain_type(chain=chain_type)
        manager = operate.wallet_manager
        if not manager.exists(ledger_type=ledger_type):
            return JSONResponse(content={"error": "Wallet does not exist"})

        wallet = manager.load(ledger_type=ledger_type)
        wallet.add_or_swap_owner(
            chain_type=chain_type,
            owner=data.get("owner"),
        )
        return JSONResponse(content=wallet.json)

    @app.get("/api/services")
    @with_retries
    async def _get_services(request: Request) -> JSONResponse:
        """Get available services."""
        return JSONResponse(content=operate.service_manager().json)

    @app.post("/api/services")
    @with_retries
    async def _create_services(request: Request) -> JSONResponse:
        """Create a service."""
        if operate.password is None:
            return USER_NOT_LOGGED_IN_ERROR
        template = await request.json()
        manager = operate.service_manager()
        update = False
        if len(manager.json) > 0:
            old_hash = manager.json[0]["hash"]
            if old_hash == template["hash"]:
                logger.info(f'Loading service {template["hash"]}')
                service = manager.create_or_load(
                    hash=template["hash"],
                    rpc=template["configuration"]["rpc"],
                    on_chain_user_params=services.manage.OnChainUserParams.from_json(
                        template["configuration"]
                    ),
                )
            else:
                logger.info(f"Updating service from {old_hash} to " + template["hash"])
                service = manager.update_service(
                    old_hash=old_hash,
                    new_hash=template["hash"],
                    rpc=template["configuration"]["rpc"],
                    on_chain_user_params=services.manage.OnChainUserParams.from_json(
                        template["configuration"]
                    ),
                    from_safe=True,
                )
                update = True
        else:
            logger.info(f'Creating service {template["hash"]}')
            service = manager.create_or_load(
                hash=template["hash"],
                rpc=template["configuration"]["rpc"],
                on_chain_user_params=services.manage.OnChainUserParams.from_json(
                    template["configuration"]
                ),
            )

        if template.get("deploy", False):
            manager.deploy_service_onchain_from_safe(hash=service.hash, update=update)
            manager.stake_service_on_chain_from_safe(hash=service.hash)
            manager.fund_service(hash=service.hash)
            manager.deploy_service_locally(hash=service.hash)
            schedule_funding_job(service=service.hash)
            schedule_healthcheck_job(service=service.hash)

        return JSONResponse(
            content=operate.service_manager().create_or_load(hash=service.hash).json
        )

    @app.put("/api/services")
    @with_retries
    async def _update_services(request: Request) -> JSONResponse:
        """Create a service."""
        if operate.password is None:
            return USER_NOT_LOGGED_IN_ERROR
        template = await request.json()
        service = operate.service_manager().update_service(
            old_hash=template["old_service_hash"],
            new_hash=template["new_service_hash"],
        )
        if template.get("deploy", False):
            manager = operate.service_manager()
            manager.deploy_service_onchain_from_safe(hash=service.hash, update=True)
            manager.stake_service_on_chain_from_safe(hash=service.hash)
            manager.fund_service(hash=service.hash)
            manager.deploy_service_locally(hash=service.hash)
            schedule_funding_job(service=service.hash)
            schedule_healthcheck_job(service=service.hash)

        return JSONResponse(content=service.json)

    @app.get("/api/services/{service}")
    @with_retries
    async def _get_service(request: Request) -> JSONResponse:
        """Create a service."""
        if not operate.service_manager().exists(service=request.path_params["service"]):
            return service_not_found_error(service=request.path_params["service"])
        return JSONResponse(
            content=(
                operate.service_manager()
                .create_or_load(
                    hash=request.path_params["service"],
                )
                .json
            )
        )

    @app.post("/api/services/{service}/onchain/deploy")
    @with_retries
    async def _deploy_service_onchain(request: Request) -> JSONResponse:
        """Create a service."""
        if not operate.service_manager().exists(service=request.path_params["service"]):
            return service_not_found_error(service=request.path_params["service"])
        if operate.password is None:
            return USER_NOT_LOGGED_IN_ERROR
        operate.service_manager().deploy_service_onchain(
            hash=request.path_params["service"]
        )
        operate.service_manager().stake_service_on_chain(
            hash=request.path_params["service"]
        )
        return JSONResponse(
            content=(
                operate.service_manager()
                .create_or_load(hash=request.path_params["service"])
                .json
            )
        )

    @app.post("/api/services/{service}/onchain/stop")
    @with_retries
    async def _stop_service_onchain(request: Request) -> JSONResponse:
        """Create a service."""
        if not operate.service_manager().exists(service=request.path_params["service"]):
            return service_not_found_error(service=request.path_params["service"])
        if operate.password is None:
            return USER_NOT_LOGGED_IN_ERROR
        operate.service_manager().terminate_service_on_chain(
            hash=request.path_params["service"]
        )
        operate.service_manager().unbond_service_on_chain(
            hash=request.path_params["service"]
        )
        operate.service_manager().unstake_service_on_chain(
            hash=request.path_params["service"]
        )
        return JSONResponse(
            content=(
                operate.service_manager()
                .create_or_load(hash=request.path_params["service"])
                .json
            )
        )

    @app.get("/api/services/{service}/deployment")
    @with_retries
    async def _get_service_deployment(request: Request) -> JSONResponse:
        """Create a service."""
        if not operate.service_manager().exists(service=request.path_params["service"]):
            return service_not_found_error(service=request.path_params["service"])
        return JSONResponse(
            content=operate.service_manager()
            .create_or_load(
                request.path_params["service"],
            )
            .deployment.json
        )

    @app.post("/api/services/{service}/deployment/build")
    @with_retries
    async def _build_service_locally(request: Request) -> JSONResponse:
        """Create a service."""
        if not operate.service_manager().exists(service=request.path_params["service"]):
            return service_not_found_error(service=request.path_params["service"])
        deployment = (
            operate.service_manager()
            .create_or_load(
                request.path_params["service"],
            )
            .deployment
        )
        deployment.build(force=True)
        return JSONResponse(content=deployment.json)

    @app.post("/api/services/{service}/deployment/start")
    @with_retries
    async def _start_service_locally(request: Request) -> JSONResponse:
        """Create a service."""
        if not operate.service_manager().exists(service=request.path_params["service"]):
            return service_not_found_error(service=request.path_params["service"])
        service = request.path_params["service"]
        manager = operate.service_manager()
        manager.deploy_service_onchain(hash=service)
        manager.stake_service_on_chain(hash=service)
        manager.fund_service(hash=service)
        manager.deploy_service_locally(hash=service, force=True)
        schedule_funding_job(service=service)
        schedule_healthcheck_job(service=service.hash)
        return JSONResponse(content=manager.create_or_load(service).deployment)

    @app.post("/api/services/{service}/deployment/stop")
    @with_retries
    async def _stop_service_locally(request: Request) -> JSONResponse:
        """Create a service."""
        if not operate.service_manager().exists(service=request.path_params["service"]):
            return service_not_found_error(service=request.path_params["service"])
        service = request.path_params["service"]
        deployment = operate.service_manager().create_or_load(service).deployment
        deployment.stop()
        logger.info(f"Cancelling funding job for {service}")
        cancel_funding_job(service=service)
        return JSONResponse(content=deployment.json)

    @app.post("/api/services/{service}/deployment/delete")
    @with_retries
    async def _delete_service_locally(request: Request) -> JSONResponse:
        """Create a service."""
        if not operate.service_manager().exists(service=request.path_params["service"]):
            return service_not_found_error(service=request.path_params["service"])
        # TODO: Drain safe before deleting service
        deployment = (
            operate.service_manager()
            .create_or_load(
                request.path_params["service"],
            )
            .deployment
        )
        deployment.delete()
        return JSONResponse(content=deployment.json)

    return app


@group(name="operate")
def _operate() -> None:
    """Operate - deploy autonomous services."""


@_operate.command(name="daemon")
def _daemon(
    host: Annotated[str, params.String(help="HTTP server host string")] = "localhost",
    port: Annotated[int, params.Integer(help="HTTP server port")] = 8000,
    home: Annotated[
        t.Optional[Path], params.Directory(long_flag="--home", help="Home directory")
    ] = None,
) -> None:
    """Launch operate daemon."""
    uvicorn(
        app=create_app(home=home),
        host=host,
        port=port,
    )


def main() -> None:
    """CLI entry point."""
    run(cli=_operate)


if __name__ == "__main__":
    main()
