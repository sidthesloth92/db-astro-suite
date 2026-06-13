import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  PLATFORM_ID,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { chevronIcon } from '../icons/chevron.icon';
import { SplitButtonMenuItem } from './split-button.model';

/**
 * Split action button: a primary segment that fires `mainClick` plus a
 * chevron segment that opens a dropdown menu of {@link SplitButtonMenuItem}s
 * (single-select, radio semantics). Purely presentational — the parent owns
 * the label, the item list, and the selected value.
 *
 * Theming: every colour/surface is driven by `--dba-split-button-*` CSS
 * custom properties (with library-token defaults), and the `dataState` input
 * is reflected as a `data-state` attribute on the host so consumers can
 * restyle states (e.g. a recording pulse) without piercing the component.
 */
@Component({
  selector: 'dba-ui-split-button',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './split-button.component.html',
  styleUrl: './split-button.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-state]': 'dataState()',
  },
})
export class SplitButtonComponent {
  /** Text rendered in the primary segment. */
  label = input<string>('');
  /** Items rendered in the dropdown menu. */
  menuItems = input<readonly SplitButtonMenuItem[]>([]);
  /** Value of the currently selected menu item (radio semantics). */
  selectedValue = input<string>('');
  /** Disables the whole control (both segments). */
  disabled = input<boolean>(false);
  /** Disables only the chevron/menu segment. */
  menuDisabled = input<boolean>(false);
  /** Free-form state string reflected as `data-state` on the host and segments. */
  dataState = input<string>('');
  /** Accessible label for the chevron segment. */
  menuAriaLabel = input<string>('More options');
  /** Whether the menu drops below the button or opens above it. */
  menuPlacement = input<'down' | 'up'>('down');

  /** Emits when the primary segment is pressed. */
  mainClick = output<void>();
  /** Emits the chosen item's value; the menu closes itself afterwards. */
  menuSelect = output<string>();

  /** Open state of the dropdown menu. */
  protected readonly isMenuOpen = signal(false);
  /** Chevron glyph rendered in the menu segment. */
  protected readonly chevronIcon = chevronIcon;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject(ElementRef<HTMLElement>);

  constructor() {
    // While the menu is open, close it on Escape or any pointer press
    // outside the component. Listeners are removed whenever it closes.
    effect((onCleanup) => {
      if (!isPlatformBrowser(this.platformId) || !this.isMenuOpen()) return;
      const onPointerDown = (event: Event): void => {
        if (!this.host.nativeElement.contains(event.target as Node)) {
          this.isMenuOpen.set(false);
        }
      };
      const onKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
          this.isMenuOpen.set(false);
        }
      };
      this.document.addEventListener('pointerdown', onPointerDown);
      this.document.addEventListener('keydown', onKeyDown);
      onCleanup(() => {
        this.document.removeEventListener('pointerdown', onPointerDown);
        this.document.removeEventListener('keydown', onKeyDown);
      });
    });
  }

  /** Primary-segment click handler — closes the menu and emits `mainClick`. */
  protected onMainClick(): void {
    this.isMenuOpen.set(false);
    this.mainClick.emit();
  }

  /** Chevron click handler — toggles the dropdown menu. */
  protected onToggleMenu(): void {
    this.isMenuOpen.update((open) => !open);
  }

  /** Menu-row click handler — emits the value and closes the menu. */
  protected onItemSelect(value: string): void {
    this.isMenuOpen.set(false);
    this.menuSelect.emit(value);
  }
}
