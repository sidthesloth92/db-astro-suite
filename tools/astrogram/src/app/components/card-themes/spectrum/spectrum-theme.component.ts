import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';

/**
 * Spectrum theme — a vibrant pink→magenta→violet→cyan gradient hero over a
 * near-black body. Bold Manrope display headline, an oversized integration
 * total with gradient band bars, and an equipment / pipeline table closing on
 * a gradient-dot Bortle strip.
 */
@Component({
  selector: 'dba-ag-spectrum-theme',
  standalone: true,
  imports: [],
  templateUrl: './spectrum-theme.component.html',
  styleUrl: './spectrum-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpectrumThemeComponent extends CardThemeBaseDirective {
  /** First word of the object name — the oversized gradient headline. */
  heroPrimary(): string {
    const name = this.vm().objectName;
    const idx = name.indexOf(' ');
    return idx === -1 ? name : name.slice(0, idx);
  }

  /** Sub-headline: the remaining name joined to the catalogue id (`Nebula · NGC 2237`). */
  heroSubtitle(): string {
    const name = this.vm().objectName;
    const idx = name.indexOf(' ');
    const rest = idx === -1 ? '' : name.slice(idx + 1);
    const id = this.vm().objectId;
    if (rest && id) {
      return `${rest} · ${id}`;
    }
    return rest || id;
  }
}
