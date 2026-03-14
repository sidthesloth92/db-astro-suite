import { RouteMeta } from '@analogjs/router';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardComponent } from '@db-astro-suite/ui';
import { FooterComponent } from '../../../../../libs/ui/src/lib/footer/footer.component';

@Component({
  selector: 'dba-hub-starwizz-dossier',
  standalone: true,
  imports: [RouterLink, CardComponent, FooterComponent, CommonModule],
  template: `
    <div class="dossier-container">
      <div class="stars-overlay"></div>
      <div class="nebula-overlay"></div>
      <div class="scanlines"></div>

      <div class="content">
        <nav class="top-nav">
          <a routerLink="/" class="back-link">
            <span class="arrow">←</span> RETURN TO HUB
          </a>
          <div class="mission-id">Module: StarWizz</div>
        </nav>

        <header class="dossier-header">
          <div class="header-logo-container">
            <img
              src="assets/img/sw.png"
              class="dossier-logo"
              alt="Starwizz Logo"
            />
            <div>
              <h1 class="db-neon-text">STARWIZZ</h1>
              <p class="tagline">CINEMATIC STARFIELD GENERATOR</p>
            </div>
          </div>
          <a href="/starwizz/" target="_self" class="launch-btn">
            Launch Tool
          </a>
        </header>

        <section class="overview-section">
          <dba-ui-card title="Overview">
            <p>
              Starwizz is a browser-based 4K starfield and galaxy animation
              generator. Set your parameters, hit record, and download a
              cinematic space background in minutes &mdash; no software to
              install, no account required.
            </p>
            <h4 class="subsection-title">The Problem It Solves</h4>
            <p>
              Creating a cinematic space background used to require 3D software,
              stock footage subscriptions, or a graphics team. For
              astrophotographers, content creators, and educators working alone,
              none of those options are quick or free. Starwizz removes every
              barrier &mdash; no installation, no subscription, no render queue.
            </p>
            <p>
              Open it in a browser, dial in your simulation parameters, and
              record a perfectly looped 4K starfield video in minutes. The
              output is professional-grade and suited for YouTube intros,
              Instagram Reels, presentation backdrops, and virtual meeting
              backgrounds.
            </p>
          </dba-ui-card>
        </section>

        <section class="features-section">
          <dba-ui-card title="Features">
            <div class="features-grid">
              <div class="feature-item">
                <div class="feature-icon">&#x2B50;</div>
                <strong>POPULATION CONTROL</strong>
                <span
                  >Modify the density and number of stars to simulate different
                  galactic sectors.</span
                >
              </div>
              <div class="feature-item">
                <div class="feature-icon">&#x1F680;</div>
                <strong>VELOCITY VECTORS</strong>
                <span
                  >Adjust travel speed to transition from a slow gentle drift to
                  full high-warp effects.</span
                >
              </div>
              <div class="feature-item">
                <div class="feature-icon">&#x1F300;</div>
                <strong>ROTATIONAL DYNAMICS</strong>
                <span
                  >Fine-tune camera rotation to create chaotic orbits or smooth
                  stable traversals.</span
                >
              </div>
            </div>
          </dba-ui-card>
        </section>

        <div class="bottom-grid">
          <section class="how-it-works-section">
            <dba-ui-card title="How It Works">
              <ol class="steps-list">
                <li>
                  <strong>CHOOSE A SCENE TYPE</strong>
                  <span
                    >Select a pure deep-space starfield or a galaxy background
                    with dynamic nebula cloud overlays.</span
                  >
                </li>
                <li>
                  <strong>SET YOUR PARAMETERS</strong>
                  <span
                    >Use the real-time HUD to adjust star density, travel
                    velocity, rotation speed, zoom factor, and shooting star
                    frequency.</span
                  >
                </li>
                <li>
                  <strong>PREVIEW LIVE</strong>
                  <span
                    >The Canvas-based renderer updates immediately &mdash; what
                    you see in the browser is exactly what will be
                    recorded.</span
                  >
                </li>
                <li>
                  <strong>RECORD AT 4K</strong>
                  <span
                    >Hit Record and Starwizz captures the animation at full 4K
                    resolution directly in the browser using the MediaRecorder
                    API &mdash; no plugins required.</span
                  >
                </li>
                <li>
                  <strong>DOWNLOAD AND USE</strong>
                  <span
                    >Save the video file and drop it straight into your video
                    editor, presentation software, or upload it directly to
                    social media.</span
                  >
                </li>
              </ol>
            </dba-ui-card>
          </section>

          <section class="demo-section">
            <dba-ui-card title="Demo">
              <div class="demo-image-container">
                <img
                  src="assets/img/sw_demo.gif"
                  alt="Starwizz Demo"
                  class="demo-image"
                />
              </div>
            </dba-ui-card>
          </section>
        </div>

        <footer class="dossier-footer">
          <!-- Launch button moved to header -->
        </footer>

        <dba-ui-footer></dba-ui-footer>
      </div>
    </div>
  `,
  styles: [
    `
      .dossier-container {
        position: relative;
        min-height: 100vh;
        background: #05070a;
        color: white;
        font-family: var(--db-font-body, 'Rajdhani', sans-serif);
        padding: 2rem;
      }

      /* Background (Copied from Hub for consistency) */
      .stars-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
        background-image:
          radial-gradient(1px 1px at 20px 30px, #eee, rgba(0, 0, 0, 0)),
          radial-gradient(1px 1px at 40px 70px, #fff, rgba(0, 0, 0, 0)),
          radial-gradient(2px 2px at 50px 160px, #ddd, rgba(0, 0, 0, 0));
        background-repeat: repeat;
        background-size: 200px 200px;
        opacity: 0.2;
      }

      .scanlines {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 100;
        pointer-events: none;
        background:
          linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%),
          linear-gradient(
            90deg,
            rgba(255, 0, 0, 0.03),
            rgba(0, 255, 0, 0.01),
            rgba(0, 0, 255, 0.03)
          );
        background-size:
          100% 3px,
          2px 100%;
        opacity: 0.4;
      }

      .content {
        position: relative;
        z-index: 2;
        max-width: 1100px;
        margin: 0 auto;
        animation: dossier-entry 0.8s cubic-bezier(0.23, 1, 0.32, 1);
      }

      @keyframes dossier-entry {
        0% {
          opacity: 0;
          transform: scale(0.98);
          filter: blur(10px);
        }
        100% {
          opacity: 1;
          transform: scale(1);
          filter: blur(0);
        }
      }

      .top-nav {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 3rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 1rem;
      }

      .back-link {
        color: rgba(255, 255, 255, 0.6);
        text-decoration: none;
        font-family: var(--db-font-mono, monospace);
        font-size: 12px;
        letter-spacing: 0.2em;
        transition: color 0.3s;
      }

      .back-link:hover {
        color: var(--db-color-neon-pink);
      }

      .mission-id {
        font-family: var(--db-font-mono, monospace);
        font-size: 10px;
        color: var(--db-color-neon-pink);
        opacity: 0.7;
      }

      .dossier-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4rem;
        gap: 2rem;
      }

      .header-logo-container {
        display: flex;
        align-items: center;
        gap: 2rem;
      }

      .dossier-logo {
        width: 5rem;
        height: 5rem;
        object-fit: contain;
      }

      .dossier-header h1 {
        font-size: 4rem;
        margin: 0;
        letter-spacing: 0.2em;
        font-weight: 900;
        color: var(--db-color-neon-pink);
      }

      ::ng-deep dba-ui-card .card__title {
        color: var(--db-color-neon-pink);
        text-shadow: 0 0 8px rgba(255, 45, 149, 0.35);
      }

      :host {
        --card-title-color: var(--db-color-neon-pink);
      }

      .tagline {
        font-family: var(--db-font-mono, monospace);
        font-size: 14px;
        letter-spacing: 0.5em;
        color: #00f3ff;
        margin-top: 0.5rem;
        text-transform: uppercase;
      }

      .overview-section {
        margin-bottom: 2rem;
      }

      .overview-section p {
        color: rgba(255, 255, 255, 0.8);
        line-height: 1.8;
        font-size: 16px;
        margin-bottom: 1.5rem;
      }

      .features-section {
        margin-bottom: 2rem;
      }

      .features-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1.5rem;
      }

      .feature-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 1.25rem;
        border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.02);
        transition: border-color 0.3s;
      }

      .feature-item:hover {
        border-color: rgba(255, 45, 149, 0.4);
      }

      .feature-icon {
        font-size: 1.75rem;
        line-height: 1;
        margin-bottom: 0.25rem;
      }

      .feature-item strong {
        display: block;
        color: var(--db-color-neon-pink);
        font-family: var(--db-font-display, sans-serif);
        font-size: 11px;
        letter-spacing: 0.1em;
      }

      .feature-item span {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.6);
        line-height: 1.6;
      }

      .bottom-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        margin-bottom: 4rem;
      }

      .how-it-works-section,
      .demo-section {
        display: flex;
        flex-direction: column;
      }

      .subsection-title {
        font-family: var(--db-font-display, sans-serif);
        font-size: 12px;
        letter-spacing: 0.15em;
        color: var(--db-color-neon-pink);
        text-transform: uppercase;
        margin: 1.5rem 0 0.75rem;
        padding-bottom: 0.4rem;
        border-bottom: 1px solid rgba(255, 45, 149, 0.3);
      }

      .specs-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .specs-list li {
        margin-bottom: 1.5rem;
        border-left: 2px solid var(--db-color-neon-pink);
        padding-left: 1rem;
      }

      .specs-list strong {
        display: block;
        color: var(--db-color-neon-pink);
        font-family: var(--db-font-display, sans-serif);
        font-size: 12px;
        letter-spacing: 0.1em;
        margin-bottom: 0.25rem;
      }

      .specs-list span {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.6);
      }

      .steps-list {
        list-style: none;
        padding: 0;
        margin: 0;
        counter-reset: steps;
      }

      .steps-list li {
        margin-bottom: 1.5rem;
        border-left: 2px solid #00f3ff;
        padding-left: 1rem;
        counter-increment: steps;
      }

      .steps-list strong {
        display: block;
        color: #00f3ff;
        font-family: var(--db-font-display, sans-serif);
        font-size: 12px;
        letter-spacing: 0.1em;
        margin-bottom: 0.25rem;
      }

      .steps-list span {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.6);
      }

      .media-placeholder {
        background: rgba(255, 255, 255, 0.03);
        border: 1px dashed rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 3rem;
        text-align: center;
        margin-bottom: 1.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      .placeholder-icon {
        font-size: 2rem;
        color: var(--db-color-neon-pink);
        margin-bottom: 1rem;
        opacity: 0.5;
      }

      .demo-image-container {
        width: 100%;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid rgba(255, 45, 149, 0.2);
        box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
      }

      .demo-image {
        width: 100%;
        height: auto;
        display: block;
      }

      .placeholder-text {
        font-family: var(--db-font-display, sans-serif);
        font-size: 12px;
        letter-spacing: 0.1em;
        color: white;
        margin-bottom: 0.5rem;
      }

      .placeholder-subtext {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.4);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .dossier-footer {
        text-align: center;
      }

      .launch-btn {
        display: inline-block;
        padding: 1.25rem 4rem;
        background: transparent;
        border: 1px solid var(--db-color-neon-pink);
        color: var(--db-color-neon-pink);
        font-family: var(--db-font-display, sans-serif);
        font-size: 14px;
        letter-spacing: 0.3em;
        text-decoration: none;
        transition: all 0.3s;
        box-shadow: 0 0 20px rgba(255, 45, 149, 0.1);
      }

      .launch-btn:hover {
        background: var(--db-color-neon-pink);
        color: white;
        box-shadow: 0 0 40px rgba(255, 45, 149, 0.4);
        transform: translateY(-2px);
      }

      @media (max-width: 900px) {
        .bottom-grid {
          grid-template-columns: 1fr;
        }
        .features-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        .dossier-header h1 {
          font-size: 3rem;
        }
      }

      @media (max-width: 600px) {
        .features-grid {
          grid-template-columns: 1fr;
        }
        .dossier-header {
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .header-logo-container {
          flex-direction: column;
          text-align: center;
          gap: 1rem;
        }
        .dossier-header h1 {
          font-size: clamp(2rem, 10vw, 2.5rem);
          letter-spacing: 0.1em;
        }
        .tagline {
          letter-spacing: 0.2rem;
          font-size: 12px;
        }
        .top-nav {
          flex-direction: column;
          gap: 1rem;
          align-items: flex-start;
        }
        .launch-btn {
          width: 100%;
          text-align: center;
          padding: 1rem 2rem;
          font-size: 12px;
        }
      }
    `,
  ],
})
export default class StarwizzPage {
  constructor() {
    const doc = inject(DOCUMENT);
    const link: HTMLLinkElement = doc.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', 'https://dbastrosuite.com/dossier/starwizz');
    doc.head.appendChild(link);
  }
}

export const routeMeta: RouteMeta = {
  title: 'Starwizz Dossier - Cinematic Starfield Generator',
  meta: [
    {
      name: 'description',
      content:
        'Starwizz is a high-fidelity starfield generator for creating immersive space animations and cinematic backgrounds.',
    },
    {
      property: 'og:title',
      content: 'Starwizz - Cinematic Starfield Generator',
    },
    {
      property: 'og:description',
      content:
        'Generate perfectly looped starfield videos with surgical control over star density, velocity, and rotation.',
    },
    {
      property: 'og:image',
      content: 'https://dbastrosuite.com/starwizz/assets/img/preview.png',
    },
    {
      property: 'og:url',
      content: 'https://dbastrosuite.com/dossier/starwizz',
    },
  ],
};
