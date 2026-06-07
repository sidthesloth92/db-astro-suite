import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Celestory root shell — hosts the file-based router outlet. */
@Component({
  selector: 'dba-celestory-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {}
