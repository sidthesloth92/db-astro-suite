import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StarCardThemeComponent } from './star-card-theme.component';
import { CardDataService } from '../../../services/card-data.service';

describe('StarCardThemeComponent', () => {
  let fixture: ComponentFixture<StarCardThemeComponent>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StarCardThemeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StarCardThemeComponent);
    host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should show the Bortle class beside the date, location and handle in the rarity bar', () => {
    expect(host.querySelector('.stc-rarity-class')?.textContent?.trim()).toBe('BORTLE CLASS 9');

    const meta = host.querySelector('.stc-rarity-meta')?.textContent ?? '';
    expect(meta).toContain('Irving, Texas');
    expect(meta).toContain('@ASTROGRAM');
  });

  it('should let a long rarity meta wrap only between whole items', () => {
    TestBed.inject(CardDataService).cardData.update((d) => ({
      ...d,
      location: 'Mount Laguna Observatory, San Diego County',
    }));
    fixture.detectChanges();

    const meta = host.querySelector('.stc-rarity-meta')?.textContent ?? '';

    // Place names keep their words together, and each separator is held to
    // the item before it so no line starts with a dot.
    expect(meta).toContain('Mount Laguna Observatory, San Diego County · @ASTROGRAM');
  });
});
