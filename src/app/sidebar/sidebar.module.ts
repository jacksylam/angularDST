import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SidebarMenuComponent } from './sidebar-menu/sidebar-menu.component';
import { MatSidenavModule } from '@angular/material';
import { SidebarPanelComponent } from './sidebar-panel/sidebar-panel.component';

@NgModule({
  imports: [
    CommonModule,
    MatSidenavModule,
    BrowserAnimationsModule
  ],
  declarations: [SidebarMenuComponent, SidebarPanelComponent],
  exports: [
    SidebarMenuComponent,
    SidebarPanelComponent
  ]
})
export class SidebarModule { }
