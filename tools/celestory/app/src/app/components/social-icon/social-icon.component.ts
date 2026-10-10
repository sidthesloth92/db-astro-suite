import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A recognizable, brand-coloured social-platform glyph for share buttons
 * (X, Facebook, Reddit, WhatsApp, Telegram, Threads, Email, …). Simple,
 * self-coloured marks — presentational only, driven entirely by `name`.
 */
@Component({
  selector: 'dba-cel-social-icon',
  standalone: true,
  templateUrl: './social-icon.component.html',
  styleUrl: './social-icon.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialIconComponent {
  /** Platform id: x | facebook | reddit | whatsapp | telegram | threads | email | cloudynights. */
  readonly name = input.required<string>();
  /** Pixel size of the square glyph. */
  readonly size = input<number>(18);
}
