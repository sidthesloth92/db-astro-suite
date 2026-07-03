import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreditsIvoryThemeComponent } from './credits-ivory-theme.component';

describe('CreditsIvoryThemeComponent', () => {
  let fixture: ComponentFixture<CreditsIvoryThemeComponent>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreditsIvoryThemeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CreditsIvoryThemeComponent);
    host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should split the object name into a solid and an outline line', () => {
    const hero = host.querySelector('[data-testid="card-hero"]');
    expect(host.querySelector('.cri-title-solid')?.textContent).toContain('Rosette');
    expect(host.querySelector('.cri-title-outline')?.textContent).toContain('Nebula');
    expect(hero).toBeTruthy();
  });

  it('should render the billing block credits from the card data', () => {
    const billing = host.querySelector('.cri-billing');
    expect(billing?.textContent).toContain('Captured by');
    expect(billing?.textContent).toContain('@astrogram');
    expect(billing?.textContent).toContain('Askar 103 APO × ZWO ASI2600MM Air');
    expect(billing?.textContent).toContain('124 frames');
  });

  it('should render a big numeric release date in MM.DD.YY form', () => {
    const date = host.querySelector('.cri-release-date');
    expect(date?.textContent?.trim()).toMatch(/^\d{2}\.\d{2}\.\d{2}$/);
  });

  it('should render the release sub-line with bortle and location', () => {
    const sub = host.querySelector('.cri-release-sub');
    expect(sub?.textContent).toContain('Bortle 9');
    expect(sub?.textContent).toContain('Irving, Texas');
  });
});
