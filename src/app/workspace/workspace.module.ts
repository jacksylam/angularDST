import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkspaceComponent } from './components/workspace/workspace.component';

import { DisplayUnitComponent } from './components/window-display-components/display-unit/display-unit.component';
import { VisWindowComponent } from './components/window-display-components/vis-window/vis-window.component';
import { ReportWindowComponent } from './components/window-display-components/report-window/report-window.component';

@NgModule({
  imports: [
    CommonModule
  ],
  providers: [],
  declarations: [
    WorkspaceComponent,
    DisplayUnitComponent,
    VisWindowComponent,
    ReportWindowComponent
  ]
})
export class WorkspaceModule { }
