Agent performance template
- Pearl v1 requires that agents populate a file agent_performance.json, which allows the agent to report its performance metrics to the user running the agent. This ensures that performance data is accessible to the Pearl app even when the agent is not actively running.

Technical specification
- The agent must store JSON data following the specification below.
- Minimum required compatibility fields: Middleware can read any JSON object, but the following keys are recommended to keep the response shape stable for UI consumers:

  - timestamp: UNIX timestamp (or null)
  - metrics: array
  - last_activity: optional (recommended to include as null when unused)
  - last_chat_message: optional (recommended to include as null when unused)

- Additional keys are allowed and encouraged when they provide richer UX (agent_behavior, agent_details, prediction_history, profit_over_time, etc.).

- Example JSON for an Agent with activity (minimal):
{
  "timestamp": 1753973735,
  "metrics": [  // Can be empty, 1 or 2
    {
      "name": "Total ROI",
      "is_primary": true,
      // Optional: explanation shown as a tooltip next to the name
      // HTML allowed (e.g. <b>...</b>)
      "description": "Partial ROI accounts only for prediction market related activity, excluding staking rewards. Partial ROI: <b>-13%</b>",
      "value": "88%"
    },
    {
      "name": "Prediction accuracy",
      "is_primary": false,
      "description": null,
      "value": "55.9%"
    }
  ],
  "agent_behavior": "Balanced strategy that spreads predictions, limits risk, and aims for consistent wins."
}

- Example JSON for an Agent with activity (extended):
{
    "timestamp": 1771507069,
    "metrics": [
        {
            "name": "Prediction accuracy",
            "is_primary": false,
            "value": "0%",
            "description": "Percentage of correct predictions"
        },
        {
            "name": "Total ROI",
            "is_primary": true,
            "value": "More trades needed",
            "description": "Total return on investment including staking rewards."
        }
    ],
    "agent_behavior": null,
    "agent_details": {
        "id": "0x...",
        "created_at": "2026-02-13T10:07:15Z",
        "last_active_at": "2026-02-19T13:16:50Z"
    },
    "agent_performance": {
        "window": "lifetime",
        "currency": "USD",
        "metrics": {
            "all_time_funds_used": 0.26,
            "all_time_profit": -0.13,
            "roi": -0.81
        },
        "stats": {
            "predictions_made": 6,
            "prediction_accuracy": 0.0
        }
    },
    "prediction_history": {
        "total_predictions": 6,
        "stored_count": 6,
        "last_updated": 1771507069,
        "items": []
    },
    "profit_over_time": {
        "last_updated": 1771507069,
        "total_days": 5,
        "data_points": []
    },
    "achievements": null
}

- Example JSON for an Agent with no activity:
{
  "timestamp": null,
  "metrics": [],
  "last_activity": null,
  "last_chat_message": null,
  "agent_behavior": null
}

Field definitions
- metrics
  - An array containing KPI metrics (commonly 0 to 2 for primary/secondary summaries).
  - Must contain fields name, is_primary, description, and value.
  - Examples:
    - Prediction Markets Trader Agent: Total ROI, Prediction Accuracy
    - DeFAI Agent: Portfolio Balance, ROI since activation
- last_activity and last_chat_message
  - Optional compatibility fields currently used by middleware defaults.
  - Include as null if your agent does not use them.
- agent_behavior
  - A text that provides a general description on how the agent is currently behaving/interacting/etc.
  - Examples:
    - Prediction Markets Trader Agent: "Balanced strategy that spreads predictions, limits risk, and aims for consistent wins."
    - DeFAI Agent: "Only dealing with whitelisted stable coins in protocols with TVL > $1M"
- timestamp
  - UNIX timestamp in seconds (UTC) indicating the last update to any part of the data.
  - The metrics info should be updated at the end of each agent’s activity cycle.The activity info should be updated once the relevant activity is performed.

File location and format
The data must be stored in a JSON file named agent_performance.json at the path defined by the environment variable CONNECTION_CONFIGS_CONFIG_STORE_PATH.

Example
```
import json
import os
from pathlib import Path
from time import time


STORE_PATH = os.getenv("CONNECTION_CONFIGS_CONFIG_STORE_PATH")
if not STORE_PATH:
    raise ValueError("STORE_PATH environment variable is not set.")

agent_performance_path = Path(STORE_PATH) / "agent_performance.json"
if not agent_performance_path.exists():
    agent_performance_path.write_text(
        json.dumps(
            {
                "timestamp": None,
                "metrics": [],
                "last_activity": None,
                "last_chat_message": None,
            }
        )
    )


def update_performance_metrics(
    timestamp: int | None = None,
    metrics: dict | None = None,
    last_activity: str | None = None,
    last_chat_message: str | None = None,
) -> None:
    """Update the agent performance metrics file."""
    data = json.loads(agent_performance_path.read_text())
    if timestamp is not None:
        data["timestamp"] = timestamp
    if metrics is not None:
        data["metrics"].append(metrics)
    if last_activity is not None:
        data["last_activity"] = last_activity
    if last_chat_message is not None:
        data["last_chat_message"] = last_chat_message

    agent_performance_path.write_text(json.dumps(data, indent=2))


if __name__ == "__main__":
    update_performance_metricsupdate_perfomance_metrics(timestamp=int(time()))

    # Agent did some activity
    update_performance_metricsupdate_perfomance_metrics(timestamp=int(time()), last_activity="I did something!")

    # Agent produced a chat-style update (optional)
    update_performance_metrics(
        timestamp=int(time()),
        last_chat_message="Rebalanced portfolio after market move.",
    )

    # Agent achieved some metrics
    update_perfomance_metrics(
        timestamp=int(time()),
        metrics={
            "name": "Prediction accuracy",
            "is_primary": False,
            "description": "Percentage of correct predictions over the last 100 predictions.",
            "value": "55.9%",
        },
    )

```