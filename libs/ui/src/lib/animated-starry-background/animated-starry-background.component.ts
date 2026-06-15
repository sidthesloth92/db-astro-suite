import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import {
  CLUSTER_MAX_NODES,
  CLUSTER_MIN_NODES,
  CLUSTER_WIDTH_DIVISOR,
  MAX_STARS,
  RESIZE_DEBOUNCE_MS,
  STAR_DENSITY,
} from './starfield.constants';
import type { Constellation, ConstellationNode, Star } from './starfield.model';

const TWO_PI = Math.PI * 2;

/**
 * Full-bleed animated star-field wrapper. A fixed `<canvas>` backdrop paints two
 * layers behind the projected children:
 *  1. an ambient field of softly twinkling, slowly drifting stars, and
 *  2. a few constellations — networks of faint lines whose vertices are either
 *     dim dots or glowing sparkle-stars (neon-pink with a ring, or cyan glow),
 *     gently pulsing and oscillating.
 *
 * Colours resolve from the theme tokens (`--db-color-*`). SSR-safe — all canvas
 * work is scheduled with `afterNextRender` (browser only); honours
 * `prefers-reduced-motion` with a single static frame; cancels the animation
 * and removes listeners on destroy. Drop-in replacement for
 * `StarryBackgroundComponent`.
 */
