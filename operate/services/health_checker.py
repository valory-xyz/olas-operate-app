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

import aiohttp  # type: ignore
from aea.helpers.logging import setup_logger

from operate.services.manage import ServiceManager  # type: ignore


HTTP_OK = 200


class HealthChecker:
    """Health checker manager."""

    SLEEP_PERIOD = 30
    PORT_UP_TIMEOUT = 120  # seconds

    def __init__(self, service_manager: ServiceManager) -> None:
        """Init the healtch checker."""
        self._jobs: t.Dict[str, asyncio.Task] = {}
        self.logger = setup_logger(name="operate.health_checker")
        self.logger.info("[HEALTCHECKER]: created")
        self._service_manager = service_manager

    def start_for_service(self, service: str) -> None:
        """Start for a specific service."""
        self.logger.info(f"[HEALTCHECKER]: Starting healthcheck job for {service}")
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
            f"[HEALTCHECKER]: Cancelling existing healthcheck_jobs job for {service}"
        )
        status = self._jobs[service].cancel()
        if not status:
            self.logger.info(
                f"[HEALTCHECKER]: Healthcheck job cancellation for {service} failed"
            )

    @staticmethod
    async def check_service_health(service: str) -> bool:
        """Check the service health"""
        del service
        async with aiohttp.ClientSession() as session:
            async with session.get("http://localhost:8716/healthcheck") as resp:
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
                f"[HEALTCHECKER] Start healthcheck job for service: {service}"
            )

            async def _wait_for_port(sleep_period: int = 15) -> None:
                self.logger.info("[HEALTCHECKER]: wait port is up")
                while True:
                    try:
                        await self.check_service_health(service)
                        self.logger.info("[HEALTCHECKER]: port is UP")
                        return
                    except aiohttp.ClientConnectionError:
                        self.logger.error("[HEALTCHECKER]: error connecting http port")
                    await asyncio.sleep(sleep_period)

            async def _check_port_ready(
                timeout: int = self.PORT_UP_TIMEOUT, sleep_period: int = 15
            ) -> bool:
                try:
                    await asyncio.wait_for(
                        _wait_for_port(sleep_period=sleep_period), timeout=timeout
                    )
                    return True
                except asyncio.TimeoutError:
                    return False

            async def _check_health(
                number_of_fails: int = 5, sleep_period: int = self.SLEEP_PERIOD
            ) -> None:
                fails = 0
                while True:
                    try:
                        # Check the service health
                        healthy = await self.check_service_health(service)
                    except aiohttp.ClientConnectionError:
                        self.logger.info(
                            f"[HEALTCHECKER] {service} port read failed. restart"
                        )
                        return

                    if not healthy:
                        fails += 1
                        self.logger.info(
                            f"[HEALTCHECKER] {service} not healthy for {fails} time in a row"
                        )
                    else:
                        self.logger.info(f"[HEALTCHECKER] {service} is HEALTHY")
                        # reset fails if comes healty
                        fails = 0

                    if fails >= number_of_fails:
                        # too much fails, exit
                        self.logger.error(
                            f"[HEALTCHECKER]  {service} failed {fails} times in a row. restart"
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
                self.logger.info(f"[HEALTCHECKER]  {service} wait for port ready")
                if await _check_port_ready(timeout=self.PORT_UP_TIMEOUT):
                    # blocking till restart needed
                    self.logger.info(
                        f"[HEALTCHECKER]  {service} port is ready, checking health every {self.SLEEP_PERIOD}"
                    )
                    await _check_health(sleep_period=self.SLEEP_PERIOD)

                else:
                    self.logger.info(
                        "[HEALTCHECKER] port not ready within timeout. restart deployment"
                    )

                # perform restart
                # TODO: blocking!!!!!!!
                await _restart(self._service_manager, service)
        except Exception:
            self.logger.exception(f"problems running healthcheckr for {service}")
            raise
