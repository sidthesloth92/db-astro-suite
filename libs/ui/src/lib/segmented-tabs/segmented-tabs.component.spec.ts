import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SegmentedTabsComponent } from './segmented-tabs.component';
import type { SegmentedTabOption } from './segmented-tabs.model';

@Component({
  standalone: true,
  imports: [SegmentedTabsComponent],
  template: `
    <dba-ui-segmented-tabs
      [options]="options"
      [value]="value()"
      [size]="'sm'"
      [disabled]="disabled()"
      (valueChange)="onChange($event)"
    />
  `,
})
class HostComponent {
  readonly options: readonly SegmentedTabOption[] = [
    { id: 'infographic', label: 'Info' },
    { id: 'stellar', label: 'Stellar' },
  ];
  readonly value = signal('infographic');
  readonly disabled = signal(false);
  emitted = '';
  onChange(next: string): void {
    this.emitted = next;
    this.value.set(next);
  }
}

describe('SegmentedTabsComponent', () => {
  function fixture() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const f = TestBed.createComponent(HostComponent);
    f.detectChanges();
    return f;
  }

  it('should render one tab per option with the labels', () => {
    const f = fixture();
    const tabs = (f.nativeElement as HTMLElement).querySelectorAll('.tab');
    expect(tabs.length).toBe(2);
    expect(tabs[0].textContent?.trim()).toBe('Info');
    expect(tabs[1].textContent?.trim()).toBe('Stellar');
  });

  it('should mark the active tab with aria-selected="true"', () => {
    const f = fixture();
    const tabs = (f.nativeElement as HTMLElement).querySelectorAll('.tab');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
  });

  it('should emit the new id when the user picks a different tab', () => {
    const f = fixture();
    const tabs = (f.nativeElement as HTMLElement).querySelectorAll('.tab');
    (tabs[1] as HTMLButtonElement).click();
    expect(f.componentInstance.emitted).toBe('stellar');
  });

  it('should NOT emit when the user clicks the already-selected tab', () => {
    const f = fixture();
    const tabs = (f.nativeElement as HTMLElement).querySelectorAll('.tab');
    f.componentInstance.emitted = '';
    (tabs[0] as HTMLButtonElement).click();
    expect(f.componentInstance.emitted).toBe('');
  });

  it('should disable every tab and not emit when disabled is set', () => {
    const f = fixture();
    f.componentInstance.disabled.set(true);
    f.detectChanges();
    const tabs = (f.nativeElement as HTMLElement).querySelectorAll('.tab');
    expect((tabs[0] as HTMLButtonElement).disabled).toBeTrue();
    expect((tabs[1] as HTMLButtonElement).disabled).toBeTrue();
    f.componentInstance.emitted = '';
    (tabs[1] as HTMLButtonElement).click();
    expect(f.componentInstance.emitted).toBe('');
  });
});
