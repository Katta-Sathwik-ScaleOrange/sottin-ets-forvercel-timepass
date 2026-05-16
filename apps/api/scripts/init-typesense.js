require('dotenv').config();
const Typesense = require('typesense');

async function init() {
  if (!process.env.TYPESENSE_API_KEY) {
    console.error('TYPESENSE_API_KEY is not set');
    process.exit(1);
  }

  const client = new Typesense.Client({
    nodes: [{
      host: process.env.TYPESENSE_HOST || 'localhost',
      port: parseInt(process.env.TYPESENSE_PORT || '8108'),
      protocol: 'http',
    }],
    apiKey: process.env.TYPESENSE_API_KEY,
    connectionTimeoutSeconds: 5,
  });

  const schema = {
    name: 'offices',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'short_name', type: 'string', optional: true },
      { name: 'aliases', type: 'string[]', optional: true },
      { name: 'area', type: 'string' },
      { name: 'selection_count', type: 'int32' },
      { name: 'verified', type: 'bool' },
    ],
    default_sorting_field: 'selection_count',
  };

  try {
    console.log('Deleting existing collection "offices"...');
    await client.collections('offices').delete();
  } catch (e) {
    // Ignore if doesn't exist
  }

  try {
    console.log('Creating collection "offices"...');
    await client.collections().create(schema);
    console.log('Success!');
  } catch (e) {
    console.error('Error creating collection:', e.message);
  }
}

init();
