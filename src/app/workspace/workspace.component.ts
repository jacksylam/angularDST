import { Component, OnInit } from '@angular/core';

import { WindowPanel } from '../window/shared/windowPanel';
import { WindowService } from '../window/shared/window.service';


//Commented out Agave module
// import { AppsService } from 'ng-agave/ng-agave'; // <-- import service wanted

@Component({
  selector: 'app-workspace',
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.css'],
  // providers:[AppsService]
  providers:[]
})
export class WorkspaceComponent implements OnInit {

  loaded: boolean;
  windows: WindowPanel[];


  //Commented out Agave module
  // constructor(private windowService: WindowService, private appsService:AppsService) { this.loaded = false; }
  constructor(private windowService: WindowService) { this.loaded = false; }
  ngOnInit() {

    this.getWindows();

    //Commented out Agave module
    // this.appsService.searchApps('')
    // .subscribe(
    //     data => {console.log(data)},
    //     err => console.log(err)
    // );

    
  }

  getWindows() {
    this.windowService.getWindows().then(windows => {
      this.windows = windows;
      this.loaded = true;
    });

  }



}
