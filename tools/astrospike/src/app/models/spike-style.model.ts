/**
 * How a star's light is embellished.
 *
 * - `spikes` draws diffraction arms plus a small core glow, the look a spider
 *   vane gives a reflector.
 * - `glow` draws only a soft bloom, the look a diffusion filter gives a
 *   camera lens — the wide-field technique that makes constellations readable
 *   in a Milky Way frame, where arms would look wrong.
 *
 * A preset sets the style for the whole image and any single star can be told
 * to differ, so one frame can bloom its star field and spike a chosen few.
 */
export type SpikeStyle = 'spikes' | 'glow';
