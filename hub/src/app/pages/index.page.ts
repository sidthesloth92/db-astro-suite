import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardComponent } from '@db-astro-suite/ui';
import { FooterComponent } from '../../../../libs/ui/src/lib/footer/footer.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dba-hub-home-page',
  standalone: true,
  imports: [RouterLink, CardComponent, FooterComponent, CommonModule],
  template: `
    <div class="hub-container">
      <!-- Immersive Background Layers -->
      <div class="stars-overlay"></div>
      <div class="nebula-overlay"></div>
      <div class="scanlines"></div>

      <div class="content">
        <header class="hero">
          <div class="system-status">
            <span class="status-indicator animate-pulse"></span>
            DB Astro Suite Core // Online
          </div>
          <h1 class="hero__title db-neon-text">DB ASTRO SUITE</h1>
          <p class="hero__subtitle">A COLLECTION OF ASTRO TOOLS TO GO FROM SENSOR TO SOCIAL</p>
          <div class="hero__description">
            DB Astro Suite is a set of tools built to get your space photos off your hard drive and onto social media as cool, shareable videos and posts. It handles the boring stuff like sorting through messy files and typing out gear lists so that you can spend more time shooting and less time stuck behind a screen.
          </div>
        </header>

        <section class="tools">
          <div class="tools__grid">
            <div class="mission-card" [routerLink]="['/dossier/starwizz']">
              <dba-ui-card title="STARWIZZ" subtitle="Starfield Generator" [clickable]="true" logoSrc="assets/img/sw.png">
                <div class="mission-status">READY</div>
                <p>Generate high-fidelity starfield videos with surgical control over star count, velocity, and rotation parameters.</p>
                <a [routerLink]="['/dossier/starwizz']" class="launch-cta" (click)="$event.stopPropagation()">
                  <span class="launch-text">LEARN MORE</span>
                  <span class="launch-arrow">→</span>
                </a>
              </dba-ui-card>
            </div>

            <div class="mission-card" [routerLink]="['/dossier/astrogram']">
              <dba-ui-card title="ASTROGRAM" subtitle="Professional Exposure Cards. Instantly." [clickable]="true" logoSrc="assets/img/astrogram.png">
                <div class="mission-status">READY</div>
                <p>Astrogram generates beautifully designed and professional-grade Instagram-ready images that display your full astrophotography exposure details, from target and integration time to equipment, filters, and Bortle scale. All in one clean, shareable image.</p>
                <a [routerLink]="['/dossier/astrogram']" class="launch-cta" (click)="$event.stopPropagation()">
                  <span class="launch-text">LEARN MORE</span>
                  <span class="launch-arrow">→</span>
                </a>
              </dba-ui-card>
            </div>

            <div class="mission-card mission-card--disabled">
              <dba-ui-card title="FILE GROUPER" subtitle="CLI Utility" [clickable]="false">
                <div class="mission-status mission-status--progress">IN PROGRESS</div>
                <p>A high-performance Go script to automatically group and organize ASIAIR image datasets by camera, date, and object.</p>
              </dba-ui-card>
            </div>
          </div>
        </section>

        <dba-ui-footer></dba-ui-footer>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      margin: 0;
      padding: 0;
      overflow-x: hidden;
    }

    .hub-container {
      position: relative;
      min-height: 100vh;
      background: #05070a;
      color: white;
      font-family: var(--db-font-body, 'Rajdhani', sans-serif);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 4rem 2rem;
    }

    /* Background Effects */
    .stars-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
      background-image: 
        radial-gradient(1px 1px at 20px 30px, #eee, rgba(0,0,0,0)),
        radial-gradient(1px 1px at 40px 70px, #fff, rgba(0,0,0,0)),
        radial-gradient(2px 2px at 50px 160px, #ddd, rgba(0,0,0,0)),
        radial-gradient(2px 2px at 90px 40px, #fff, rgba(0,0,0,0)),
        radial-gradient(1px 1px at 130px 80px, #fff, rgba(0,0,0,0)),
        radial-gradient(2px 2px at 160px 120px, #ddd, rgba(0,0,0,0));
      background-repeat: repeat;
      background-size: 200px 200px;
      opacity: 0.3;
      animation: stars-twinkle 4s infinite alternate;
    }

    @keyframes stars-twinkle {
      0% { opacity: 0.2; }
      100% { opacity: 0.5; }
    }

    .nebula-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
      background: 
        radial-gradient(circle at 20% 30%, rgba(255, 45, 149, 0.05) 0%, transparent 40%),
        radial-gradient(circle at 80% 70%, rgba(0, 243, 255, 0.05) 0%, transparent 40%);
      pointer-events: none;
    }

    .scanlines {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 100;
      pointer-events: none;
      background: linear-gradient(
        rgba(18, 16, 16, 0) 50%,
        rgba(0, 0, 0, 0.1) 50%
      ),
      linear-gradient(
        90deg,
        rgba(255, 0, 0, 0.03),
        rgba(0, 255, 0, 0.01),
        rgba(0, 0, 255, 0.03)
      );
      background-size: 100% 3px, 2px 100%;
      opacity: 0.4;
    }

    .content {
      position: relative;
      z-index: 2;
      max-width: 1200px;
      width: 100%;
      animation: content-entry 1s cubic-bezier(0.23, 1, 0.32, 1);
    }

    @keyframes content-entry {
      0% { opacity: 0; transform: translateY(20px); filter: blur(10px); }
      100% { opacity: 1; transform: translateY(0); filter: blur(0); }
    }

    /* Hero Section */
    .hero {
      text-align: center;
      margin-bottom: 5rem;
      max-width: 800px;
      margin-left: auto;
      margin-right: auto;
    }

    .system-status {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      font-family: var(--db-font-mono, 'Fira Code', monospace);
      font-size: 10px;
      letter-spacing: 0.2em;
      color: var(--db-color-neon-pink);
      background: rgba(255, 45, 149, 0.1);
      padding: 0.5rem 1rem;
      border-radius: 4px;
      margin-bottom: 1.5rem;
      border-left: 2px solid var(--db-color-neon-pink);
    }

    .status-indicator {
      width: 6px;
      height: 6px;
      background: var(--db-color-neon-pink);
      border-radius: 50%;
      box-shadow: 0 0 10px var(--db-color-neon-pink);
    }

    .hero__title {
      font-size: clamp(2rem, 6vw, 40px); /* Fixed max font size for better hierarchy */
      margin-bottom: 0.5rem;
      letter-spacing: 0.1em;
      font-weight: 900;
    }

    .hero__subtitle {
      color: rgba(255, 255, 255, 0.5);
      font-family: var(--db-font-mono, 'Fira Code', monospace);
      font-size: 11px;
      letter-spacing: 0.4em;
      text-transform: uppercase;
      margin-bottom: 1.5rem;
    }

    .hero__description {
      color: rgba(255, 255, 255, 0.7);
      font-size: 15px;
      line-height: 1.6;
      font-weight: 400;
      letter-spacing: 0.02em;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 1.5rem;
    }

    /* Tool Cards */
    .tools {
      margin-bottom: 4rem;
    }

    .tools__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 2rem;
    }

    .mission-card {
      text-decoration: none;
      color: inherit;
      display: block;
      transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
      position: relative;
    }

    .mission-card dba-ui-card {
      height: 100%;
    }

    .mission-status {
      position: absolute;
      top: 1.5rem;
      right: 1.5rem;
      font-family: var(--db-font-mono, 'Fira Code', monospace);
      font-size: 9px;
      padding: 0.25rem 0.5rem;
      border: 1px solid rgba(0, 243, 255, 0.3);
      color: #00f3ff;
      background: rgba(0, 243, 255, 0.05);
      letter-spacing: 0.1em;
    }

    .mission-status--local {
      border-color: rgba(255, 255, 255, 0.2);
      color: rgba(255, 255, 255, 0.6);
      background: transparent;
    }

    .mission-status--progress {
      border-color: rgba(255, 191, 0, 0.4);
      color: #ffbf00;
      background: rgba(255, 191, 0, 0.05);
    }

    .mission-card--disabled {
      opacity: 0.6;
      filter: grayscale(0.2);
      cursor: default;
    }

    .mission-card p {
      color: rgba(255, 255, 255, 0.6);
      line-height: 1.6;
      font-size: 14px;
      margin-bottom: 2rem;
      height: 4.5rem; /* Increased for longer descriptions */
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }

    .launch-cta {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border: 1px solid rgba(255, 45, 149, 0.3);
      padding: 0.75rem 1.25rem;
      color: var(--db-color-neon-pink);
      font-family: var(--db-font-display, 'Orbitron', sans-serif);
      font-size: 10px;
      letter-spacing: 0.2em;
      transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
      overflow: hidden;
      text-decoration: none;
      z-index: 10;
    }

    .launch-cta::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 45, 149, 0.2), transparent);
      transition: all 0.5s ease;
    }

    .launch-text, .launch-arrow {
      position: relative;
      z-index: 2;
      transition: all 0.3s ease;
    }

    .launch-arrow {
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    /* Hover States for CTA */
    .launch-cta:hover {
      border-color: var(--db-color-neon-pink);
      background: rgba(255, 45, 149, 0.1);
      box-shadow: 0 0 15px rgba(255, 45, 149, 0.2);
      transform: scale(1.02);
    }

    .launch-cta:hover::before {
      left: 100%;
    }

    .launch-cta:hover .launch-text {
      color: white;
      text-shadow: 0 0 8px var(--db-color-neon-pink);
    }

    .launch-cta:hover .launch-arrow {
      transform: translateX(6px) scale(1.2);
      color: white;
    }

    .mission-card:hover {
      transform: translateY(-8px);
    }

    @media (max-width: 768px) {
      .hub-container {
        padding: 2rem 1rem;
      }
      .hero__title {
        font-size: 2rem;
      }
      .tools__grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export default class HomePageComponent {}
