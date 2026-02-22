import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardComponent } from '@db-astro-suite/ui';
import { FooterComponent } from '../../../../../libs/ui/src/lib/footer/footer.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dba-hub-astrogram-dossier',
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
          <div class="mission-id">Module: AstroGram</div>
        </nav>

        <header class="dossier-header">
          <div class="header-logo-container">
            <img src="assets/img/astrogram.png" class="dossier-logo" alt="Astrogram Logo" />
            <div>
              <h1 class="db-neon-text">ASTROGRAM</h1>
              <p class="tagline">Professional Exposure Cards. Instantly.</p>
            </div>
          </div>
          <a href="/db-astro-suite/astrogram/" target="_self" class="launch-btn">
            Launch Tool
          </a>
        </header>

        <div class="dossier-grid">
          <section class="briefing">
            <dba-ui-card title="Overview">
              <p>
                Astrogram is a specialized generator designed to take the complexity of your capture session—from gear lists to Bortle scales—and distill it into a beautiful, Instagram-ready graphic and a perfectly formatted caption. No more messy captions or manually typing out equipment lists for every post.
              </p>
              <p>
                Simply input your session metadata, and Astrogram handles the typography, layout, branding, and caption formatting giving your followers a clear "behind-the-lens" look at how you captured the cosmos.
              </p>
            </dba-ui-card>

            <dba-ui-card title="Features" class="specs-card">
              <ul class="specs-list">
                <li>
                  <strong>VISUAL IMAGE GENERATION</strong>
                  <span>Instantly render a high-quality graphic with perfectly balanced typography and real-time preview.</span>
                </li>
                <li>
                  <strong>INSTAGRAM CAPTION GENERATOR</strong>
                  <span>Automatically format your session data into a structured Instagram caption with themed emojis and relevant hashtags.</span>
                </li>
                <li>
                  <strong>ONE-TAP COPY SYSTEM</strong>
                  <span>Instantly copy your formatted caption to the clipboard with neon visual feedback, optimized for immediate posting.</span>
                </li>
                <li>
                  <strong>FULL EQUIPMENT STACK</strong>
                  <span>Dedicated fields for your telescope, mount, main camera, guide scope, and processing software.</span>
                </li>
                <li>
                  <strong>EXPOSURE & FILTERS</strong>
                  <span>Clearly highlight total integration time, individual sub-lengths, and filter configurations with themed indicators.</span>
                </li>
                <li>
                  <strong>BORTLE & LOCATION INSIGHTS</strong>
                  <span>Include environmental data like Bortle scale and capture locations to add scientific context to your art.</span>
                </li>
              </ul>
            </dba-ui-card>
          </section>

          <section class="intelligence">
            <dba-ui-card title="Demo">
              <div class="demo-image-container">
                <img src="assets/img/astrogram_demo.jpg" alt="Astrogram Demo" class="demo-image" />
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
  styles: [`
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
      top: 0; left: 0; width: 100%; height: 100%; z-index: 1;
      background-image: 
        radial-gradient(1px 1px at 20px 30px, #eee, rgba(0,0,0,0)),
        radial-gradient(1px 1px at 40px 70px, #fff, rgba(0,0,0,0)),
        radial-gradient(2px 2px at 50px 160px, #ddd, rgba(0,0,0,0));
      background-repeat: repeat;
      background-size: 200px 200px;
      opacity: 0.2;
    }

    .nebula-overlay {
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%; z-index: 1;
      background: 
        radial-gradient(circle at 20% 30%, rgba(255, 45, 149, 0.05) 0%, transparent 40%),
        radial-gradient(circle at 80% 70%, rgba(0, 243, 255, 0.05) 0%, transparent 40%);
      pointer-events: none;
    }

    .scanlines {
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%; z-index: 100;
      pointer-events: none;
      background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%),
                  linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
      background-size: 100% 3px, 2px 100%;
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
      0% { opacity: 0; transform: scale(0.98); filter: blur(10px); }
      100% { opacity: 1; transform: scale(1); filter: blur(0); }
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
    }

    .tagline {
      font-family: var(--db-font-mono, monospace);
      font-size: 14px;
      letter-spacing: 0.5em;
      color: #00f3ff;
      margin-top: 0.5rem;
      text-transform: uppercase;
    }

    .dossier-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-bottom: 4rem;
    }

    .briefing {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .briefing p {
      color: rgba(255, 255, 255, 0.8);
      line-height: 1.8;
      font-size: 16px;
      margin-bottom: 1.5rem;
    }

    .intelligence {
      display: flex;
      flex-direction: column;
      gap: 2rem;
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

    .placeholder-text {
      font-family: var(--db-font-display, sans-serif);
      font-size: 12px;
      letter-spacing: 0.1em;
      color: white;
      margin-bottom: 0.5rem;
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
      .dossier-grid {
        grid-template-columns: 1fr;
      }
      .dossier-header h1 {
        font-size: 3rem;
      }
    }

    @media (max-width: 600px) {
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
  `]
})
export default class AstroGramPage {}
