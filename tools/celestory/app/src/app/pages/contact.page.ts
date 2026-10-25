import { RouteMeta } from '@analogjs/router';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ConstellationFieldComponent, TextButtonComponent } from '@db-astro-suite/ui';
import { CelestoryWordmarkComponent } from '../components/celestory-wordmark/celestory-wordmark.component';
import { CONTACT_EMAIL } from '../models/contact.constants';
import { buildMailtoUrl } from '../utils/contact.util';
import { SiteFooterComponent } from '../components/site-footer/site-footer.component';

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
    TextButtonComponent,
    CelestoryWordmarkComponent,
    SiteFooterComponent,
  ],
  templateUrl: './contact.page.html',
  styleUrl: './contact.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ContactPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  /** Shown as text for visitors without a mail app. */
  protected readonly contactEmail = CONTACT_EMAIL;

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

  /** Prefill the subject from `?subject=` (the "Report this profile" link sets it). */
  ngOnInit(): void {
    const subject = this.route.snapshot.queryParamMap.get('subject');
    if (subject) {
      this.form.controls.subject.setValue(subject.slice(0, 120));
    }
  }
}

export const routeMeta: RouteMeta = {
  title: 'Celestory · Contact',
  meta: [
    {
      name: 'description',
      content:
        'Questions, feedback, or a bug in the charts? Send a note. It opens your mail app, pre-filled. Nothing is stored or sent without you.',
    },
  ],
};
