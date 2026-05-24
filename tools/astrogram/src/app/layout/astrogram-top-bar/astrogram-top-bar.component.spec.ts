import { TestBed } from '@angular/core/testing';
import { AstrogramTopBarComponent } from './astrogram-top-bar.component';

describe('AstrogramTopBarComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AstrogramTopBarComponent],
    }).compileComponents();
  });

  it('renders the brand wordmark from the shared header', () => {
    const fixture = TestBed.createComponent(AstrogramTopBarComponent);
    fixture.detectChanges();
    const word = fixture.nativeElement.querySelector('.brand-title') as HTMLElement;
    expect(word?.textContent).toContain('astrogram');
  });

  it('no longer renders mode tabs (they moved to the preview-context-bar)', () => {
    const fixture = TestBed.createComponent(AstrogramTopBarComponent);
    fixture.detectChanges();
    const tabs = fixture.nativeElement.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(0);
  });

  it('does not render an Export CTA in the actions cluster', () => {
    const fixture = TestBed.createComponent(AstrogramTopBarComponent);
    fixture.detectChanges();
    const exportBtn = fixture.nativeElement.querySelector('.export-btn');
    expect(exportBtn).toBeNull();
  });

  it('renders a GitHub icon link with rel noopener', () => {
    const fixture = TestBed.createComponent(AstrogramTopBarComponent);
    fixture.detectChanges();
    const github = fixture.nativeElement.querySelector('.github-link') as HTMLAnchorElement | null;
    expect(github?.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
