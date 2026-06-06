export default defineEventHandler(async (event) => {
  const handle = getRouterParam(event, 'handle');
  return { code: 'DELETED', message: 'Story deleted', details: {} };
});
