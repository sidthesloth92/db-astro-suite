import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardDataService } from '../../../services/card-data.service';
import { StarTrailsThemeComponent } from './star-trails-theme.component';

describe('StarTrailsThemeComponent', () => {
  let fixture: ComponentFixture<StarTrailsThemeComponent>;
  let host: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [StarTrailsThemeComponent] });
    fixture = TestBed.createComponent(StarTrailsThemeComponent);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  it('should render the object name in the hero title', () => {
    expect(host.querySelector('[data-testid="card-hero"]')?.textContent).toContain('Rosette Nebula');
  });

  it('should wrap the footer location only between its comma-separated parts', () => {
    TestBed.inject(CardDataService).cardData.update((card) => ({
      ...card,
      location: 'Mount Laguna Observatory, San Diego County, California',
    }));
    fixture.detectChanges();

    const meta = host.querySelector('.st-foot-meta')?.textContent ?? '';
    expect(meta).toContain('San Diego County');
    expect(meta).toContain('California · Bortle 9');
  });
});