@Component({
  selector: 'dba-ui-animated-starry-background',
  standalone: true,
  templateUrl: './animated-starry-background.component.html',
  styleUrls: ['./animated-starry-background.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimatedStarryBackgroundComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  /** The fixed backdrop canvas the field is painted onto. */
  private readonly sky = viewChild.required<ElementRef<HTMLCanvasElement>>('sky');

  /** Schedules the canvas animation in the browser only (SSR-safe). */
  private readonly renderHook = afterNextRender(() => this.animate());

  /** Builds both layers, paints them, and wires resize handling + teardown. */
  private animate(): void {
    const canvas = this.sky().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const styles = getComputedStyle(this.host.nativeElement);
    const toRgb = (value: string, fallback: string): string => {
      const match = /^#?([0-9a-f]{6})$/i.exec(value.trim());
      if (!match) {
        return fallback;
      }
      const int = parseInt(match[1], 16);
      return `${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}`;
    };
    const pinkRgb = toRgb(styles.getPropertyValue('--db-color-neon-pink'), '255, 45, 149');
    const cyanRgb = toRgb(styles.getPropertyValue('--db-color-cyan'), '0, 229, 255');
    const blueRgb = toRgb(styles.getPropertyValue('--db-color-neon-blue'), '77, 141, 240');
    const starRgb = styles.getPropertyValue('--db-color-star').trim() || '255, 255, 255';
    const white = `rgb(${starRgb})`;
    const pink = `rgb(${pinkRgb})`;
    const cyan = `rgb(${cyanRgb})`;

    const reduceMotion =
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let constellations: Constellation[] = [];
    let frame = 0;

    const build = (): void => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(MAX_STARS, Math.floor(width * height * STAR_DENSITY));
      stars = [];
      for (let i = 0; i < count; i++) {
        const tint = Math.random();
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 1.4 + 0.3,
          base: 0.18 + Math.random() * 0.82,
          phase: Math.random() * TWO_PI,
          speed: 0.3 + Math.random() * 1.1,
          drift: (Math.random() - 0.5) * 0.04,
          color: tint > 0.92 ? cyan : tint > 0.86 ? pink : white,
        });
      }

      constellations = [];
      const clusters = Math.max(3, Math.floor(width / CLUSTER_WIDTH_DIVISOR));
      const spreadBase = Math.min(width, height);
      for (let c = 0; c < clusters; c++) {
        const cx = (0.1 + Math.random() * 0.8) * width;
        const cy = (0.1 + Math.random() * 0.8) * height;
        const spread = spreadBase * (0.1 + Math.random() * 0.1);
        const nodeCount =
          CLUSTER_MIN_NODES +
          Math.floor(Math.random() * (CLUSTER_MAX_NODES - CLUSTER_MIN_NODES + 1));

        const nodes: ConstellationNode[] = [];
        for (let n = 0; n < nodeCount; n++) {
          const angle = Math.random() * TWO_PI;
          const dist = Math.random() * spread;
          const hx = cx + Math.cos(angle) * dist;
          const hy = cy + Math.sin(angle) * dist;
          nodes.push({
            homeX: hx,
            homeY: hy,
            ampX: 3 + Math.random() * 6,
            ampY: 3 + Math.random() * 6,
            phaseX: Math.random() * TWO_PI,
            phaseY: Math.random() * TWO_PI,
            x: hx,
            y: hy,
            glow: null,
            ring: false,
            pulsePhase: Math.random() * TWO_PI,
            pulseSpeed: 0.6 + Math.random() * 0.8,
            radius: 1.4 + Math.random() * 1,
          });
        }

        // Promote 2–3 distinct nodes to glowing feature stars (pink w/ring, or cyan).
        const featureCount = Math.min(nodes.length, 2 + (Math.random() < 0.5 ? 1 : 0));
        for (let f = 0; f < featureCount; f++) {
          const node = nodes[f];
          const isPink = Math.random() < 0.55;
          node.glow = isPink ? pinkRgb : cyanRgb;
          node.ring = isPink;
          node.radius = 4 + Math.random() * 2;
        }

        // Connect each node to its two nearest neighbours (deduped).
        const edges: [number, number][] = [];
        const seen = new Set<string>();
        for (let i = 0; i < nodes.length; i++) {
          const neighbours = nodes
            .map((m, j) => ({
              j,
              d: (m.homeX - nodes[i].homeX) ** 2 + (m.homeY - nodes[i].homeY) ** 2,
            }))
            .filter((e) => e.j !== i)
            .sort((a, b) => a.d - b.d);
          for (let k = 0; k < Math.min(2, neighbours.length); k++) {
            const j = neighbours[k].j;
            const key = i < j ? `${i}-${j}` : `${j}-${i}`;
            if (!seen.has(key)) {
              seen.add(key);
              edges.push([i, j]);
            }
          }
        }

        constellations.push({ nodes, edges, line: c % 2 === 0 ? pinkRgb : blueRgb });
      }
    };

    const drawSparkle = (cx: number, cy: number, size: number, alpha: number): void => {
      const inner = size * 0.26;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = white;
      ctx.beginPath();
      ctx.moveTo(cx, cy - size);
      ctx.lineTo(cx + inner, cy - inner);
      ctx.lineTo(cx + size, cy);
      ctx.lineTo(cx + inner, cy + inner);
      ctx.lineTo(cx, cy + size);
      ctx.lineTo(cx - inner, cy + inner);
      ctx.lineTo(cx - size, cy);
      ctx.lineTo(cx - inner, cy - inner);
      ctx.closePath();
      ctx.fill();
    };

    const drawFeature = (node: ConstellationNode, time: number): void => {
      const rgb = node.glow;
      if (!rgb) {
        return;
      }
      const pulse = reduceMotion
        ? 0.85
        : 0.7 + 0.3 * Math.sin(time * 0.001 * node.pulseSpeed + node.pulsePhase);
      const r = node.radius * pulse;

      const halo = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 6);
      halo.addColorStop(0, `rgba(${rgb}, ${0.55 * pulse})`);
      halo.addColorStop(0.4, `rgba(${rgb}, ${0.16 * pulse})`);
      halo.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.globalAlpha = 1;
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r * 6, 0, TWO_PI);
      ctx.fill();

      if (node.ring) {
        ctx.globalAlpha = 0.85 * pulse;
        ctx.strokeStyle = `rgb(${rgb})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 2.7, 0, TWO_PI);
        ctx.stroke();
      }

      drawSparkle(node.x, node.y, r * 2.1, pulse);
    };

    const draw = (time: number): void => {
      ctx.clearRect(0, 0, width, height);

      // 1) Ambient twinkling, drifting star field.
      for (const s of stars) {
        s.x += s.drift;
        if (s.x < 0) {
          s.x += width;
        }
        if (s.x > width) {
          s.x -= width;
        }
        const alpha = reduceMotion
          ? s.base
          : s.base * (0.55 + 0.45 * Math.sin(time * 0.001 * s.speed + s.phase));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
        ctx.fill();
      }

      // 2) Constellations: oscillate nodes, then lines → dim dots → feature stars.
      for (const con of constellations) {
        for (const node of con.nodes) {
          if (reduceMotion) {
            node.x = node.homeX;
            node.y = node.homeY;
          } else {
            node.x = node.homeX + Math.sin(time * 0.0003 + node.phaseX) * node.ampX;
            node.y = node.homeY + Math.cos(time * 0.00027 + node.phaseY) * node.ampY;
          }
        }
      }

      ctx.lineWidth = 1;
      for (const con of constellations) {
        ctx.strokeStyle = `rgba(${con.line}, 0.28)`;
        for (const [ia, ib] of con.edges) {
          const a = con.nodes[ia];
          const b = con.nodes[ib];
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      for (const con of constellations) {
        for (const node of con.nodes) {
          if (node.glow) {
            continue;
          }
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = white;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 1.4, 0, TWO_PI);
          ctx.fill();
        }
      }

      for (const con of constellations) {
        for (const node of con.nodes) {
          if (node.glow) {
            drawFeature(node, time);
          }
        }
      }

      ctx.globalAlpha = 1;
      if (!reduceMotion) {
        frame = requestAnimationFrame(draw);
      }
    };

    build();
    draw(0);

    let resizeTimer = 0;
    const onResize = (): void => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        cancelAnimationFrame(frame);
        build();
        draw(0);
      }, RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener('resize', onResize);

    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(frame);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
    });
  }
}
