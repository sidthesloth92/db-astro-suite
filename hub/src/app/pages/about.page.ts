import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NeonButtonComponent } from '@db-astro-suite/ui';

@Component({
  selector: 'dba-hub-about-page',
  standalone: true,
  imports: [RouterLink, NeonButtonComponent],
  template: `
    <div class="about">
      <header class="about__header">
        <h1 class="db-neon-text">About</h1>
      </header>

      <section class="about__content db-glass-panel">
        <h2>Why DB Astro Suite?</h2>
        <p>
          DB Astro Suite is a collection of tools and utilities that I've built
          to solve real problems and explore new technologies. Each tool is
          designed with a focus on user experience, performance, and that sweet
          neon aesthetic.
        </p>

        <h2>About Me</h2>
        <p>
          I'm a developer passionate about building beautiful, functional tools.
          This suite is my playground for experimenting with Angular, Go, Python,
          and more.
        </p>
      </section>

      <nav class="about__nav">
        <a routerLink="/">
          <dba-ui-neon-button label="← Back to Home"></dba-ui-neon-button>
        </a>
      </nav>
    </div>
  `,
  styles: [`
    .about {
      min-height: 100vh;
      padding: var(--db-spacing-xl, 2rem);
      max-width: 800px;
      margin: 0 auto;
    }

    .about__header {
      text-align: center;
      margin-bottom: var(--db-spacing-xl, 2rem);
    }

    .about__header h1 {
      font-size: 2.5rem;
    }

    .about__content {
      padding: var(--db-spacing-xl, 2rem);
      border-radius: var(--db-radius-lg, 0.75rem);
      margin-bottom: var(--db-spacing-xl, 2rem);
    }

    .about__content h2 {
      margin-top: var(--db-spacing-lg, 1.5rem);
      margin-bottom: var(--db-spacing-sm, 0.5rem);
    }

    .about__content h2:first-child {
      margin-top: 0;
    }

    .about__content p {
      line-height: 1.7;
      color: var(--db-color-text-muted, #94a3b8);
    }

    .about__nav {
      text-align: center;
    }
  `]
})
export default class AboutPageComponent {}
