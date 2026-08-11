// Preserve user-defined property names while removing unsupported schema metadata.
// In particular, a property literally named `description` must not be mistaken
// for the JSON Schema `description` annotation.
export function strictOutputSchema(source) {
  function walk(value, context = 'schema') {
    if (Array.isArray(value)) return value.map(v => walk(v, 'schema'));
    if (!value || typeof value !== 'object') return value;

    if (context === 'properties') {
      const props = {};
      for (const [propertyName, propertySchema] of Object.entries(value)) {
        props[propertyName] = walk(propertySchema, 'schema');
      }
      return props;
    }

    const out = {};
    for (const [key, child] of Object.entries(value)) {
      if (['$schema', '$id', 'title', 'description'].includes(key)) continue;
      if (key === 'const') {
        out.enum = [child];
        continue;
      }
      if (key === 'properties') {
        out[key] = walk(child, 'properties');
        continue;
      }
      out[key] = walk(child, 'schema');
    }
    return out;
  }
  return walk(source, 'schema');
}
