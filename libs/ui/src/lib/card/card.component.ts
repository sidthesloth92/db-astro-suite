import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
} from "@angular/core";
import { ConstellationLoaderComponent } from "../constellation-loader/constellation-loader.component";

@Component({
  selector: "dba-ui-card",
  standalone: true,
  imports: [CommonModule, ConstellationLoaderComponent],
  templateUrl: "./card.component.html",
  styleUrls: ["./card.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {
  title = input<string>("");
  subtitle = input<string>("");
  logoSrc = input<string>("");
  clickable = input<boolean>(false);

  logoLoaded = signal(false);

  onLogoLoad(): void {
    this.logoLoaded.set(true);
  }

  onLogoError(): void {
    this.logoLoaded.set(true);
  }
}
