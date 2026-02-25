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
TEST CASE
- User has 4 agents onboarded, Omentstrat, polystrat, modius and optimus
- Now, modius is decommissioned, so modius should be part of the "Excluded from auto-run" list and should not be auto-run and user cannot add to the auto-run list so the plus button should be disabled.
- Now, if the Omenstrat and low order then it will be checked for eligiblity such as low funds, eviction etc and if all is good then we navigate in the sidebar, make it as the last selected in the store as well.
and now we can start the agent.