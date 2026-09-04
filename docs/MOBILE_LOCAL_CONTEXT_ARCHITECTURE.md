# Rheo mobile local-context architecture v0.1

Status: **product prototype — separate from the frozen research benchmark**

## Product hypothesis

Location should not make Rheo a generic nearby-places recommender. It should make locally available **affordances** visible when they can materially change a decision.

The intended chain is:

**testimony / decision → optional foreground location → decision-relevant local search → provenance-labelled candidate affordances → Rheo reciprocal map → three practical actions → human choice → outcome learning**

A nearby result is evidence, not a recommendation. Rheo must still ask whether the option is actually usable, sustainable and appropriate for the person's immediate predicament.

## Privacy boundary

v0.1 follows a data-minimising default:

- location is requested only after an explicit user action;
- foreground permission only; no background tracking or geofencing;
- the device rounds latitude/longitude to three decimal places before sending them to the local-context service;
- the main Rheo decision record receives the human-readable area label and returned candidate evidence, not the coordinates used for the place lookup;
- the prototype local-context service does not persist requests or coordinates;
- the app remains usable without location.

Three-decimal coordinates are an implementation-level privacy reduction, not an anonymity guarantee. A production privacy review should decide whether coarser cells, on-device search, short-lived server tokens or another scheme is preferable.

## Service split

### Rheo server

Existing v0.9 endpoints remain unchanged:

- `POST /api/rheo-flow`
- `POST /api/rheo-actions`

This is deliberate: mobile product work should not mutate the research-tested decision server merely to support geolocation.

### Local-context service

Prototype endpoint:

- `POST /api/local-context`

Input:

```json
{
  "decisionText": "My washing machine has broken...",
  "location": {
    "latitude": 51.745,
    "longitude": -2.217,
    "areaLabel": "Stroud, Gloucestershire, United Kingdom",
    "precision": "neighbourhood"
  },
  "radiusM": 5000
}
```

Output contains:

- provider and attribution;
- search terms inferred from the decision;
- a bounded set of candidate places/resources;
- distance/address/source/provenance;
- a plain-language statement of why each candidate entered the context;
- warnings about uncertainty/staleness.

## Provider model

`LOCAL_CONTEXT_PROVIDER=fixture` is the default. It returns **no invented real places** and is safe for plumbing tests.

`LOCAL_CONTEXT_PROVIDER=nominatim` is an explicitly configured low-volume prototype adapter. It requires:

- `NOMINATIM_USER_AGENT` identifying the application/operator;
- sequential requests with >1 second spacing;
- in-memory caching;
- visible OpenStreetMap attribution;
- user-triggered, bounded queries only;
- a configurable `NOMINATIM_BASE_URL` so the service can be switched without a mobile software release.

The public OSMF Nominatim service must not be treated as production infrastructure for a scaled app. Before public release use a paid provider, a self-hosted service, or another provider whose licence and availability fit expected traffic.

## Query planning

The first prototype deliberately uses a small deterministic decision-to-query planner. Examples:

- appliance failure → appliance repair / repair café / laundrette;
- commuting pressure → bicycle repair / cycle shop / bus station;
- food supply → farm shop / greengrocer / bakery;
- equipment access → makerspace / college / adult education centre.

This is intentionally narrow. When the planner cannot derive a relevant category, it returns no local candidates rather than broadening into generic recommendations.

A later version can use a model to produce structured local-information requests, but those requests should remain bounded by category, radius, recency and evidence need rather than becoming unconstrained web search.

## Candidate evidence is not pathway value

The local layer answers only **what may exist nearby**. Rheo still needs to test:

1. Is it open/available on the relevant timescale?
2. Can the user actually access it physically, financially, socially and technologically?
3. Does choosing it solve enough of the immediate problem?
4. Who bears labour, cost, maintenance and risk?
5. Is it regenerative or does it merely transfer depletion elsewhere?
6. Does use leave something reusable — relationship, competence, access, protocol, demand, shared capability?
7. Could repeated traversal make this pathway easier for the user or others next time?
8. What would falsify its claimed usefulness?

This is where local information connects to the Rheocratic transition hypothesis.

## Future local-context sources

The provider interface should eventually combine multiple evidence classes rather than rely on one place database:

- businesses/services and opening hours;
- public transport and demand-responsive mobility;
- council/public-service directories and open data;
- repair/reuse/circular-economy networks;
- cooperatives, community-owned assets and mutual-support infrastructure;
- training, libraries, colleges, makerspaces and equipment access;
- food producers, markets and distribution routes;
- environmental constraints and stewardship opportunities;
- current events, workshops and temporary opportunities;
- user/community-contributed pathway observations with moderation and provenance.

Each returned item should carry provider, retrieval time, source identity and uncertainty sufficient for the decision engine to distinguish observation from inference.

## Map later, not first

A map is useful once the product has demonstrated that geolocation materially improves decisions. v0.1 deliberately presents local candidates as evidence cards rather than adding map complexity. The priority is to validate the causal chain:

**location → better evidence → different/better practical pathway → user action/outcome**.

Only then should map browsing, saved pathways, route overlays or critical-mass visualisation become core UI.

## Research/product separation

The mobile branch may use lessons from v1.1 but must not be used to tune the frozen benchmark after confirmatory generation. Conversely, production usage can later become a source of prospective field hypotheses only with explicit consent, privacy controls and a separate research protocol.
