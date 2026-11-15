import { Scene3dSettings } from '../models/scene3d-settings.model';
import { Video2dSettings } from '../models/video-settings.model';
import { videoSettings2d, videoSettings3d } from './video-settings.util';

/** The 2D settings the app opens with. */
const OPENING_2D: Video2dSettings = {
  direction: 'forward',
  rotation: 3,
  hasStars: true,
  hasShootingStars: true,
};

/** A 3D Travel shot; specs override what they need. */
const TRAVEL: Scene3dSettings = {
  style: 'travel',
  direction: 'left',
  aim: { x: 0, y: 0 },
  starStyle: 'original',
  zoomIn: true,
  starsReturn: true,
  speed: 5,
  rotation: 0,
  cloudDepth: 5,
  starAmount: 100,
  starSize: 1,
  starDepth: 5,
  spikes: 0,
  twinkle: 0,
};

describe('videoSettings2d', () => {
  it('should describe the clip the app makes when nothing is changed', () => {
    expect(videoSettings2d(OPENING_2D)).toEqual({
      starwizz_mode: '2d',
      starwizz_direction: 'forward',
      starwizz_rotation: 'clockwise',
      starwizz_stars: 'on',
      starwizz_shooting_stars: 'on',
    });
  });

  it('should report which way the view turns, or that it does not', () => {
    expect(videoSettings2d({ ...OPENING_2D, rotation: -8 })['starwizz_rotation']).toBe('anticlockwise');
    expect(videoSettings2d({ ...OPENING_2D, rotation: 0 })['starwizz_rotation']).toBe('off');
    expect(videoSettings2d({ ...OPENING_2D, direction: 'backward' })['starwizz_rotation']).toBe('clockwise');
  });

  it('should report no rotation for directions that never turn the view', () => {
    expect(videoSettings2d({ ...OPENING_2D, direction: 'left' })['starwizz_rotation']).toBe('off');
    expect(videoSettings2d({ ...OPENING_2D, direction: 'path' })['starwizz_rotation']).toBe('off');
  });

  it('should report no shooting stars when the Stars switch removed them', () => {
    const settings = videoSettings2d({ ...OPENING_2D, hasStars: false });

    expect(settings['starwizz_stars']).toBe('off');
    expect(settings['starwizz_shooting_stars']).toBe('off');
    expect(videoSettings2d({ ...OPENING_2D, hasShootingStars: false })['starwizz_shooting_stars']).toBe('off');
  });
});

describe('videoSettings3d', () => {
  it('should describe a Travel shot with its direction and nothing Arrive-only', () => {
    expect(videoSettings3d(TRAVEL)).toEqual({
      starwizz_mode: '3d',
      starwizz_style: 'travel',
      starwizz_direction: 'left',
      starwizz_rotation: 'off',
      starwizz_sharp_stars: 'off',
    });
  });

  it('should describe an Arrive shot with its switches and no direction', () => {
    const settings = videoSettings3d({ ...TRAVEL, style: 'arrive', zoomIn: false, starsReturn: true });

    expect(settings).toEqual({
      starwizz_mode: '3d',
      starwizz_style: 'arrive',
      starwizz_rotation: 'off',
      starwizz_sharp_stars: 'off',
      starwizz_zoom_in: 'off',
      starwizz_stars_return: 'on',
    });
  });

  it('should report Sharp Stars and the way the view turns', () => {
    const settings = videoSettings3d({ ...TRAVEL, starStyle: 'sharp', rotation: -4 });

    expect(settings['starwizz_sharp_stars']).toBe('on');
    expect(settings['starwizz_rotation']).toBe('anticlockwise');
  });
});
