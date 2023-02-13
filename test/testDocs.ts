// Utility methods for calling the SRI interface

module.exports = function (httpClient) {
  describe('Docs', () => {

    it('should return general API documentation', async () => {
      await httpClient.get({ path:'/docs' });
    });

    it('should return persons documentation', async () => {
      await httpClient.get({ path:'/persons/docs' });
    });

    it('should return alldatatypes documentation', async () => {
      await httpClient.get({ path:'/alldatatypes/docs' });
    });

    it('should return communities documentation', async () => {
      await httpClient.get({ path:'/communities/docs' });
    });

    it('should return jsonb documentation', async () => {
      await httpClient.get({ path:'/jsonb/docs' });
    });

    it('should return messages documentation', async () => {
      await httpClient.get({ path:'/messages/docs' });
    });

    it('should return selfreferential documentation', async () => {
      await httpClient.get({ path:'/selfreferential/docs' });
    });

    it('should return table documentation', async () => {
      await httpClient.get({ path:'/table/docs' });
    });

    it('should return transactions documentation', async () => {
      await httpClient.get({ path:'/transactions/docs' });
    });
  });
};
