## Edge cases to test for Auto-run

## Single agent
# TEST CASE
- User is in Modius agent and starts the auto-run.
- The auto-run should start successfully of the next eligible agent in the list (because modius is decommissioned).

# TEST CASE
- What if no agent is onboarded yet?
- Even if onboarded, it is not yet funded?

# TEST CASE
- Has multiple agents onboarded and funded?
- Should we need to have a list of visited agents in the state so we don't go circles in the same agents again and again

# TEST CASE
- What if all agents have already earned rewards?




## Multiple agents
