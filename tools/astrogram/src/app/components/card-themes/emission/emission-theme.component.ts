import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardThemeBaseDirective } from '../card-theme-base.directive';
import { ThemeStarfieldComponent } from '../shared/theme-starfield/theme-starfield.component';

/**
 * Emission theme — the real physics. Plots each filter's emission line at its
 * true wavelength across a 380–700 nm spectrum strip, then lists the bands as a
 * wavelength / integration readout with a big total. Decorated with the shared
 * astro kit's finder-scope crosshair and a diffraction spike.
 */
@Component({
  selector: 'dba-ag-emission-theme',
  standalone: true,
  imports: [ThemeStarfieldComponent],
  templateUrl: './emission-theme.component.html',
  styleUrl: './emission-theme.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmissionThemeComponent extends CardThemeBaseDirective {
  /** True emission wavelengths (nm) keyed by band id (design `WAVELEN`). */
  private readonly wavelengths: Partial<Record<string, number>> = {
    Hα: 656.3,
    OIII: 500.7,
    SII: 671.6,
  };

  /** Emission wavelength for a band id in nm, or `null` when unknown. */
  protected wavelength(id: string): number | null {
    return this.wavelengths[id] ?? null;
  }

  /** Readout label for a band's wavelength, e.g. `656.3nm` (or `—`). */
  protected wavelengthLabel(id: string): string {
    const nm = this.wavelength(id);
    return nm === null ? '—' : `${nm}nm`;
  }

  /** Horizontal position of a band's spectral line across the 380–700 nm strip. */
  protected spectrumPos(id: string): string {
    const nm = this.wavelength(id);
    if (nm === null) return '0%';
    return `${((Math.min(nm, 700) - 380) / (700 - 380)) * 100}%`;
  }

  /**
   * Sub-headline counting the bands actually captured, e.g.
   * `3 wavelengths, 10h 20m of signal.` Replaces the design's fixed
   * "Three wavelengths of ionised gas", which only held for a narrowband trio.
   */
  protected wavelengthLine(): string {
    const data = this.vm();
    const count = data.integration.length;
    return `${count} wavelength${count === 1 ? '' : 's'}, ${data.total} of signal.`;
  }

  /** Footer gear ticker: every equipment value joined in the user's order. */
  protected footerGear(): string {
    return this.vm()
      .equipment.map((item) => item.value)
      .filter(Boolean)
      .join(' · ');
  }
}
