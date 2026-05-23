import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FloatingSheetComponent } from './floating-sheet.component';

@Component({
  standalone: true,
  imports: [FloatingSheetComponent],
  template: `
    <dba-ui-floating-sheet
      [(expanded)]="expanded"
      [title]="'Capture'"
    >
      <div class="body-content">body</div>
      <div slot="nav" class="nav-content">nav</div>
    </dba-ui-floating-sheet>
  `,
})
class HostComponent {
  readonly expanded = signal(true);
}

describe('FloatingSheetComponent', () => {
  function fixture() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const f = TestBed.createComponent(HostComponent);
    f.detectChanges();
    return f;
  }

  it('should render the title, body, and projected nav when expanded', () => {
    const f = fixture();
    const root = f.nativeElement as HTMLElement;
    expect(root.querySelector('.title')?.textContent?.trim()).toBe('Capture');
    expect(root.querySelector('.body-content')?.textContent).toBe('body');
    expect(root.querySelector('.nav-content')?.textContent).toBe('nav');
  });

  it('should hide the body but keep the nav slot when collapsed', () => {
    const f = fixture();
    f.componentInstance.expanded.set(false);
    f.detectChanges();
    const root = f.nativeElement as HTMLElement;
    expect(root.querySelector('.body')).toBeNull();
    expect(root.querySelector('.nav-content')?.textContent).toBe('nav');
  });

  it('should two-way bind `expanded` so clicking the close button collapses it', () => {
    const f = fixture();
    const close = (f.nativeElement as HTMLElement).querySelector('.close') as HTMLButtonElement;
    close.click();
    f.detectChanges();
    expect(f.componentInstance.expanded()).toBe(false);
  });
});
