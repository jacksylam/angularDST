import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SidebarMenuComponent } from './sidebar-menu/sidebar-menu.component';
import { MatSidenavModule } from '@angular/material';
import { SidebarPanelComponent } from './sidebar-panel/sidebar-panel.component';
import { BottombarPanelComponent } from './bottombar-panel/bottombar-panel.component';
import { SidebarControlsComponent } from './sidebar-controls/sidebar-controls.component';
import {GraphsComponent} from '../graphs/graphs.component';
import { NouisliderModule } from 'ng2-nouislider';
import {MatSliderModule} from '@angular/material/slider';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
  imports: [
    CommonModule,
    MatSidenavModule,
    BrowserAnimationsModule,
    NouisliderModule,
    MatSliderModule,
    FormsModule
  ],
  declarations: [
    SidebarMenuComponent, 
    SidebarPanelComponent, 
    BottombarPanelComponent,
    SidebarControlsComponent,
    GraphsComponent
  ],
  exports: [
    SidebarMenuComponent,
    SidebarPanelComponent,
    BottombarPanelComponent,
    SidebarControlsComponent
  ]
})
export class SidebarModule { }
