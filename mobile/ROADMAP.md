# Rheo mobile pathway roadmap

The mobile product should progressively test a specific proposition: **does knowing where the user is make viable reciprocal pathways more visible and more traversable without making Rheo intrusive, coercive or merely localist?**

## v0.1 — Decision-local context

Implemented on `mobile-rheo-geolocated-context`:

- foreground opt-in location;
- neighbourhood-level coordinate reduction;
- bounded local search only when the user requests it;
- provenance-labelled local candidates;
- local candidates enter the existing Rheo case record as evidence;
- no background tracking;
- no saved movement history;
- no map requirement;
- app remains usable without location.

Success criterion: local context occasionally changes or sharpens a practical action because a real nearby affordance is visible that would otherwise be missed.

## v0.2 — Better local evidence

Replace the first keyword/Nominatim prototype with a provider broker that can issue structured evidence requests such as:

- repair/reuse services and current opening/booking constraints;
- public transport and demand-responsive transport;
- council/community facilities and public service directories;
- cooperatives/community-owned assets;
- training/equipment access;
- food producers/markets;
- current events or temporary opportunities;
- environmental restrictions or stewardship opportunities.

Every item should carry source, retrieval time, uncertainty and, where possible, live availability.

Success criterion: local evidence is sufficiently current and specific that Rheo can distinguish a real affordance from a nominal nearby listing.

## v0.3 — Outcome loop and pathway memory

After a user chooses an action, allow them to record what they actually did and what happened.

Store pathway observations only with explicit consent, for example:

- was the option actually accessible/open/affordable?
- what hidden burden appeared?
- did it solve the immediate problem?
- did a relationship/capability remain afterwards?
- would the user or someone else find the pathway easier next time?

Separate private personal history from any community-shared pathway evidence.

Success criterion: subsequent decisions improve because Rheo learns which apparent local affordances are genuinely traversable.

## v0.4 — Parallel-infrastructure map

Only after pathway evidence has value, introduce mapping.

The map should not simply show businesses. It should visualise **tested reciprocal pathways and connections**, for example:

- repair → parts source → reuse outlet;
- local producer → retailer → shared delivery route;
- community venue → shared listings → accessible transport;
- skills provider → shared equipment → local enterprise.

Possible visual signals:

- observed traversal count;
- recency of evidence;
- accessibility/burden caveats;
- connection to other pathways;
- whether use appears to lower future coordination cost.

Do not represent a popularity count as proof of reciprocal wellbeing.

## v0.5 — Critical-mass indicators

Treat critical mass as an empirical network hypothesis, not a slogan.

Candidate indicators might include:

- repeated successful traversal by independent users;
- growing number of complementary nodes;
- declining coordination/search cost;
- reduced dependence on a single incumbent route;
- increased distributed capability;
- improved resilience when one node fails;
- pathways remaining viable without heroic organisers or hidden subsidy.

These indicators should initially be descriptive. Do not turn them into a single RWB score without separate validation.

## Product principle

**Rheo should not push a user toward an alternative because it is alternative. It should make a viable pathway visible, test its reciprocal viability, and leave the choice with the user.**
