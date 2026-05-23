import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PreviewContextBarComponent } from './preview-context-bar.component';

@Component({
  standalone: true,
  imports: [PreviewContextBarComponent],
  template: `
    <dba-ui-preview-context-bar
      [dimensions]="'1080 × 1440'"
      [zoomLevels]="[50, 100, 150]"
      [currentZoom]="current()"
      (zoomChange)="onZoom($event)"
    />
  `,
})
class HostComponent {
  readonly current = signal(100);
  emitted: number | null = null;
  onZoom(next: number): void {
    this.emitted = next;
  }
}

describe('PreviewContextBarComponent', () => {
  function fixture() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const f = TestBed.createComponent(HostComponent);
    f.detectChanges();
    return f;
  }

  it('should render the dimension string and one button per zoom level', () => {
    const f = fixture();
    const root = f.nativeElement as HTMLElement;
    expect(root.querySelector('.dim')?.textContent?.trim()).toBe('1080 × 1440');
    expect(root.querySelectorAll('.zoom-btn').length).toBe(3);
  });

  it('should mark the current zoom as active', () => {
    const f = fixture();
    const buttons = (f.nativeElement as HTMLElement).querySelectorAll('.zoom-btn');
    expect(buttons[1].classList.contains('is-active')).toBe(true);
  });

  it('should emit zoomChange when a different zoom is picked', () => {
    const f = fixture();
    const buttons = (f.nativeElement as HTMLElement).querySelectorAll('.zoom-btn');
    (buttons[2] as HTMLButtonElement).click();
    expect(f.componentInstance.emitted).toBe(150);
  });
});
