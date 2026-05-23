import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';
import type { CardData } from '../../models/card-data.model';
import { DEFAULT_FILTERS } from '../../models/card-data.model';
import { CardDataService } from '../../services/card-data.service';
import { CapturePanelComponent } from './capture-panel.component';

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
  secondaryAccentColor: '#00E5FF',
  cardOpacity: 0.6,
  backgroundImage: null,
  aspectRatio: '3:4',
});

/**
 * Returns an AnalyticsService stub where every method is a no-op spy.
 * Using a Proxy keeps the test resilient if new analytics methods are
 * added to the abstract class — we don't have to keep this stub in sync.
 */
function makeAnalyticsStub(): Record<string, jasmine.Spy> {
  return new Proxy({} as Record<string, jasmine.Spy>, {
    get(target, prop: string) {
      if (!target[prop]) {
        target[prop] = jasmine.createSpy(prop);
      }
      return target[prop];
    },
  });
}

describe('CapturePanelComponent', () => {
  let stub: {
    cardData: ReturnType<typeof signal<CardData>>;
    updateData: jasmine.Spy;
    mutateData: jasmine.Spy;
  };
  let analyticsStub: Record<string, jasmine.Spy>;

  beforeEach(async () => {
    stub = {
      cardData: signal<CardData>(seed()),
      updateData: jasmine.createSpy('updateData').and.callFake((patch: Partial<CardData>) => {
        stub.cardData.update((d) => ({ ...d, ...patch }));
      }),
      mutateData: jasmine.createSpy('mutateData').and.callFake((fn: (d: CardData) => void) => {
        stub.cardData.update((d) => {
          const cloned: CardData = JSON.parse(JSON.stringify(d));
          fn(cloned);
          return cloned;
        });
      }),
    };
    analyticsStub = makeAnalyticsStub();

    await TestBed.configureTestingModule({
      imports: [CapturePanelComponent],
      providers: [
        { provide: CardDataService, useValue: stub },
        { provide: AnalyticsService, useValue: analyticsStub },
      ],
    }).compileComponents();
  });

  it('toggles filter enabled state', () => {
    const fixture = TestBed.createComponent(CapturePanelComponent);
    fixture.detectChanges();
    const initial = stub.cardData().filters[0].enabled;
    fixture.componentInstance.toggleFilter(0);
    expect(stub.cardData().filters[0].enabled).toBe(!initial);
  });

  it('records bortle changes through analytics', () => {
    const fixture = TestBed.createComponent(CapturePanelComponent);
    fixture.detectChanges();
    fixture.componentInstance.setBortle(3);
    expect(analyticsStub['trackSettingChanged']).toHaveBeenCalledWith('bortle_scale', 3);
    expect(stub.cardData().bortleScale).toBe(3);
  });

  it('appends a custom filter row', () => {
    const fixture = TestBed.createComponent(CapturePanelComponent);
    fixture.detectChanges();
    const before = stub.cardData().filters.length;
    fixture.componentInstance.addCustomFilter();
    expect(stub.cardData().filters.length).toBe(before + 1);
  });

  it('preserves frames when the user later edits the row name (regression)', () => {
    // Reproduces the bug where Frames=10 set on a freshly added custom
    // row was lost as soon as the user typed into the Name input. The
    // E2E hit this because of a Playwright locator race (the generic
    // `Frames` aria-label resolved to the previous row before Angular
    // rendered the new one), but at the component level we still want a
    // guard against any future regression that would drop the value.
    const fixture = TestBed.createComponent(CapturePanelComponent);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;

    cmp.addCustomFilter();
    const newIndex = stub.cardData().filters.length - 1;

    const framesEvent = { target: { value: '10' } } as unknown as Event;
    cmp.setFrames(newIndex, framesEvent);

    const nameEvent = { target: { value: 'CUSTOM-HA' } } as unknown as Event;
    cmp.setName(newIndex, nameEvent);

    const row = stub.cardData().filters[newIndex];
    expect(row.frames).toBe(10);
    expect(row.name).toBe('CUSTOM-HA');
  });
});
