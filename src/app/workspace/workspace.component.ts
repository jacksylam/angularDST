import { Component, OnInit } from '@angular/core';

import { WindowPanel } from '../window/shared/windowPanel';


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
  constructor() { this.loaded = false; }
  ngOnInit() {

    
  }

  



}
