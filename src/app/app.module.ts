import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
// import {HttpClientModule} from '@angular/common/http';


//Modules
import { SidebarModule } from './sidebar/sidebar.module';
import 'hammerjs';


//Components
import { MapComponent } from './map/map.component';
import { WindowComponent } from './window/window.component';
import { HomeComponent } from './home/home.component';
import { GraphsComponent } from './graphs/graphs.component';

//Service
import { WindowService } from './window/shared/window.service';
import { MapService } from './map/shared/map.service'
import { DBConnectService } from './map/shared/dbconnect.service';
import { CovDetailsService } from './map/shared/cov-details.service';
import { ModifiedShpwriteService } from './map/shared/modified-shpwrite.service';
import { CovjsonTemplateService } from './map/shared/covjson-template.service';

//Agave imports
import { HttpModule } from '@angular/http'; //deprecated, replace with httpclientmodule
import { HttpClientModule } from '@angular/common/http';
// <-- import Angular HTTP module
// import { HttpClient } from 'ng-agave/ng-agave'; // <-- import API Client
// import { Configuration } from 'ng-agave/ng-agave'; // <-- import API Config
// import { APIHelper } from 'ng-agave/ng-agave'; // <-- import API Helper

import { FileUploadModule } from 'ng2-file-upload';
import { NgxUploaderModule } from 'ngx-uploader';
import { MessageDialogComponent } from './message-dialog/message-dialog.component';
import { MatDialogModule } from "@angular/material";
import { AdvancedMappingDialogComponent } from './advanced-mapping-dialog/advanced-mapping-dialog.component';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { InstructionsComponent } from './instructions/instructions.component';
import { BackgroundComponent } from './background/background.component';
import { DisclaimerComponent } from './disclaimer/disclaimer.component';
import { FeedbackComponent } from './feedback/feedback.component';
import { HowToCiteComponent } from './how-to-cite/how-to-cite.component';
import { FormsModule } from '@angular/forms';
import { NotFoundComponent } from './not-found/not-found.component';
import { WorkspaceComponent } from './workspace/components/workspace/workspace.component';
//import { WorkspaceComponent } from './workspace/workspace.component';


import { WindowLayersService } from "./workspace/services/window-layers.service";
import { DisplayWrapperComponent } from 'app/workspace/components/window-display-components/display-wrapper/display-wrapper.component';
import { DisplayUnitComponent } from './workspace/components/window-display-components/display-unit/display-unit.component'
import { VisWindowComponent } from './workspace/components/window-display-components/vis-window/vis-window.component';
import { ReportWindowComponent } from './workspace/components/window-display-components/report-window/report-window.component';
import { WebWorkerService } from 'ngx-web-worker';

import { RouteReuseStrategy } from '@angular/router';
import { CustomReuseStrategy } from './reuse-strategy';
import { TermsOfUseComponent } from './terms-of-use/terms-of-use.component'

import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatTooltipModule} from '@angular/material/tooltip'
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import { LcTableComponent } from './lc-table/lc-table.component';
import { LcTableStandaloneComponent } from './lc-table-standalone/lc-table-standalone.component';

@NgModule({
  declarations: [
    AppComponent,
    MapComponent,
    HomeComponent,
    WindowComponent,
    MessageDialogComponent,
    AdvancedMappingDialogComponent,
    WorkspaceComponent,
    InstructionsComponent,
    BackgroundComponent,
    DisclaimerComponent,
    FeedbackComponent,
    HowToCiteComponent,
    NotFoundComponent,
    DisplayWrapperComponent,
    DisplayUnitComponent,
    VisWindowComponent,
    ReportWindowComponent,
    TermsOfUseComponent,
    LcTableComponent,
    LcTableStandaloneComponent
  ],
  imports: [
    HttpModule,
    HttpClientModule,
    BrowserModule,
    AppRoutingModule,
    SidebarModule,   
    // HttpClientModule
    FileUploadModule,
    NgxUploaderModule,
    MatDialogModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    FormsModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  //Commented out Agave module
  // providers: [WindowService, HttpClient, Configuration, APIHelper],
  providers: [
    WindowService,
    MapService,
    CovDetailsService,
    ModifiedShpwriteService,
    CovjsonTemplateService,
    DBConnectService,
    WindowLayersService,
    {
      provide: RouteReuseStrategy,
      useClass: CustomReuseStrategy
    },
    WebWorkerService
  ],
  bootstrap: [AppComponent],
  entryComponents: [
    MessageDialogComponent,
    AdvancedMappingDialogComponent,
    DisplayUnitComponent,
    TermsOfUseComponent
  ]
})


export class AppModule { }


