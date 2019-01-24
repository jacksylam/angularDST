import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SidebarMenuComponent } from './sidebar-menu/sidebar-menu.component';
import { MatSidenavModule, MatIconModule, MatTooltipModule } from '@angular/material';
import { SidebarPanelComponent } from './sidebar-panel/sidebar-panel.component';
import { BottombarPanelComponent } from './bottombar-panel/bottombar-panel.component';
import { SidebarControlsComponent } from './sidebar-controls/sidebar-controls.component';
import {GraphsComponent} from '../graphs/graphs.component';
import {MatSliderModule} from '@angular/material/slider';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatRadioModule} from '@angular/material/radio';
import {MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UploadDialogComponent } from './upload-dialog/upload-dialog.component';
import { DownloadDialogComponent } from './download-dialog/download-dialog.component';
import {MatDialogModule} from "@angular/material";
import { MatButtonModule } from '@angular/material/button';
import {MatInputModule} from '@angular/material';

@NgModule({
  imports: [
    CommonModule,
    MatSidenavModule,
    BrowserAnimationsModule,
    MatSliderModule,
    FormsModule,
    MatSelectModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatRadioModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,
    MatTooltipModule
  ],
  declarations: [
    SidebarMenuComponent, 
    SidebarPanelComponent, 
    BottombarPanelComponent,
    SidebarControlsComponent,
    GraphsComponent,
    UploadDialogComponent,
    DownloadDialogComponent
  ],
  exports: [
    SidebarMenuComponent,
    SidebarPanelComponent,
    BottombarPanelComponent,
    SidebarControlsComponent,
    UploadDialogComponent,
    DownloadDialogComponent
  ],
  entryComponents: [
    UploadDialogComponent,
    DownloadDialogComponent
  ]
})
export class SidebarModule { }
