export default defineEventHandler(async (event) => {
  return { code: 'OK', message: 'Stats', details: { totalCommunityHours: 0, storyCount: 0 } };
});
