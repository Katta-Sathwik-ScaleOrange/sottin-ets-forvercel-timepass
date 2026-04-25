let typesenseClient = null;

try {
  const Typesense = require('typesense');
  if (process.env.TYPESENSE_HOST && process.env.TYPESENSE_API_KEY) {
    typesenseClient = new Typesense.Client({
      nodes: [{
        host: process.env.TYPESENSE_HOST,
        port: parseInt(process.env.TYPESENSE_PORT || '8108'),
        protocol: 'http',
      }],
      apiKey: process.env.TYPESENSE_API_KEY,
      connectionTimeoutSeconds: 2,
    });
  }
} catch (e) {
  console.warn('Typesense not configured');
}

exports.searchTypesense = async (collection, query) => {
  if (!typesenseClient) return [];

  try {
    const result = await typesenseClient.collections(collection)
      .documents()
      .search({
        q: query,
        query_by: 'name,short_name,aliases',
        per_page: 5,
      });

    return result.hits.map((hit) => hit.document);
  } catch (e) {
    console.warn('Typesense search failed:', e.message);
    return [];
  }
};

exports.indexOffice = async (office) => {
  if (!typesenseClient) return;

  try {
    await typesenseClient.collections('offices')
      .documents()
      .upsert({
        id: office.id,
        name: office.name,
        short_name: office.short_name || '',
        aliases: office.aliases || [],
        area: office.area,
        lat: office.lat,
        lng: office.lng,
      });
  } catch (e) {
    console.warn('Typesense index failed:', e.message);
  }
};
