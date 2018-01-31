import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { Http } from '@angular/http';
import {MapFirestoreService} from './map-firestore.service'


import { MapComponent } from '../map.component'
import { Grid } from './grid'

@Injectable()
export class MapService {

  mapHash = [];
  panelButtonHash = [];
  detailPanelHash = [];


  mapEnabled: boolean;
  mapEnabledObs = new Subject<boolean>();

  map: any;

  tempData: any;
  csvData: Grid[];

  constructor(private http: Http, private firestore: MapFirestoreService) {

   }

  init(){
  //  this.firestore.getList().subscribe(val => console.log(val));
  }

  setMap(newMap: any) {
    this.mapHash.push(newMap);
  }

  setButtonPanel(buttonPanel: any) {
    this.panelButtonHash.push(buttonPanel);
  }

  setDetailsPanel(detailPanel: any) {
    this.detailPanelHash.push(detailPanel);
  }

  toggleShape(buttonPanel: any) {
    let index = this.panelButtonHash.indexOf(buttonPanel);
    this.mapHash[index].changeShapeFile();
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


  changeCover(buttonPanel: any, cover: string) {
    let index = this.panelButtonHash.indexOf(buttonPanel);
    this.mapHash[index].changeCover(cover);
  }

  changeScenario(buttonPanel: any, scenario: string) {
    let index = this.panelButtonHash.indexOf(buttonPanel);
    this.mapHash[index].changeScenario(scenario);
  }

  updateDetails(map: any, totalRecharge: number, scenario: string, baseLandcover: string) {
    let index = this.mapHash.indexOf(map);
    //round to 4 decimal places
    if(totalRecharge != null) {
      totalRecharge = Math.round(totalRecharge * 10000) / 10000;
    }
    this.detailPanelHash[index].updateDetails(totalRecharge, scenario, baseLandcover);
  }

  //returns sum of recharge in array in millions of gallons per year
  getRechargeSum(rechargeArr): number {
    var totalRecharge = 0;
    rechargeArr.forEach(element => {
      totalRecharge += element;
    });
    return this.convertToMGPY(totalRecharge)
    //this.updateDetails(map, totalRecharge, null, null);
  }

  convertToMGPY(IPY: number) {
    return IPY * ((75 * 75) * (144)) / ((231) * (0.3048 * 0.3048) * (365) * (1000000));
  }

  
}