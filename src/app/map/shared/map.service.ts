import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { Http } from '@angular/http';
import { PapaParseService } from 'ngx-papaparse';
import {MapFirestoreService} from './map-firestore.service'


import { MapComponent } from '../map.component'
import { Grid } from './grid'

@Injectable()
export class MapService {

  mapHash = [];
  panelButtonHash = [];


  mapEnabled: boolean;
  mapEnabledObs = new Subject<boolean>();

  map: any;

  tempData: any;
  csvData: Grid[];

  constructor(private http: Http, private firestore: MapFirestoreService, private papa: PapaParseService) {

   }

  init(){
    this.loadCSVFile();
  //  this.firestore.getList().subscribe(val => console.log(val));
  }

  setMap(newMap: any) {
    this.mapHash.push(newMap);
  }

  setButtonPanel(buttonPanel: any) {
    this.panelButtonHash.push(buttonPanel);
  }

  toggleShape(buttonPanel: any) {
    let index = this.panelButtonHash.indexOf(buttonPanel);
    this.mapHash[index].changeShapeFile();
  }


  loadCSVFile() {
    this.http.get('./assets/latlng.csv').subscribe(data =>  {
      this.tempData = data;
      this.csvData = new Array();

      this.papa.parse(this.tempData._body, {
        complete: (results, file) => {
          for (let i = 1; i < results.data.length - 1; i++) {
            var temp = new Grid(results.data[i][0], results.data[i][1], results.data[i][2]);
            this.csvData.push(temp);
          }
        console.log("finish loading csv data");
        }
      });
    });
  }

  //lat1 - lower latitude
  //lng2 - upper latitude
  //lng1 - right longitude
  //lng2 - left longitude
  getMarkers(lat1: number, lng1: number, lat2: number, lng2: number){
    let markers = new Array();
    console.log("Map lat " + this.csvData[0].lat);
    console.log("Map lng " + this.csvData[0].lng);

    console.log("lat1 " + lat1);
    console.log("lng1 " + lng1);
    console.log("lat2 " + lat2);
    console.log("lng2 " + lng2);

    for(let i = 0; i < this.csvData.length; i++){
      if((this.csvData[i].lat > lat1) && (this.csvData[i].lat < lat2) && (this.csvData[i].lng > lng1) && (this.csvData[i].lng < lng2)){
      // if((this.csvData[i].lng > lng1) && (this.csvData[i].lng < lng2)){
        markers.push(this.csvData[i]);
      }
    }
    return markers;
  }

}