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
"""Memeooorr service utils."""

import asyncio
import json
import time
from pathlib import Path
from typing import Optional

import twikit


EXTRACTED_COOKIES_FILE = Path("x.com.cookies.json")


def await_for_cookies() -> dict:
    """Awaits for the cookies file"""

    print(f"Please copy the '{EXTRACTED_COOKIES_FILE}' file into this repo...")

    while not EXTRACTED_COOKIES_FILE.exists():
        time.sleep(5)

    print("Cookie file detected")

    with open(EXTRACTED_COOKIES_FILE, "r", encoding="utf-8") as cookies_file:
        cookies = json.load(cookies_file)

    cookies_dict = {cookie["name"]: cookie["value"] for cookie in cookies}
    return cookies_dict


async def async_get_twitter_cookies(
    username: str, email: str, password: str, cookies_path: Path
) -> Optional[str]:
    """Verifies that the Twitter credentials are correct and get the cookies"""

    client = twikit.Client(language="en-US")

    try:
        valid_cookies = False
        cookies_path.parent.mkdir(exist_ok=True, parents=True)

        # If cookies exist, try with those and validate
        if cookies_path.exists():
            with open(cookies_path, "r", encoding="utf-8") as cookies_file:
                cookies = json.load(cookies_file)
                client.set_cookies(cookies)

            user = await client.user()
            valid_cookies = user.screen_name == username

        if not valid_cookies:
            print("Logging in with password")
            await client.login(
                auth_info_1=username,
                auth_info_2=email,
                password=password,
            )
            client.save_cookies(cookies_path)

    except twikit.errors.BadRequest as e:
        raise RuntimeError(
            "Twitter login failed due to a known issue with the login flow.\nPlease check the known issues section in the README to find the solution. You will need to provide us with a cookies file."
        ) from e
        # commented for now, but it may be needed in the future if login flow breaks
        # cookies = await_for_cookies()  # noqa
        # client.set_cookies(cookies)  # noqa

    return json.dumps(client.get_cookies()).replace(" ", "")


def get_twitter_cookies(
    username: str, email: str, password: str, cookies_path: Path
) -> Optional[str]:
    """get_twitter_cookies"""
    return asyncio.run(
        async_get_twitter_cookies(username, email, password, cookies_path)
    )
