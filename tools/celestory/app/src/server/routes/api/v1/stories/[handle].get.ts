export default defineEventHandler(async (event) => {
  const handle = getRouterParam(event, 'handle');
  return { code: 'OK', message: 'Story found', details: { handle, ledger: {} } };
});
