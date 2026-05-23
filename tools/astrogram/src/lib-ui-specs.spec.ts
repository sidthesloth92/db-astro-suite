// TODO(lib-ui-test-target): replace this aggregator with a first-class test
// target for @db-astro-suite/ui. The proper fix is either to give libs/ui its
// own angular.json + ng-packagr build target with a Karma project entry, or to
// add a Jest/Vitest configuration that picks up libs/ui spec files directly.
// Both options are larger changes than this redesign PR — captured here as
// follow-up work.
//
// Until then, this file is the test entry point that re-imports every spec
// from @db-astro-suite/ui. The Angular Karma builder discovers spec files via
// globs relative to the application source root; because shared library specs
// live outside tools/astrogram/src/, they would otherwise be skipped.
// Importing them here pulls them into the test bundle without changing
// per-library tsconfigs.
import '../../../libs/ui/src/lib/bottom-nav/bottom-nav.component.spec';
import '../../../libs/ui/src/lib/color-swatch-input/color-swatch-input.component.spec';
import '../../../libs/ui/src/lib/data-row/data-row.component.spec';
import '../../../libs/ui/src/lib/floating-sheet/floating-sheet.component.spec';
import '../../../libs/ui/src/lib/icon-button/icon-button.component.spec';
import '../../../libs/ui/src/lib/icon-rail/icon-rail.component.spec';
import '../../../libs/ui/src/lib/icons/icons.spec';
import '../../../libs/ui/src/lib/inspector-field/inspector-field.component.spec';
import '../../../libs/ui/src/lib/inspector-section/inspector-section.component.spec';
import '../../../libs/ui/src/lib/micro-input/micro-input.component.spec';
import '../../../libs/ui/src/lib/micro-slider/micro-slider.component.spec';
import '../../../libs/ui/src/lib/pill-badge/pill-badge.component.spec';
import '../../../libs/ui/src/lib/preview-context-bar/preview-context-bar.component.spec';
import '../../../libs/ui/src/lib/progress-ring/progress-ring.component.spec';
import '../../../libs/ui/src/lib/segmented-tabs/segmented-tabs.component.spec';
import '../../../libs/ui/src/lib/services/breakpoint.service.spec';
import '../../../libs/ui/src/lib/starry-background/starry-background.component.spec';
import '../../../libs/ui/src/lib/switch/switch.component.spec';
import '../../../libs/ui/src/lib/top-bar/top-bar.component.spec';

describe('@db-astro-suite/ui aggregate spec entry', () => {
  it('loads every library spec module', () => {
    // The imports above are the assertion — if any module fails to load,
    // this spec file itself fails to compile. Keep this it() to ensure
    // the file is picked up as a Jasmine spec.
    expect(true).toBe(true);
  });
});
