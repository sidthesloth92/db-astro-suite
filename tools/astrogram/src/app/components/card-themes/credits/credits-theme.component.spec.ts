import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreditsThemeComponent } from './credits-theme.component';
import { CardDataService } from '../../../services/card-data.service';

describe('CreditsThemeComponent', () => {
  let fixture: ComponentFixture<CreditsThemeComponent>;
  let host: HTMLElement;
  let data: CardDataService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreditsThemeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CreditsThemeComponent);
    host = fixture.nativeElement as HTMLElement;
    data = TestBed.inject(CardDataService);
    fixture.detectChanges();
  });

  it('should keep a short run of bands on one line', () => {
    expect(host.querySelectorAll('.crd-band').length).toBe(3);
    expect(host.querySelector('.crd-band-break')).toBeNull();
  });

  it('should split seven bands into rows of four and three', () => {
    data.cardData.update((d) => ({ ...d, filters: d.filters.map((f) => ({ ...f, enabled: true })) }));
    fixture.detectChanges();

    const separators = Array.from(host.querySelectorAll('.crd-band-line .crd-faint'));

    expect(separators.length).toBe(6);
    expect(separators.findIndex((el) => el.classList.contains('crd-band-break'))).toBe(3);
  });

  it('should tint the glow at the top of the sheet with the secondary colour', () => {
    data.cardData.update((d) => ({ ...d, secondaryAccentColor: '#FF00FF' }));
    fixture.detectChanges();

    const root = host.querySelector<HTMLElement>('.crd-root');

    expect(root?.style.getPropertyValue('--crd-secondary-rgb')).toBe('255, 0, 255');
  });

  it('should keep each place name in the release line whole', () => {
    data.cardData.update((d) => ({ ...d, location: 'Mount Laguna Observatory, San Diego County' }));
    fixture.detectChanges();

    const meta = host.querySelector('.crd-release-meta')?.textContent ?? '';

    expect(meta).toContain('Mount Laguna Observatory, San Diego County');
  });
});
