import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { CardData } from '../../models/card-data.model';
import { DEFAULT_FILTERS } from '../../models/card-data.model';
import { CardDataService } from '../../services/card-data.service';
import { StylePanelComponent } from './style-panel.component';

const seed = (): CardData => ({
  title: 'X',
  date: '2026-05-20',
  location: 'Irving',
  author: '@a',
  filters: JSON.parse(JSON.stringify(DEFAULT_FILTERS)),
  equipment: [],
  software: [],
  bortleScale: 9,
  pixelSize: 3.76,
  focalLength: null,
  accentColor: '#ff2d95',
  cardOpacity: 0.6,
  backgroundImage: null,
  aspectRatio: '3:4',
});

describe('StylePanelComponent', () => {
  let stub: {
    cardData: ReturnType<typeof signal<CardData>>;
    updateData: jasmine.Spy;
  };

  beforeEach(async () => {
    stub = {
      cardData: signal<CardData>(seed()),
      updateData: jasmine.createSpy('updateData').and.callFake((patch: Partial<CardData>) => {
        stub.cardData.update((d) => ({ ...d, ...patch }));
      }),
    };
    await TestBed.configureTestingModule({
      imports: [StylePanelComponent],
      providers: [{ provide: CardDataService, useValue: stub }],
    }).compileComponents();
  });

  it('writes the accent colour & parsed rgb tuple', () => {
    const fixture = TestBed.createComponent(StylePanelComponent);
    fixture.detectChanges();
    fixture.componentInstance.setAccentColor('#00FF00');
    expect(stub.cardData().accentColor).toBe('#00FF00');
    expect(stub.cardData().accentColorRgb).toBe('0, 255, 0');
  });

  it('clamps opacity to 0–100 and stores as 0–1', () => {
    const fixture = TestBed.createComponent(StylePanelComponent);
    fixture.detectChanges();
    fixture.componentInstance.setOpacityPercent(250);
    expect(stub.cardData().cardOpacity).toBe(1);
    fixture.componentInstance.setOpacityPercent(-12);
    expect(stub.cardData().cardOpacity).toBe(0);
  });

  it('changes the aspect ratio on format pick', () => {
    const fixture = TestBed.createComponent(StylePanelComponent);
    fixture.detectChanges();
    fixture.componentInstance.setFormat('4:5');
    expect(stub.cardData().aspectRatio).toBe('4:5');
  });
});
