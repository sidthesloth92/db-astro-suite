import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HeaderComponent } from '@db-astro-suite/ui';
import packageJson from '../../../../package.json';
import { ControlPanel } from './components/control-panel/control-panel';
import { SpikeStage } from './components/spike-stage/spike-stage';

/**
 * AstroSpike root shell. Renders the suite header above a two-pane studio:
 * the spike preview stage on the left and the controls pane on the right
 * (mirroring the starwizz desktop layout).
 */
@Component({
  selector: 'dba-as-root',
  standalone: true,
  imports: [ControlPanel, HeaderComponent, SpikeStage],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  /** Application version pulled from the workspace `package.json`. */
  readonly version = packageJson.version || '1.0.0';
}
