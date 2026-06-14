import { RouteMeta } from '@analogjs/router';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConstellationFieldComponent } from '@db-astro-suite/ui';
import { CelestoryWordmarkComponent } from '../components/celestory-wordmark/celestory-wordmark.component';
import { CONTACT_EMAIL } from '../models/contact.constants';
import { buildMailtoUrl } from '../utils/contact.util';

/**
 * Contact page — a privacy-first "say hello" form. Submitting composes a
 * `mailto:` and opens the visitor's mail app with everything pre-filled; nothing
 * is stored or sent server-side. Carries the DB Astro Suite skin (animated
 * starfield + neon accents).
 */
@Component({
  selector: 'dba-celestory-contact',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ConstellationFieldComponent,
    CelestoryWordmarkComponent,
  ],
  templateUrl: './contact.page.html',
  styleUrl: './contact.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ContactPageComponent {
  /** Typed contact form; email + message are required. */
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    subject: new FormControl('', { nonNullable: true }),
    message: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  /** True once a submit has been attempted, so invalid fields surface errors. */
  protected readonly submitted = signal(false);
  /** True after a successful submit; shows the "mail app opened" confirmation. */
  protected readonly sent = signal(false);

  /**
   * Validate, then open the visitor's mail client with a pre-filled message.
   * SSR-safe: only touches `window` in the browser.
   */
  submit(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const url = buildMailtoUrl(CONTACT_EMAIL, this.form.getRawValue());
    if (typeof window !== 'undefined') {
      window.location.href = url;
    }
    this.sent.set(true);
  }

  /** Current year, shown in the footer. */
  protected readonly year = new Date().getFullYear();
}

export const routeMeta: RouteMeta = {
  title: 'Contact — Celestory',
  meta: [
    {
      name: 'description',
      content:
        'Questions, feedback, or a bug in the charts? Send a note — it opens your mail app, pre-filled. Nothing is stored or sent without you.',
    },
  ],
};
