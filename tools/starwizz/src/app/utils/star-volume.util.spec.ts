import { GROWTH_CAP, VOLUME_MARGIN } from '../constants/scene3d.constant';
import { FrameView } from '../models/scene-pose.model';
import { seededRandom } from './seeded-random.util';
import {
  depthGrowth,
  inflowFlux,
  isOutsideVolume,
  sampleDepth,
  sampleInflow,
} from './star-volume.util';

const VIEW: FrameView = { tanX: 0.28, tanY: 0.5, imageAspect: 0.5625 };
const NEAR = 0.035;
const FAR = 0.625;

describe('star volume util', () => {
  describe('sampleDepth', () => {
    it('should span exactly near to far', () => {
      expect(sampleDepth(0, NEAR, FAR)).toBeCloseTo(NEAR, 9);
      expect(sampleDepth(1, NEAR, FAR)).toBeCloseTo(FAR, 9);
    });

    it('should put most stars far away, where the view cone holds more space', () => {
      expect(sampleDepth(0.5, NEAR, FAR)).toBeGreaterThan(0.75 * FAR);
    });
  });

  describe('depthGrowth', () => {
    it('should be one at the far limit and grow as a star nears', () => {
      expect(depthGrowth(FAR, FAR)).toBeCloseTo(1, 9);
      expect(depthGrowth(FAR / 4, FAR)).toBeCloseTo(2, 9);
    });

    it('should stop growing at the cap so near stars never balloon', () => {
      expect(depthGrowth(FAR / 1000, FAR)).toBe(GROWTH_CAP);
    });
  });

  describe('isOutsideVolume', () => {
    it('should keep points inside the frame and its margin', () => {
      expect(isOutsideVolume(0, 0, 0.3, VIEW, NEAR, FAR)).toBeFalse();
      expect(isOutsideVolume(VIEW.tanX * 0.3 * 1.1, 0, 0.3, VIEW, NEAR, FAR)).toBeFalse();
    });

    it('should reject points past the margin, behind the near limit or beyond the far limit', () => {
      expect(isOutsideVolume(VIEW.tanX * 0.3 * (VOLUME_MARGIN + 0.05), 0, 0.3, VIEW, NEAR, FAR)).toBeTrue();
      expect(isOutsideVolume(0, 0, NEAR / 2, VIEW, NEAR, FAR)).toBeTrue();
      expect(isOutsideVolume(0, 0, FAR * 1.01, VIEW, NEAR, FAR)).toBeTrue();
    });
  });

  describe('inflowFlux', () => {
    it('should bring every star in through the far cap when flying straight ahead', () => {
      const [far, near, right, left, top, bottom] = inflowFlux({ x: 0, y: 0, z: -1 }, VIEW, NEAR, FAR);
      expect(far).toBeGreaterThan(0);
      expect([near, right, left, top, bottom]).toEqual([0, 0, 0, 0, 0]);
    });

    it('should bring stars in from the side the camera is moving toward', () => {
      const movingRight = inflowFlux({ x: 1, y: 0, z: 0 }, VIEW, NEAR, FAR);
      expect(movingRight[2]).toBeGreaterThan(0); // right face
      expect(movingRight[3]).toBe(0); // left face
      const movingUp = inflowFlux({ x: 0, y: 1, z: 0 }, VIEW, NEAR, FAR);
      expect(movingUp[4]).toBeGreaterThan(0);
      expect(movingUp[5]).toBe(0);
    });

    it('should bring stars in through the sides and the near cap when pulling back', () => {
      const [far, near, right, left, top, bottom] = inflowFlux({ x: 0, y: 0, z: 1 }, VIEW, NEAR, FAR);
      expect(far).toBe(0);
      expect(near).toBeGreaterThan(0);
      expect(Math.min(right, left, top, bottom)).toBeGreaterThan(0);
    });
  });

  describe('sampleInflow', () => {
    it('should place far-cap arrivals at the far limit, inside the volume, fading in', () => {
      const random = seededRandom(3);
      const flux = inflowFlux({ x: 0, y: 0, z: -1 }, VIEW, NEAR, FAR);
      for (let i = 0; i < 50; i++) {
        const p = sampleInflow(flux, VIEW, NEAR, FAR, random);
        expect(p.depth).toBeCloseTo(FAR, 2);
        expect(p.fadeIn).toBeTrue();
        expect(isOutsideVolume(p.x, p.y, p.depth, VIEW, NEAR, FAR)).toBeFalse();
      }
    });

    it('should place side arrivals in the unseen margin on the upstream side', () => {
      const random = seededRandom(5);
      const flux = inflowFlux({ x: 1, y: 0, z: 0 }, VIEW, NEAR, FAR);
      for (let i = 0; i < 50; i++) {
        const p = sampleInflow(flux, VIEW, NEAR, FAR, random);
        expect(p.fadeIn).toBeFalse();
        expect(p.x).toBeGreaterThan(VIEW.tanX * p.depth); // beyond the visible frame edge
        expect(isOutsideVolume(p.x, p.y, p.depth, VIEW, NEAR, FAR)).toBeFalse();
      }
    });

    it('should favour deeper entry points on a side face, which is wider far away', () => {
      const random = seededRandom(9);
      const flux = inflowFlux({ x: 1, y: 0, z: 0 }, VIEW, NEAR, FAR);
      let deep = 0;
      for (let i = 0; i < 400; i++) {
        if (sampleInflow(flux, VIEW, NEAR, FAR, random).depth > FAR / 2) deep++;
      }
      expect(deep).toBeGreaterThan(250);
    });
  });
});
