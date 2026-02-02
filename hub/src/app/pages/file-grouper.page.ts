import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NeonButtonComponent, CardComponent } from '@db-astro-suite/ui';

@Component({
  selector: 'hub-file-grouper-page',
  standalone: true,
  imports: [RouterLink, NeonButtonComponent, CardComponent],
  template: `
    <div class="tool-docs">
      <header class="tool-docs__header">
        <h1 class="db-neon-text">File Grouper</h1>
        <p class="tool-docs__subtitle">A platform-agnostic CLI utility for organizing files</p>
      </header>

      <section class="tool-docs__content">
        <db-card title="Installation">
          <p>Install via Go:</p>
          <pre class="code-block"><code>go install github.com/sidthesloth92/db-astro-suite/tools/file-grouper&#64;latest</code></pre>
        </db-card>

        <db-card title="Usage">
          <p>Run the tool in any directory:</p>
          <pre class="code-block"><code>file-grouper --by-extension ./my-folder</code></pre>
          <p>This will group all files by their extension into subdirectories.</p>
        </db-card>

        <db-card title="Features">
          <ul>
            <li>Group files by extension, date, or size</li>
            <li>Dry-run mode to preview changes</li>
            <li>Cross-platform (Windows, macOS, Linux)</li>
            <li>Recursive directory processing</li>
          </ul>
        </db-card>
      </section>

      <nav class="tool-docs__nav">
        <a routerLink="/">
          <db-neon-button label="← Back to Home"></db-neon-button>
        </a>
        <a href="https://github.com/sidthesloth92/db-astro-suite/tree/main/tools/file-grouper" target="_blank" rel="noopener">
          <db-neon-button label="View on GitHub" variant="secondary"></db-neon-button>
        </a>
      </nav>
    </div>
  `,
  styles: [`
    .tool-docs {
      min-height: 100vh;
      padding: var(--db-spacing-xl, 2rem);
      max-width: 800px;
      margin: 0 auto;
    }

    .tool-docs__header {
      text-align: center;
      margin-bottom: var(--db-spacing-xl, 2rem);
    }

    .tool-docs__header h1 {
      font-size: 2.5rem;
      margin-bottom: var(--db-spacing-sm, 0.5rem);
    }

    .tool-docs__subtitle {
      color: var(--db-color-text-muted, #94a3b8);
      font-size: 1.25rem;
    }

    .tool-docs__content {
      display: flex;
      flex-direction: column;
      gap: var(--db-spacing-lg, 1.5rem);
      margin-bottom: var(--db-spacing-xl, 2rem);
    }

    .code-block {
      background: rgba(0, 0, 0, 0.3);
      padding: var(--db-spacing-md, 1rem);
      border-radius: var(--db-radius-md, 0.5rem);
      overflow-x: auto;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
    }

    .tool-docs__content ul {
      padding-left: var(--db-spacing-lg, 1.5rem);
      margin: var(--db-spacing-md, 1rem) 0;
    }

    .tool-docs__content li {
      margin-bottom: var(--db-spacing-sm, 0.5rem);
    }

    .tool-docs__nav {
      display: flex;
      justify-content: center;
      gap: var(--db-spacing-md, 1rem);
      flex-wrap: wrap;
    }
  `]
})
export default class FileGrouperPageComponent {}
