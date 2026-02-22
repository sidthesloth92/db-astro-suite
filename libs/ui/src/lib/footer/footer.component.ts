import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dba-ui-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-section">
          <div class="brand">
            <span class="brand-dot"></span>
            DB ASTRO SUITE // v1.0.0
          </div>
          <p class="tagline">A COLLECTION OF ASTRO TOOLS TO GO FROM SENSOR TO SOCIAL</p>
        </div>
        
        <div class="footer-section status">
          <div class="status-item">
            <span class="label">COORDINATES</span>
            <span class="value">32.8140° N, 96.9489° W // IRVING, TX</span>
          </div>
        </div>

        <div class="footer-links">
          <a href="https://github.com/sidthesloth92/db-astro-suite" target="_blank" class="footer-link">GITHUB</a>
          <a href="https://dineshbalajiv.com" target="_blank" class="footer-link">ABOUT ME</a>
        </div>
      </div>
      
      <div class="footer-bottom">
        <div class="copyright">&copy; 2026 DB ASTRO. ALL RIGHTS RESERVED.</div>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      width: 100%;
      background: rgba(5, 7, 10, 0.8);
      backdrop-filter: blur(10px);
      border-top: 1px solid rgba(255, 45, 149, 0.2);
      padding: 3rem 2rem 1.5rem;
      margin-top: 4rem;
      font-family: var(--db-font-mono, 'Fira Code', monospace);
    }

    .footer-content {
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: 3rem;
      margin-bottom: 3rem;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.2em;
      color: white;
      margin-bottom: 0.5rem;
    }

    .brand-dot {
      width: 8px;
      height: 8px;
      background: var(--db-color-neon-pink, #ff2d95);
      border-radius: 50%;
      box-shadow: 0 0 10px var(--db-color-neon-pink, #ff2d95);
    }

    .tagline {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.4);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .status {
      display: flex;
      gap: 3rem;
      justify-content: center;
    }

    .status-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .status-item .label {
      font-size: 9px;
      color: rgba(255, 255, 255, 0.3);
      letter-spacing: 0.1em;
    }

    .status-item .value {
      font-size: 11px;
      color: var(--db-color-neon-cyan, #00f3ff);
      letter-spacing: 0.1em;
    }

    .footer-links {
      display: flex;
      gap: 2rem;
      align-items: flex-start;
    }

    .footer-link {
      color: rgba(255, 255, 255, 0.6);
      text-decoration: none;
      font-size: 11px;
      letter-spacing: 0.2em;
      transition: all 0.3s ease;
      position: relative;
    }

    .footer-link:hover {
      color: var(--db-color-neon-pink, #ff2d95);
      text-shadow: 0 0 8px rgba(255, 45, 149, 0.4);
    }

    .footer-bottom {
      max-width: 1200px;
      margin: 0 auto;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding-top: 1.5rem;
      display: flex;
      justify-content: center;
      color: rgba(255, 255, 255, 0.4);
      font-size: 10px;
      letter-spacing: 0.2em;
    }

    @media (max-width: 900px) {
      .footer-content {
        grid-template-columns: 1fr;
        gap: 2rem;
        text-align: center;
      }
      .brand { justify-content: center; }
      .status { justify-content: center; }
      .footer-links { justify-content: center; }
      .footer-bottom { 
        padding-top: 1.5rem;
        text-align: center; 
      }
    }
  `]
})
export class FooterComponent {}
