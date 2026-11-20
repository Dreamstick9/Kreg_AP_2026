# Checker viva notes

- **When is a monitor due?** The scheduler loads active monitors. A monitor is due if it has never been checked, or its last check is at least its interval ago (with a one-second timing allowance). The scheduler looks again every 10 seconds.
- **Why `Promise.allSettled`?** It waits for every due monitor and gives a result for each one, including rejected checks. One problem does not hide the outcome for the other monitors.
- **Why the `running` flag?** Checks can take longer than one scheduler interval. The flag skips a new tick while the previous one is still working, so checks do not overlap.
- **Why three failures before DOWN?** One temporary network error should not mark a site down. The checker counts consecutive failures and changes the status after the third. A successful check resets the count and restores UP.
- **How do checks create incidents?** The checker and incident service share `src/events/monitorEvents.js`. On the third failure the checker emits `monitor:down`; the incident service listens and creates an incident. When a DOWN monitor succeeds again, it emits `monitor:up`; the service resolves its open incident.
