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
import {MapService} from './map/shared/map.service'
import {MapFirestoreService} from './map/shared/map-firestore.service'

//firebase
import { AngularFireModule } from 'angularfire2';
import { environment } from '../environments/environment';
import { AngularFirestoreModule } from 'angularfire2/firestore';
import { AngularFireAuthModule } from 'angularfire2/auth';

//Agave imports
import { HttpModule } from '@angular/http'; // <-- import Angular HTTP module
// import { HttpClient } from 'ng-agave/ng-agave'; // <-- import API Client
// import { Configuration } from 'ng-agave/ng-agave'; // <-- import API Config
// import { APIHelper } from 'ng-agave/ng-agave'; // <-- import API Helper

@NgModule({
  declarations: [
    AppComponent,
    MapComponent,
    HomeComponent,
    WindowComponent,
    
  ],
  imports: [
    HttpModule,    
    BrowserModule,
    AppRoutingModule,
    SidebarModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFirestoreModule, // imports firebase/firestore, only needed for database features
    AngularFireAuthModule, // imports firebase/auth, only needed for auth features   
    // HttpClientModule
  ],
  //Commented out Agave module
  // providers: [WindowService, HttpClient, Configuration, APIHelper],
  providers: [WindowService, MapService, MapFirestoreService],
  bootstrap: [AppComponent]
})
export class AppModule { }


