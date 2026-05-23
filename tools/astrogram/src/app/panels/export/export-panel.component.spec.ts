import { TestBed } from '@angular/core/testing';
import { ExportPanelComponent } from './export-panel.component';

describe('ExportPanelComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportPanelComponent],
    }).compileComponents();
  });

  it('toggles the format selection', () => {
    const fixture = TestBed.createComponent(ExportPanelComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.format()).toBe('jpeg');
    fixture.componentInstance.selectFormat('png');
    expect(fixture.componentInstance.format()).toBe('png');
  });

  it('toggles a share target on then off when re-clicked', () => {
    const fixture = TestBed.createComponent(ExportPanelComponent);
    fixture.detectChanges();
    fixture.componentInstance.selectShareTarget('twitter');
    expect(fixture.componentInstance.shareTarget()).toBe('twitter');
    fixture.componentInstance.selectShareTarget('twitter');
    expect(fixture.componentInstance.shareTarget()).toBeNull();
  });

  it('emits exportRequested when CTA is clicked', () => {
    const fixture = TestBed.createComponent(ExportPanelComponent);
    fixture.detectChanges();
    let fired = 0;
    fixture.componentInstance.exportRequested.subscribe(() => fired++);
    const cta = fixture.nativeElement.querySelector('.cta-btn') as HTMLButtonElement;
    cta.click();
    expect(fired).toBe(1);
  });
});
