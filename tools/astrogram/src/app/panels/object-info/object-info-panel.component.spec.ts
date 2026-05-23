import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { CardData } from '../../models/card-data.model';
import { DEFAULT_FILTERS, DEFAULT_GLOBAL_ANNOTATION_SETTINGS } from '../../models/card-data.model';
import { AstroInfoService } from '../../services/astro-info.service';
import { CardDataService } from '../../services/card-data.service';
import { ObjectInfoPanelComponent } from './object-info-panel.component';

const seed: CardData = {
  title: 'Test',
  date: '2026-05-20',
  location: 'Irving',
  author: '@astrogram',
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
  hashtags: '#space',
};

describe('ObjectInfoPanelComponent', () => {
  let stub: {
    cardData: ReturnType<typeof signal<CardData>>;
    updateData: jasmine.Spy;
  };
  let infoStub: { getObjectDescription: jasmine.Spy };

  beforeEach(async () => {
    stub = {
      cardData: signal<CardData>({ ...seed }),
      updateData: jasmine.createSpy('updateData').and.callFake((patch: Partial<CardData>) => {
        stub.cardData.update((d) => ({ ...d, ...patch }));
      }),
    };
    infoStub = { getObjectDescription: jasmine.createSpy('getObjectDescription') };

    await TestBed.configureTestingModule({
      imports: [ObjectInfoPanelComponent],
      providers: [
        { provide: CardDataService, useValue: stub },
        { provide: AstroInfoService, useValue: infoStub },
      ],
    }).compileComponents();
  });

  it('writes title edits back via CardDataService.updateData', () => {
    const fixture = TestBed.createComponent(ObjectInfoPanelComponent);
    fixture.detectChanges();
    fixture.componentInstance.update('title', 'NGC 7000');
    expect(stub.updateData).toHaveBeenCalledWith({ title: 'NGC 7000' });
  });

  it('strips the @ from author when writing & re-attaches it on input', () => {
    const fixture = TestBed.createComponent(ObjectInfoPanelComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.authorValue()).toBe('astrogram');
    fixture.componentInstance.onAuthorChange('newuser');
    expect(stub.cardData().author).toBe('@newuser');
  });

  it('rebuilds hashtags as space-separated #tokens', () => {
    const fixture = TestBed.createComponent(ObjectInfoPanelComponent);
    fixture.detectChanges();
    fixture.componentInstance.onHashtagsChange('space   astrophotography  ');
    expect(stub.cardData().hashtags).toBe('#space #astrophotography');
  });

  it('appends fetched wiki extract to the caption', async () => {
    infoStub.getObjectDescription.and.resolveTo({ description: 'd', extract: 'EXTRACT' });
    const fixture = TestBed.createComponent(ObjectInfoPanelComponent);
    fixture.detectChanges();
    await fixture.componentInstance.fetchWiki();
    expect(stub.cardData().caption).toContain('EXTRACT');
  });
});
