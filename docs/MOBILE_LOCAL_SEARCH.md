# Private local search enabled

The existing Render service now uses the existing OpenStreetMap/Nominatim adapter
for user-triggered nearby searches. This server change works with the installed
private iOS and Android apps; a new native build is not required.

Deployment `dep-daprkvgu01pc73dnjfq0` went live on 23 September 2026 in 36.9 seconds,
using commit `ef48f4d990b4f7330660ee34db3eb1b2582609ea` on
`codex/rheo-v0.10-upstream-hypotheses`. The only source change replaces technical
local-search explanations with plain English in `mobile/local_context_v0_1.mjs`.
No dependencies, accounts, maps or background tracking were added.

The service's Render environment was changed to:

```text
LOCAL_CONTEXT_PROVIDER=nominatim
NOMINATIM_USER_AGENT=RheoPrivateBeta/0.2 (+https://rheo-private-beta.onrender.com/api/health)
```

The default endpoint is `https://nominatim.openstreetmap.org`. The Blueprint still
defaults to fixture mode so a new deployment requires an explicit provider choice.
Provider selection and `NOMINATIM_BASE_URL` can be changed on the server without an
app update. No keys or invitation values were changed.

## Limits and privacy

This is deliberately a small private test. Review the
[Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/)
before expanding it. The existing adapter uses one shared request queue with at
least 1.1 seconds between requests, a 15-minute in-memory result cache, an identifying
user agent and visible OpenStreetMap attribution. There are no periodic, autocomplete
or bulk place searches. Up to three category queries return at most nine candidates.
The private gateway's daily request limits and single server instance remain in place.

Location remains optional and foreground-only. The phone rounds its location before
sending it to Render. Nominatim receives controlled category terms and a bounding box
around the approximate area, not the full question or an invitation code. Listings,
sources and retrieval time are retained in the existing local-context snapshot;
raw user coordinates are excluded from saved decisions. No content logging was added.

Coverage is incomplete, the category planner is limited, and proximity does not
establish suitability or availability. Treat results as places to check. Use a
separately assessed hosted or self-managed provider before wider rollout.

## Verification

Before deployment: typecheck, all 14 mobile smoke scripts (16 PASS summaries),
and Expo Doctor (21/21) passed. A direct provider probe returned eight real listings
around a public test location in Manchester, using made-up question text.

Hosted checks completed on 26 September 2026:

- Authenticated skills/work question: HTTP 200, provider `nominatim`, eight real
  listings in 2.45 seconds. Attribution, source links, retrieval time, distance bounds
  and the updated explanations were checked.
- Unmatched question: HTTP 200 in 0.04 seconds, zero listings and a plain-English
  explanation. No invented fallback results.
- Public health check: HTTP 200 with private-beta mode enabled.
- Unauthenticated local-context request: HTTP 401.

The two authenticated probes used the same public Manchester test area and consumed
two request units. Neither used the user's GPS or invoked OpenAI. End-to-end testing
from the user's phone remains separate from these hosted API checks.
