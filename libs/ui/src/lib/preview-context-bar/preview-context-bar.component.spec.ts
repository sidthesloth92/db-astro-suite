import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { SegmentedTabOption } from '../segmented-tabs/segmented-tabs.model';
import type { SelectItem } from '../select/select.model';
import { PreviewContextBarComponent } from './preview-context-bar.component';

const SIZE_OPTIONS: readonly SelectItem[] = [
  {
    label: 'Instagram',
    options: [
      { value: 'ig-square', label: '1:1 · Square · 1080×1080' },
      { value: 'ig-portrait', label: '4:5 · Portrait · 1080×1350' },
    ],
  },
];

const MODE_OPTIONS: readonly SegmentedTabOption[] = [
  { id: 'infographic', label: 'Info' },
  { id: 'stellar', label: 'Stellar' },
];

@Component({
  standalone: true,
  imports: [PreviewContextBarComponent],
  template: `
    <dba-ui-preview-context-bar
      [dimensions]="'1080 × 1440'"
      [zoomLevels]="[50, 100, 150]"
      [currentZoom]="currentZoom()"
      [sizeOptions]="sizeOptions"
      [selectedSizeKey]="selectedSizeKey()"
      [modeOptions]="modeOptions"
      [selectedModeId]="selectedModeId()"
      (zoomChange)="onZoom($event)"
      (sizeChange)="onSize($event)"
      (modeChange)="onMode($event)"
    />
  `,
})
class HostComponent {
  readonly currentZoom = signal(100);
  readonly selectedSizeKey = signal<string>('ig-square');
  readonly selectedModeId = signal<string>('infographic');
  readonly sizeOptions = SIZE_OPTIONS;
  readonly modeOptions = MODE_OPTIONS;
  emittedZoom: number | null = null;
  emittedSize: string | null = null;
  emittedMode: string | null = null;
  onZoom(next: number): void {
    this.emittedZoom = next;
  }
  onSize(next: string): void {
    this.emittedSize = next;
  }
  onMode(next: string): void {
    this.emittedMode = next;
  }
}

describe('PreviewContextBarComponent', () => {
  function fixture() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const f = TestBed.createComponent(HostComponent);
    f.detectChanges();
    return f;
  }

  it('renders the dimension string', () => {
    const f = fixture();
    const root = f.nativeElement as HTMLElement;
    expect(root.querySelector('.dim')?.textContent?.trim()).toBe('1080 × 1440');
  });

  it('renders one option per zoom level inside the zoom select', () => {
    const f = fixture();
    const zoomSelect = (f.nativeElement as HTMLElement).querySelector(
      '.zoom-select select',
    ) as HTMLSelectElement;
    expect(zoomSelect.options.length).toBe(3);
  });

  it('selects the current zoom inside the zoom select', () => {
    const f = fixture();
    const zoomSelect = (f.nativeElement as HTMLElement).querySelector(
      '.zoom-select select',
    ) as HTMLSelectElement;
    expect(zoomSelect.value).toBe('100');
  });

  it('emits zoomChange when a different zoom is picked', () => {
    const f = fixture();
    const zoomSelect = (f.nativeElement as HTMLElement).querySelector(
      '.zoom-select select',
    ) as HTMLSelectElement;
    zoomSelect.value = '150';
    zoomSelect.dispatchEvent(new Event('change'));
    expect(f.componentInstance.emittedZoom).toBe(150);
  });

  it('emits sizeChange with the chosen key', () => {
    const f = fixture();
    const sizeSelect = (f.nativeElement as HTMLElement).querySelector(
      '.size-select select',
    ) as HTMLSelectElement;
    sizeSelect.value = 'ig-portrait';
    sizeSelect.dispatchEvent(new Event('change'));
    expect(f.componentInstance.emittedSize).toBe('ig-portrait');
  });

  it('emits modeChange when a mode tab is clicked', () => {
    const f = fixture();
    const tabs = (f.nativeElement as HTMLElement).querySelectorAll('[role="tab"]');
    (tabs[1] as HTMLButtonElement).click();
    expect(f.componentInstance.emittedMode).toBe('stellar');
  });
});
