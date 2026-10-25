import { describe, expect, it } from 'vitest';
import { initialCamera } from '../models/sky.constants';
import { camBasis, toCam } from './celestial.util';
import { SkyCamera } from './sky-camera.util';
import { projectStereo, stereographicParams, unprojectStereo } from './sky-projection.util';

describe('SkyCamera', () => {
  it('eases toward its targets over time', () => {
    const cam = new SkyCamera(initialCamera());
    cam.lookAt(10, 90);
    for (let i = 0; i < 120; i++) cam.update(1 / 60);
    expect(cam.state.heading).toBeCloseTo(90, 3);
    expect(cam.state.pitch).toBeCloseTo(10, 3);
  });

  it('keeps the sky under the cursor fixed while zooming', () => {
    const state = initialCamera();
    const cam = new SkyCamera(state);
    const view = { width: 1600, height: 900, fovDeg: state.fov };
    const params = stereographicParams(view);
    const cursor = { x: 1200, y: 300 };
    // Direction under the cursor before the zoom.
    const cp = unprojectStereo(cursor.x, cursor.y, params);
    const b = camBasis(state.tHeading, state.tPitch);
    const enu = {
      x: b.right.x * cp.cx + b.up.x * cp.cy + b.fwd.x * cp.cz,
      y: b.right.y * cp.cx + b.up.y * cp.cy + b.fwd.y * cp.cz,
      z: b.right.z * cp.cx + b.up.z * cp.cy + b.fwd.z * cp.cz,
    };
    cam.zoomAt(0.6, cursor, params, view.height);
    cam.snap();
    const after = stereographicParams({ ...view, fovDeg: cam.state.fov });
    const p = projectStereo(toCam(enu, camBasis(cam.state.heading, cam.state.pitch)), after);
    expect(p).not.toBeNull();
    expect(Math.abs(p!.x - cursor.x)).toBeLessThan(1.5);
    expect(Math.abs(p!.y - cursor.y)).toBeLessThan(1.5);
  });

  it('does not drift sideways when many small zoom steps arrive while easing', () => {
    const state = initialCamera();
    const cam = new SkyCamera(state);
    const view = { width: 1600, height: 900, fovDeg: state.fov };
    const cursor = { x: 1200, y: 300 };
    const h0 = cam.state.tHeading;
    const p0 = cam.state.tPitch;
    const fov0 = cam.state.tFov;
    // Trackpad-like: 40 tiny steps, easing only partially catching up between them.
    for (let i = 0; i < 40; i++) {
      const params = stereographicParams({ ...view, fovDeg: cam.state.fov });
      cam.zoomAt(0.985, cursor, params, view.height);
      cam.update(1 / 120);
    }
    // Zooming toward a point ~54° off-axis legitimately turns the camera toward it (~40°),
    // but must never swing past it or oscillate; and the FOV must actually shrink.
    const dh = ((cam.state.tHeading - h0 + 540) % 360) - 180;
    expect(dh).toBeGreaterThan(0);
    expect(dh).toBeLessThan(50);
    expect(Math.abs(cam.state.tPitch - p0)).toBeLessThan(30);
    expect(cam.state.tFov).toBeLessThan(fov0 * 0.6);
    // Same drive with the eased and target FOV identical (no lag) lands within a few degrees of this.
    const ref = new SkyCamera(initialCamera());
    for (let i = 0; i < 40; i++) {
      ref.snap();
      ref.zoomAt(0.985, cursor, stereographicParams({ ...view, fovDeg: ref.state.fov }), view.height);
    }
    const dhRef = ((ref.state.tHeading - h0 + 540) % 360) - 180;
    expect(Math.abs(dh - dhRef)).toBeLessThan(4);
  });

  it('coasts after a fling and comes to rest', () => {
    const cam = new SkyCamera(initialCamera());
    const params = stereographicParams({ width: 1600, height: 900, fovDeg: 100 });
    const h0 = cam.state.tHeading;
    cam.fling(-800, 0, params);
    for (let i = 0; i < 300; i++) cam.update(1 / 60);
    const moved = ((cam.state.tHeading - h0 + 540) % 360) - 180;
    expect(moved).toBeGreaterThan(5);
    const h1 = cam.state.tHeading;
    cam.update(1 / 60);
    expect(cam.state.tHeading).toBeCloseTo(h1, 6);
  });
});
