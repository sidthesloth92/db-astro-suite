import { makePhoto } from '../../testing/synthetic-photo.util';
import { PATCH_STRIDE } from '../constants/star-lift.constant';
import { answerStarLiftRequest, isStarLiftRequest } from './star-lift-message.util';

const W = 120;
const H = 100;

/** A valid request carrying a photo with one star. */
function request(): { type: 'lift'; generationId: number; width: number; height: number; pixels: ArrayBuffer } {
  const pixels = makePhoto(W, H, [0.05, 0.05, 0.05], [{ x: 60, y: 50, amp: 0.6, sigma: 2 }]);
  // Justification for the cast: makePhoto allocates a plain, non-shared ArrayBuffer.
  return { type: 'lift', generationId: 7, width: W, height: H, pixels: pixels.buffer as ArrayBuffer };
}

describe('star-lift worker messages', () => {
  describe('isStarLiftRequest', () => {
    it('should accept a complete request', () => {
      expect(isStarLiftRequest(request())).toBeTrue();
    });

    it('should reject anything that is not a complete request', () => {
      expect(isStarLiftRequest(null)).toBeFalse();
      expect(isStarLiftRequest('lift')).toBeFalse();
      expect(isStarLiftRequest({ ...request(), type: 'detect' })).toBeFalse();
      expect(isStarLiftRequest({ ...request(), pixels: [1, 2, 3] })).toBeFalse();
      expect(isStarLiftRequest({ ...request(), width: '120' })).toBeFalse();
    });

    it('should reject a request whose pixel buffer does not match its size', () => {
      expect(isStarLiftRequest({ ...request(), width: W + 1 })).toBeFalse();
    });
  });

  describe('answerStarLiftRequest', () => {
    it('should ignore a message that is not a request', () => {
      expect(answerStarLiftRequest({ hello: 'world' })).toBeNull();
    });

    it('should answer a request with the lifted scene, echoing its generation id', () => {
      const answer = answerStarLiftRequest(request());
      expect(answer?.response.type).toBe('result');
      expect(answer?.response.generationId).toBe(7);
      if (answer?.response.type === 'result') {
        expect(answer.response.scene.width).toBe(W);
        expect(answer.response.scene.patches.length).toBe(PATCH_STRIDE);
      }
    });

    it('should hand over every buffer of the scene instead of copying it', () => {
      const answer = answerStarLiftRequest(request());
      expect(answer?.transfer.length).toBe(7);
      if (answer?.response.type === 'result') {
        expect(answer.transfer).toContain(answer.response.scene.starless.buffer);
        expect(answer.transfer).toContain(answer.response.scene.atlas.buffer);
      }
    });
  });
});
