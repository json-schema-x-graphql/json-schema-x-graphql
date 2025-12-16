import { convertSchema } from './src/lib/converter.js';
(async () => {
  const schema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'User',
    type: 'object',
    properties: {
      id: { type: 'string', description: 'User ID' },
      name: { type: 'string' },
    },
    required: ['id'],
  };
  try {
    const result = await convertSchema(schema);
    console.log('RESULT:', result);
  } catch (e) {
    console.error('THROWN:', e);
  }
})();
