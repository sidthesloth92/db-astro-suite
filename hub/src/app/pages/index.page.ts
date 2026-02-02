import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NeonButtonComponent, CardComponent } from '@db-astro-suite/ui';

@Component({
  selector: 'hub-home-page',
  standalone: true,
  imports: [RouterLink, NeonButtonComponent, CardComponent],
  template: `
    <div class="home">
      <header class="hero">
        <h1 class="hero__title db-neon-text">DB Astro Suite</h1>
        <p class="hero__subtitle">A collection of powerful tools and utilities</p>
      </header>

      <section class="tools">
        <h2>Tools</h2>
        <div class="tools__grid">
          <a href="/db-astro-suite/starwizz/" target="_self" class="tool-link">
            <db-card title="Starwizz" subtitle="Space-themed starfield generator" [clickable]="true">
              <p>Generate stunning starfield backgrounds for your projects.</p>
            </db-card>
          </a>
          <a routerLink="/file-grouper" class="tool-link">
            <db-card title="File Grouper" subtitle="CLI Tool (Go)" [clickable]="true">
              <p>A platform-agnostic CLI utility for organizing files.</p>
            </db-card>
          </a>
        </div>
      </section>

      <section class="cta">
        <a routerLink="/about">
          <db-neon-button label="About Me" variant="secondary"></db-neon-button>
        </a>
      </section>
    </div>
  `,
  styles: [`
    .home {
      min-height: 100vh;
      padding: var(--db-spacing-xl, 2rem);
      text-align: center;
    }

    .hero {
      margin-bottom: var(--db-spacing-xl, 2rem);
    }

    .hero__title {
      font-size: 3rem;
      margin-bottom: var(--db-spacing-sm, 0.5rem);
    }

    .hero__subtitle {
      color: var(--db-color-text-muted, #94a3b8);
      font-size: 1.25rem;
    }

    .tools {
      max-width: 800px;
      margin: 0 auto var(--db-spacing-xl, 2rem);
    }

    .tools__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: var(--db-spacing-lg, 1.5rem);
      margin-top: var(--db-spacing-lg, 1.5rem);
    }

    .tool-link {
      text-decoration: none;
      color: inherit;
    }

    .cta {
      margin-top: var(--db-spacing-xl, 2rem);
    }
  `]
})
export default class HomePageComponent {}
