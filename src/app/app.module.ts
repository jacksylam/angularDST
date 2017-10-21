import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

//Modules
import { NgxGraphsModule } from './ngx-graphs/ngx-graphs.module';
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

//Agave imports
// import { HttpModule } from '@angular/http'; // <-- import Angular HTTP module
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
    // HttpModule,    
    BrowserModule,
    AppRoutingModule,
    NgxGraphsModule,
    SidebarModule  
  ],
  //Commented out Agave module
  // providers: [WindowService, HttpClient, Configuration, APIHelper],
  providers: [WindowService, MapService],
  bootstrap: [AppComponent]
})
export class AppModule { }


