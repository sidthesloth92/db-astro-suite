import { VideoSettings } from '@db-astro-suite/ui';
import { Scene3dSettings } from '../models/scene3d-settings.model';
import { Video2dSettings } from '../models/video-settings.model';

/** A switch as analytics reports it. */
function onOff(isOn: boolean): string {
  return isOn ? 'on' : 'off';
}

/** Which way a rotation setting turns the view, as analytics reports it. */
function turnOf(rotation: number): string {
  if (rotation === 0) {
    return 'off';
  }
  return rotation > 0 ? 'clockwise' : 'anticlockwise';
}

/**
 * What a 2D clip was made with, for the video analytics event. Each value is what the clip
 * actually shows, not just where a control sits: 2D only turns while flying forward or backward,
 * and the master Stars switch also removes the shooting stars.
 *
 * @param settings - The 2D settings when the recording was saved
 */
export function videoSettings2d(settings: Video2dSettings): VideoSettings {
  const isTurning = settings.direction === 'forward' || settings.direction === 'backward';
  return {
    starwizz_mode: '2d',
    starwizz_direction: settings.direction,
    starwizz_rotation: isTurning ? turnOf(settings.rotation) : 'off',
    starwizz_stars: onOff(settings.hasStars),
    starwizz_shooting_stars: onOff(settings.hasStars && settings.hasShootingStars),
  };
}

/**
 * What a 3D clip was made with, for the video analytics event. Settings that only one style
 * uses are sent only for that style: the direction for Travel, Zoom In and Stars Return for
 * Arrive.
 *
 * @param settings - The 3D settings when the recording was saved
 */
export function videoSettings3d(settings: Scene3dSettings): VideoSettings {
  const shared = {
    starwizz_mode: '3d',
    starwizz_style: settings.style,
    starwizz_rotation: turnOf(settings.rotation),
    starwizz_sharp_stars: onOff(settings.starStyle === 'sharp'),
  };
  if (settings.style === 'travel') {
    return { ...shared, starwizz_direction: settings.direction };
  }
  return {
    ...shared,
    starwizz_zoom_in: onOff(settings.zoomIn),
    starwizz_stars_return: onOff(settings.starsReturn),
  };
}
