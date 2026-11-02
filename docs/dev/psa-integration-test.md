# PSA GitHub tracking smoke test

Temporary documentation fixture for OPE-2007. Close the test PR without merging.

1. Request a human review and check that the need API reports a review ask.
2. Submit a review with an inline comment and check that the author is asked to address it.
3. Resolve the review thread and check that the author is asked to merge once no other reviews are pending.
4. Close the PR and check that its open asks have a completion timestamp.

Use the existing OPE-2007 Slack thread for the test. No application behavior changes.
