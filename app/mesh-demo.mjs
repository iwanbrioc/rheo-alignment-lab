/** Fictional data, deliberately separate from signed device records and exports. */
export function demoOffers() {
  const future = new Date(Date.now() + 7 * 86400000).toISOString();
  const entries = [
    ['garden', 'Grow food, share a harvest', 'Nature', 52.044, -4.311, 'Illustrative community garden', 'Learn seasonal growing alongside neighbours. Bring curiosity; tools and a shared plot are available.', 'Shared harvest, healthy soil and a place to belong.', 'Return tools clean. Leave habitat edges undisturbed. Compost plant waste.', 'open', [], 'Garden circle'],
    ['repair', 'Give a bicycle another life', 'Learning', 52.042, -4.314, 'Illustrative repair workshop', 'Work alongside a neighbour to learn puncture repair and basic maintenance.', 'Build practical confidence and keep useful things in circulation.', 'Replenish consumables when possible. Pass on what you learn.', 'ask', [], 'Repair circle'],
    ['meal', 'A seat at the shared table', 'Essentials', 52.040, -4.310, 'Illustrative village kitchen', 'A nourishing meal and company. Receiving a meal does not require a contribution or prior endorsement.', 'Food, dignity and connection.', 'Keep access welcoming. Separate food scraps and replenish ingredients collectively.', 'open', [], 'Kitchen circle'],
    ['music', 'Make music with someone new', 'Creativity', 52.046, -4.308, 'Illustrative gathering room', 'An open acoustic session. Listen, bring an instrument, sing, or simply be present.', 'Expression, play and a shared cultural life.', 'Respect quiet hours. Care for shared instruments.', 'open', [], 'Music circle'],
    ['walk', 'Walk, listen, reconnect', 'Belonging', 52.039, -4.317, 'Illustrative riverside meeting point', 'A gentle walk with space for conversation and silence. Agree a route that suits everyone.', 'Companionship and re-enchantment with the living world.', 'Leave no litter. Avoid disturbing nesting areas.', 'ask', [], 'Walking circle'],
    ['habitat', 'Help restore a living riverbank', 'Purpose', 52.048, -4.315, 'Illustrative habitat project', 'Join a locally guided restoration session. Learn before acting; landowner permission and ecological guidance matter.', 'Make a tangible contribution to a place that sustains us.', 'Follow ecological guidance and seasonal restrictions. Review effects over time.', 'ask', ['Ecological guidance and landowner permission'], 'River circle']
  ];
  return entries.map(([id, title, category, lat, lon, label, description, purpose, care, access, needs, steward]) => ({
    id: 'demo-' + id, title, category, location: { lat, lon, label }, description, purpose, care, access, needs, steward,
    conditions: access === 'ask' ? 'Arrange participation with the steward. This is an illustrative invitation, not a real service.' : 'Open under the stated care conditions. This is fictional; do not travel to this location.',
    capacity: 6, expires: future, status: 'active', visibility: 'private', actor: 'illustrative-steward', revision: 'demo-' + id,
    dependencies: [], heads: ['demo-' + id], conflict: false, withdrawn: false, current: [], evidence: [], updatedAt: new Date().toISOString(), demo: true
  }));
}
