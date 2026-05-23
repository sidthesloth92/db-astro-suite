import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CardDataService } from '../../services/card-data.service';
import { AstrogramTopBarComponent } from './astrogram-top-bar.component';

type StubData = { activeMode: ReturnType<typeof signal<'infographic' | 'stellar-map'>> };

describe('AstrogramTopBarComponent', () => {
  let stub: StubData;

  beforeEach(async () => {
    stub = { activeMode: signal<'infographic' | 'stellar-map'>('infographic') };
    await TestBed.configureTestingModule({
      imports: [AstrogramTopBarComponent],
      providers: [{ provide: CardDataService, useValue: stub }],
    }).compileComponents();
  });

  it('renders the brand wordmark', () => {
    const fixture = TestBed.createComponent(AstrogramTopBarComponent);
    fixture.detectChanges();
    const word = fixture.nativeElement.querySelector('.brand-word') as HTMLElement;
    expect(word?.textContent).toContain('astrogram');
  });

  it('uses full-length tab labels when not compact', () => {
    const fixture = TestBed.createComponent(AstrogramTopBarComponent);
    fixture.detectChanges();
    const tabs = fixture.nativeElement.querySelectorAll('[role="tab"]');
    expect(tabs[0].textContent.trim()).toContain('Infographic');
    expect(tabs[1].textContent.trim()).toContain('Stellar Map');
  });

  it('uses short tab labels when compact', () => {
    const fixture = TestBed.createComponent(AstrogramTopBarComponent);
    fixture.componentRef.setInput('isCompact', true);
    fixture.detectChanges();
    const tabs = fixture.nativeElement.querySelectorAll('[role="tab"]');
    expect(tabs[0].textContent.trim()).toContain('Info');
    expect(tabs[1].textContent.trim()).toContain('Stellar');
  });

  it('updates CardDataService.activeMode when a tab is clicked', () => {
    const fixture = TestBed.createComponent(AstrogramTopBarComponent);
    fixture.detectChanges();
    let tabs = fixture.nativeElement.querySelectorAll('[role="tab"]') as NodeListOf<HTMLButtonElement>;
    tabs[1].click();
    fixture.detectChanges();
    expect(stub.activeMode()).toBe('stellar-map');
    tabs = fixture.nativeElement.querySelectorAll('[role="tab"]') as NodeListOf<HTMLButtonElement>;
    tabs[0].click();
    fixture.detectChanges();
    expect(stub.activeMode()).toBe('infographic');
  });

  it('emits exportClicked when the Export CTA is clicked', () => {
    const fixture = TestBed.createComponent(AstrogramTopBarComponent);
    fixture.detectChanges();
    let fired = 0;
    fixture.componentInstance.exportClicked.subscribe(() => fired++);
    const btn = fixture.nativeElement.querySelector('.export-btn') as HTMLButtonElement;
    btn.click();
    expect(fired).toBe(1);
  });
});
