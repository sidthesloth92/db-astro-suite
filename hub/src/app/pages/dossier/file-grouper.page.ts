import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardComponent } from '@db-astro-suite/ui';
import { FooterComponent } from '../../../../../libs/ui/src/lib/footer/footer.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'hub-file-grouper-dossier',
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
          <div class="mission-id">Module: File Grouper</div>
        </nav>

        <header class="dossier-header">
          <h1 class="db-neon-text">FILE GROUPER</h1>
          <p class="tagline">DATASET ORGANIZATION UTILITY</p>
        </header>

        <div class="dossier-grid">
          <section class="briefing">
            <db-card title="Overview">
              <p>
                File Grouper is a platform-agnostic Go utility designed to solve the chaos of 
                unstructured astrophotography datasets. Specifically optimized for ASIAIR 
                and similar capture systems, it automates the tedious task of sorting thousands 
                of frames into a logical hierarchy.
              </p>
              <p>
                A clean dataset is the foundation of high-quality processing. File Grouper ensures 
                your data is ready for calibration and stacking before you even open your 
                processing software.
              </p>
            </db-card>

            <db-card title="Features" class="specs-card">
              <ul class="specs-list">
                <li>
                  <strong>SENSOR CLASSIFICATION</strong>
                  <span>Automatically group and organize images based on the camera model and sensor type detected in metadata.</span>
                </li>
                <li>
                  <strong>TEMPORAL SORTING</strong>
                  <span>Efficiently group entire imaging sessions by precise dates, keeping multi-night project data separate.</span>
                </li>
                <li>
                  <strong>OBJECT TARGETING</strong>
                  <span>Classify and folder frames by celestial object names, separating your 'M42' from your 'Rosette' data instantly.</span>
                </li>
              </ul>
            </db-card>
          </section>

          <section class="intelligence">
            <db-card title="Setup & Usage">
              <div class="protocol-step">
                <span class="step-label">INSTALLATION</span>
                <pre class="code-block"><code>go install github.com/sidthesloth92/db-astro-suite/tools/file-grouper&#64;latest</code></pre>
              </div>
              <div class="protocol-step">
                <span class="step-label">EXECUTION</span>
                <pre class="code-block"><code>file-grouper --organize-asiair ./raw-data</code></pre>
              </div>
              
              <div class="media-placeholder screenshot-placeholder">
                <div class="placeholder-icon">terminal</div>
                <div class="placeholder-text">CLI EXECUTION DIAGRAM PENDING</div>
                <div class="placeholder-subtext">User to provide terminal output screenshot</div>
              </div>
            </db-card>
          </section>
        </div>

        <footer class="dossier-footer">
          <a href="https://github.com/sidthesloth92/db-astro-suite/tree/main/tools/file-grouper" target="_blank" class="launch-btn">
            ACCESS REPOSITORY
          </a>
        </footer>

        <db-footer></db-footer>
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
      margin-bottom: 4rem;
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

    .briefing p {
      color: rgba(255, 255, 255, 0.8);
      line-height: 1.8;
      font-size: 16px;
      margin-bottom: 1.5rem;
    }

    .specs-card {
      margin-top: 2rem;
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

    .protocol-step {
      margin-bottom: 1.5rem;
    }

    .step-label {
      display: block;
      font-family: var(--db-font-mono, monospace);
      font-size: 10px;
      color: rgba(255, 255, 255, 0.4);
      margin-bottom: 0.5rem;
      letter-spacing: 0.1em;
    }

    .code-block {
      background: rgba(0, 0, 0, 0.3);
      padding: 1rem;
      border-radius: 4px;
      border-left: 2px solid #00f3ff;
      font-family: var(--db-font-mono, monospace);
      font-size: 12px;
      color: #00f3ff;
      overflow-x: auto;
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
      margin-top: 1rem;
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

    .placeholder-subtext {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .dossier-footer {
      text-align: center;
      padding-top: 2rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
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
  `]
})
export default class FileGrouperPageComponent {}
