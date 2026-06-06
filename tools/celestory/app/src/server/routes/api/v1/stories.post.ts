export default defineEventHandler(async (event) => {
  return { code: 'CREATED', message: 'Story created', details: { url: '/demo', key: 'demo-key' } };
});
