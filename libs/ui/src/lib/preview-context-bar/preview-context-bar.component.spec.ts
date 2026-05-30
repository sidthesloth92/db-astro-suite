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

@Component({
  standalone: true,
  imports: [PreviewContextBarComponent],
  template: `<dba-ui-preview-context-bar [modeOptions]="[]" />`,
})
class EmptyHostComponent {}

describe('PreviewContextBarComponent', () => {
  function fixture() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const f = TestBed.createComponent(HostComponent);
    f.detectChanges();
    return f;
  }

  it('renders the mode tabs when modeOptions are provided', () => {
    const f = fixture();
    const tabs = (f.nativeElement as HTMLElement).querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(2);
  });

  it('marks the selected mode tab as aria-selected', () => {
    const f = fixture();
    const tabs = (f.nativeElement as HTMLElement).querySelectorAll('[role="tab"]');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
  });

  it('emits modeChange when a different mode tab is clicked', () => {
    const f = fixture();
    const tabs = (f.nativeElement as HTMLElement).querySelectorAll('[role="tab"]');
    (tabs[1] as HTMLButtonElement).click();
    expect(f.componentInstance.emittedMode).toBe('stellar');
  });

  it('renders nothing inside the bar when modeOptions are empty', () => {
    TestBed.configureTestingModule({ imports: [EmptyHostComponent] });
    const f = TestBed.createComponent(EmptyHostComponent);
    f.detectChanges();
    const tabs = (f.nativeElement as HTMLElement).querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(0);
  });
});
