import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import {MapComponent} from '../map.component'

@Injectable()
export class MapService {

  mapEnabled: boolean;
  mapEnabledObs = new Subject<boolean>();

  map: any;

  constructor() { }

  setMap(newmap: any){
    this.map = newmap;
    console.log(this.map);
  }

  toggleShape(){
    this.map.changeShapeFile();
  }



}
