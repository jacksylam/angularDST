import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkspaceComponent } from './components/workspace/workspace.component';

//services
import { WindowFactoryService } from "./services/window-factory.service";
import { DisplayWrapperComponent } from './components/window-display-components/display-wrapper/display-wrapper.component';
import { DisplayUnitComponent } from './components/window-display-components/display-unit/display-unit.component';

@NgModule({
  imports: [
    CommonModule
  ],
  providers: [WindowFactoryService],
  declarations: [
    WorkspaceComponent,
    DisplayWrapperComponent,
    DisplayUnitComponent
  ]
})
export class WorkspaceModule { }
