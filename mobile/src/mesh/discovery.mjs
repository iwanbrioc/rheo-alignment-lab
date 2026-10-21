export const needTopics = [
  {
    id: "food",
    label: "Food",
    words: ["food", "meal", "kitchen", "bread", "vegetable", "pantry"],
  },
  { id: "water", label: "Water", words: ["water", "drinking", "refill"] },
  {
    id: "warmth",
    label: "Warmth",
    words: ["warmth", "warm", "blanket", "heating", "clothing"],
  },
  {
    id: "shelter",
    label: "Shelter",
    words: ["shelter", "accommodation", "bed", "housing", "refuge"],
  },
  {
    id: "care",
    label: "Care",
    words: [
      "care",
      "caring",
      "listening",
      "support",
      "medicine",
      "medical",
      "first aid",
    ],
  },
  {
    id: "garden",
    label: "Gardens & nature",
    category: "Nature",
    words: ["garden", "growing", "nature", "seed"],
  },
  {
    id: "company",
    label: "People & company",
    category: "Belonging",
    words: ["circle", "company", "neighbour", "neighbor", "meet"],
  },
  {
    id: "creative",
    label: "Arts & music",
    category: "Creativity",
    words: ["open mic", "music", "art", "sing", "poetry"],
  },
  {
    id: "skills",
    label: "Skills & tools",
    category: "Learning",
    words: ["repair", "skill", "tool", "learn", "workshop"],
  },
];
export function distanceKm(a, b) {
  if (!a || !b) return null;
  const rad = (value) => (value * Math.PI) / 180;
  const lat = rad(b.latitude - a.latitude),
    lon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(lat / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(lon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
export function findPortals(
  state,
  { query = "", topic = null, position = null, includeExamples = false } = {},
) {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const chosen = needTopics.find((t) => t.id === topic);
  return state.portals
    .filter((p) => includeExamples || !p.demo)
    .map((portal) => {
      const name = portal.name.toLocaleLowerCase();
      const text =
        `${name} ${portal.description} ${portal.steward}`.toLocaleLowerCase();
      const topicMatch =
        !chosen ||
        portal.category === chosen.category ||
        chosen.words.some((word) =>
          new RegExp(`\\b${word}(?:s|es)?\\b`, "i").test(text),
        );
      const matches = topicMatch && terms.every((term) => text.includes(term));
      const relevance = terms.reduce(
        (sum, term) => sum + (name.includes(term) ? 2 : 1),
        0,
      );
      return {
        portal,
        matches,
        relevance,
        distance: portal.demo ? null : distanceKm(position, portal.location),
      };
    })
    .filter((item) => item.matches)
    .sort(
      (a, b) =>
        b.relevance - a.relevance ||
        (position ? (a.distance ?? Infinity) - (b.distance ?? Infinity) : 0) ||
        a.portal.name.localeCompare(b.portal.name),
    );
}
