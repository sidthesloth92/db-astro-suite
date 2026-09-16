import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FilmEdgeThemeComponent } from './film-edge-theme.component';
import { CardDataService } from '../../../services/card-data.service';

describe('FilmEdgeThemeComponent', () => {
  let fixture: ComponentFixture<FilmEdgeThemeComponent>;
  let host: HTMLElement;
  let data: CardDataService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilmEdgeThemeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FilmEdgeThemeComponent);
    host = fixture.nativeElement as HTMLElement;
    data = TestBed.inject(CardDataService);
    fixture.detectChanges();
  });

  it('should tint the nebula glow in the frame with the secondary colour', () => {
    data.cardData.update((d) => ({ ...d, secondaryAccentColor: '#FF00FF' }));
    fixture.detectChanges();

    const root = host.querySelector<HTMLElement>('.flm-root');

    expect(root?.style.getPropertyValue('--flm-secondary-rgb')).toBe('255, 0, 255');
  });
});
