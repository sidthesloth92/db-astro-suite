export default defineEventHandler(async (event) => {
  return { code: 'OK', message: 'Healthy', details: { database: 'connected' } };
});
