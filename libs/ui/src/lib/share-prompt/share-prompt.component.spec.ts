import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SharePromptComponent } from './share-prompt.component';
import { SharePromptCopyStatus } from './share-prompt.types';

@Component({
  standalone: true,
  imports: [SharePromptComponent],
  template: `
    <dba-ui-share-prompt
      [open]="open()"
      appName="AstroSpike"
      itemNoun="image"
      [tags]="tags"
      [copyStatus]="copyStatus()"
      [copiedTags]="copiedTags()"
      (copyTag)="events.push('copy:' + $event)"
      (copyTags)="events.push('copyAll')"
      (dismiss)="events.push('dismiss')"
      (snooze)="events.push('snooze')"
      (optOut)="events.push('optOut')"
    />
  `,
})
class HostComponent {
  readonly open = signal(true);
  readonly copyStatus = signal<SharePromptCopyStatus>('idle');
  readonly copiedTags = signal<readonly string[]>([]);
  readonly tags = ['#dbastrosuite', '#astrospike', '@astrowithdb'];
  readonly events: string[] = [];
}

describe('SharePromptComponent', () => {
  function fixture() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const f = TestBed.createComponent(HostComponent);
    f.detectChanges();
    return f;
  }

  function buttonByText(root: HTMLElement, text: string): HTMLButtonElement | undefined {
    return Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.trim() === text);
  }

  function dialogText(root: HTMLElement): string {
    return root.querySelector('[role="dialog"]')?.textContent ?? '';
  }

  it('should name the app and what it exports, and offer every tag as a chip', () => {
    const root = fixture().nativeElement as HTMLElement;
    expect(dialogText(root)).toContain('Posting your image?');
    expect(dialogText(root)).toContain('Support AstroSpike');
    expect(dialogText(root)).toContain('how AstroSpike stays free');
    const chips = Array.from(root.querySelectorAll('li button')).map((b) => b.textContent?.trim());
    expect(chips).toEqual(['#dbastrosuite', '#astrospike', '@astrowithdb']);
  });

  it('should render nothing while closed', () => {
    const f = fixture();
    f.componentInstance.open.set(false);
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelector('[role="dialog"]')).toBeNull();
  });

  it('should emit a single tag, copy all, snooze and opt-out from their buttons', () => {
    const f = fixture();
    const root = f.nativeElement as HTMLElement;
    buttonByText(root, '#astrospike')?.click();
    buttonByText(root, 'Copy all tags')?.click();
    buttonByText(root, 'Maybe later')?.click();
    buttonByText(root, "Don't show again")?.click();
    expect(f.componentInstance.events).toEqual(['copy:#astrospike', 'copyAll', 'snooze', 'optOut']);
  });

  it('should dismiss from the top-right close button', () => {
    const f = fixture();
    const root = f.nativeElement as HTMLElement;
    (root.querySelector('button[aria-label="Close"]') as HTMLButtonElement).click();
    expect(f.componentInstance.events).toEqual(['dismiss']);
  });

  it('should dismiss on Escape and on a backdrop click, but not on a click inside the card', () => {
    const f = fixture();
    const root = f.nativeElement as HTMLElement;
    const dialog = root.querySelector('[role="dialog"]') as HTMLElement;
    dialog.click();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    (root.querySelector('.sp-backdrop') as HTMLElement).click();
    expect(f.componentInstance.events).toEqual(['dismiss', 'dismiss']);
  });

  it('should thank the user and highlight the chip as soon as one tag is copied', () => {
    const f = fixture();
    const root = f.nativeElement as HTMLElement;
    const frame = root.querySelector('.sp-frame') as HTMLElement;
    expect(frame.classList).not.toContain('is-thanked');

    f.componentInstance.copiedTags.set(['#astrospike']);
    f.detectChanges();

    expect(frame.classList).toContain('is-thanked');
    expect(dialogText(root)).toContain('Tag copied');
    expect(dialogText(root)).toContain('Thank you, truly');
    expect(buttonByText(root, '#astrospike')?.classList).toContain('is-copied');
    expect(buttonByText(root, '#dbastrosuite')?.classList).not.toContain('is-copied');
    // The button only confirms once every tag is copied.
    expect(buttonByText(root, 'Copy all tags')).toBeDefined();
    expect(buttonByText(root, 'Maybe later')).toBeUndefined();
  });

  it('should confirm on the button once every tag is copied, leaving only the close button', () => {
    const f = fixture();
    f.componentInstance.copyStatus.set('copied');
    f.componentInstance.copiedTags.set(f.componentInstance.tags);
    f.detectChanges();
    const root = f.nativeElement as HTMLElement;
    expect(dialogText(root)).toContain('Thank you, truly');
    expect(dialogText(root)).toContain('Tags copied');
    expect(buttonByText(root, 'All tags copied')).toBeDefined();
    expect(root.querySelector('button[aria-label="Close"]')).not.toBeNull();
    expect(buttonByText(root, 'Maybe later')).toBeUndefined();
    expect(buttonByText(root, "Don't show again")).toBeUndefined();
  });

  it('should explain how to copy by hand when copying fails', () => {
    const f = fixture();
    f.componentInstance.copyStatus.set('failed');
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain(
      '#dbastrosuite #astrospike @astrowithdb',
    );
  });
});
