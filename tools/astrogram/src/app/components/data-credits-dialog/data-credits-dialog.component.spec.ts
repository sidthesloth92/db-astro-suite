import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataCreditsDialogComponent } from './data-credits-dialog.component';

@Component({
  standalone: true,
  imports: [DataCreditsDialogComponent],
  template: `<dba-ag-data-credits-dialog [open]="open()" (closed)="onClosed()" />`,
})
class HostComponent {
  readonly open = signal(true);
  closedCount = 0;
  onClosed(): void {
    this.closedCount++;
    this.open.set(false);
  }
}

describe('DataCreditsDialogComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('should list the plate solver and the star map data sources with their licenses', () => {
    const text = root().textContent ?? '';
    for (const source of ['Astrometry.net', 'Gaia DR3', 'OpenNGC', 'IAU Catalog of Star Names', 'SIMBAD and VizieR', 'Wikipedia']) {
      expect(text).toContain(source);
    }
    expect(text).toContain('ESA/Gaia/DPAC');
    expect(text).toContain('CC BY-SA 4.0');
    expect(text).toContain('CC BY-NC 3.0 IGO');
  });

  it('should be labelled as a modal dialog and take focus when it opens', () => {
    const dialog = root().querySelector('[role="dialog"]') as HTMLElement | null;
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBe('dc-title');
    expect(document.activeElement).toBe(dialog);
  });

  it('should close when Escape is pressed', () => {
    const dialog = root().querySelector('[role="dialog"]') as HTMLElement;
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.closedCount).toBe(1);
    expect(root().querySelector('[role="dialog"]')).toBeNull();
  });

  it('should close when the backdrop is clicked but not when the card is clicked', () => {
    (root().querySelector('.dc-card') as HTMLElement).click();
    expect(fixture.componentInstance.closedCount).toBe(0);

    (root().querySelector('.dc-backdrop') as HTMLElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.closedCount).toBe(1);
  });

  it('should open source links in a new tab', () => {
    const links = Array.from(root().querySelectorAll('.dc-name a')) as HTMLAnchorElement[];
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.getAttribute('target')).toBe('_blank');
    }
  });
});
