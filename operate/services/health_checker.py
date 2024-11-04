#!/usr/bin/env python3
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
"""Source code for checking aea is alive.."""
import asyncio
import typing as t
from concurrent.futures import ThreadPoolExecutor
from traceback import print_exc

import aiohttp  # type: ignore
from aea.helpers.logging import setup_logger

from operate.constants import HEALTH_CHECK_URL
from operate.services.manage import ServiceManager  # type: ignore


HTTP_OK = 200


class HealthChecker:
    """Health checker manager."""

    SLEEP_PERIOD_DEFAULT = 30
    PORT_UP_TIMEOUT_DEFAULT = 120  # seconds
    NUMBER_OF_FAILS_DEFAULT = 10
    HEALTH_CHECK_URL = HEALTH_CHECK_URL

    def __init__(
        self,
        service_manager: ServiceManager,
        port_up_timeout: int | None = None,
        sleep_period: int | None = None,
        number_of_fails: int | None = None,
    ) -> None:
        """Init the healtch checker."""
        self._jobs: t.Dict[str, asyncio.Task] = {}
        self.logger = setup_logger(name="operate.health_checker")
        self._service_manager = service_manager
        self.port_up_timeout = port_up_timeout or self.PORT_UP_TIMEOUT_DEFAULT
        self.sleep_period = sleep_period or self.SLEEP_PERIOD_DEFAULT
        self.number_of_fails = number_of_fails or self.NUMBER_OF_FAILS_DEFAULT

    def start_for_service(self, service: str) -> None:
        """Start for a specific service."""
        self.logger.info(f"[HEALTH_CHECKER]: Starting healthcheck job for {service}")
        if service in self._jobs:
            self.stop_for_service(service=service)

        loop = asyncio.get_running_loop()
        self._jobs[service] = loop.create_task(
            self.healthcheck_job(
                service=service,
            )
        )

    def stop_for_service(self, service: str) -> None:
        """Stop for a specific service."""
        if service not in self._jobs:
            return
        self.logger.info(
            f"[HEALTH_CHECKER]: Cancelling existing healthcheck_jobs job for {service}"
        )
        status = self._jobs[service].cancel()
        if not status:
            self.logger.info(
                f"[HEALTH_CHECKER]: Healthcheck job cancellation for {service} failed"
            )

    @classmethod
    async def check_service_health(cls, service: str) -> bool:
        """Check the service health"""
        del service
        async with aiohttp.ClientSession() as session:
            async with session.get(cls.HEALTH_CHECK_URL) as resp:
                status = resp.status
                response_json = await resp.json()
                return status == HTTP_OK and response_json.get(
                    "is_transitioning_fast", False
                )

    async def healthcheck_job(
        self,
        service: str,
    ) -> None:
        """Start a background health check job."""

        try:
            self.logger.info(
                f"[HEALTH_CHECKER] Start healthcheck job for service: {service}"
            )

            async def _wait_for_port(sleep_period: int = 15) -> None:
                self.logger.info("[HEALTH_CHECKER]: wait port is up")
                while True:
                    try:
                        await self.check_service_health(service)
                        self.logger.info("[HEALTH_CHECKER]: port is UP")
                        return
                    except aiohttp.ClientConnectionError:
                        self.logger.error(
                            "[HEALTH_CHECKER]: error connecting http port"
                        )
                    await asyncio.sleep(sleep_period)

            async def _check_port_ready(
                timeout: int = self.port_up_timeout, sleep_period: int = 15
            ) -> bool:
                try:
                    await asyncio.wait_for(
                        _wait_for_port(sleep_period=sleep_period), timeout=timeout
                    )
                    return True
                except asyncio.TimeoutError:
                    return False

            async def _check_health(
                number_of_fails: int = 5, sleep_period: int = self.sleep_period
            ) -> None:
                fails = 0
                while True:
                    try:
                        # Check the service health
                        healthy = await self.check_service_health(service)
                    except aiohttp.ClientConnectionError as e:
                        print_exc()
                        self.logger.warning(
                            f"[HEALTH_CHECKER] {service} port read failed. assume not healthy {e}"
                        )
                        healthy = False

                    if not healthy:
                        fails += 1
                        self.logger.warning(
                            f"[HEALTH_CHECKER] {service} not healthy for {fails} time in a row"
                        )
                    else:
                        self.logger.info(f"[HEALTH_CHECKER] {service} is HEALTHY")
                        # reset fails if comes healty
                        fails = 0

                    if fails >= number_of_fails:
                        # too much fails, exit
                        self.logger.error(
                            f"[HEALTH_CHECKER]  {service} failed {fails} times in a row. restart"
                        )
                        return

                    await asyncio.sleep(sleep_period)

            async def _restart(service_manager: ServiceManager, service: str) -> None:
                def _do_restart() -> None:
                    service_manager.stop_service_locally(hash=service)
                    service_manager.deploy_service_locally(hash=service)

                loop = asyncio.get_event_loop()
                with ThreadPoolExecutor() as executor:
                    future = loop.run_in_executor(executor, _do_restart)
                    await future
                    exception = future.exception()
                    if exception is not None:
                        raise exception

            # upper cycle
            while True:
                self.logger.info(f"[HEALTH_CHECKER]  {service} wait for port ready")
                if await _check_port_ready(timeout=self.port_up_timeout):
                    # blocking till restart needed
                    self.logger.info(
                        f"[HEALTH_CHECKER]  {service} port is ready, checking health every {self.sleep_period}"
                    )
                    await _check_health(
                        number_of_fails=self.number_of_fails,
                        sleep_period=self.sleep_period,
                    )

                else:
                    self.logger.info(
                        "[HEALTH_CHECKER] port not ready within timeout. restart deployment"
                    )

                # perform restart
                # TODO: blocking!!!!!!!
                await _restart(self._service_manager, service)
        except Exception:
            self.logger.exception(f"problems running healthcheckr for {service}")
            raise
