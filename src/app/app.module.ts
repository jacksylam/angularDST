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
import { MapFirestoreService } from './map/shared/map-firestore.service'
import { DBConnectService } from './map/shared/dbconnect.service';
import { CovDetailsService } from './map/shared/cov-details.service';
import { ModifiedShpwriteService } from './map/shared/modified-shpwrite.service';
import { CovjsonTemplateService } from './map/shared/covjson-template.service';

//firebase
import { AngularFireModule } from 'angularfire2';
import { environment } from '../environments/environment';
import { AngularFirestoreModule } from 'angularfire2/firestore';
import { AngularFireAuthModule } from 'angularfire2/auth';

//Agave imports
import { HttpModule } from '@angular/http'; //deprecated, replace with httpclientmodule
import { HttpClientModule } from '@angular/common/http';
// <-- import Angular HTTP module
// import { HttpClient } from 'ng-agave/ng-agave'; // <-- import API Client
// import { Configuration } from 'ng-agave/ng-agave'; // <-- import API Config
// import { APIHelper } from 'ng-agave/ng-agave'; // <-- import API Helper

import { FileUploadModule } from 'ng2-file-upload';
import { NgUploaderModule } from 'ngx-uploader';
import { MessageDialogComponent } from './message-dialog/message-dialog.component';
import { MatDialogModule } from "@angular/material";
import { AdvancedMappingDialogComponent } from './advanced-mapping-dialog/advanced-mapping-dialog.component';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { WorkspaceComponent } from './workspace/workspace.component';
import { InstructionsComponent } from './instructions/instructions.component';
import { BackgroundComponent } from './background/background.component';
import { DisclaimerComponent } from './disclaimer/disclaimer.component';
import { FeedbackComponent } from './feedback/feedback.component';
import { HowToCiteComponent } from './how-to-cite/how-to-cite.component';
import { FormsModule } from '@angular/forms';
import { NotFoundComponent } from './not-found/not-found.component';

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
    NotFoundComponent
  ],
  imports: [
    HttpModule,
    HttpClientModule,
    BrowserModule,
    AppRoutingModule,
    SidebarModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFirestoreModule, // imports firebase/firestore, only needed for database features
    AngularFireAuthModule, // imports firebase/auth, only needed for auth features   
    // HttpClientModule
    FileUploadModule,
    NgUploaderModule,
    MatDialogModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    FormsModule
  ],
  //Commented out Agave module
  // providers: [WindowService, HttpClient, Configuration, APIHelper],
  providers: [
    WindowService,
    MapService,
    MapFirestoreService,
    CovDetailsService,
    ModifiedShpwriteService,
    CovjsonTemplateService,
    DBConnectService
  ],
  bootstrap: [AppComponent],
  entryComponents: [
    MessageDialogComponent,
    AdvancedMappingDialogComponent
  ]
})


export class AppModule { }


