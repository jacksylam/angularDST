import { Component, OnInit } from '@angular/core';
import {animate, transition, state, trigger, style} from '@angular/core';
import { CovDetailsService } from 'app/map/shared/cov-details.service';
import {MapService} from '../../map/shared/map.service';

@Component({
  selector: 'app-bottombar-panel',
  templateUrl: './bottombar-panel.component.html',
  styleUrls: ['./bottombar-panel.component.css'],
  animations: [
    trigger('movePanel', [
         state('active', style({
        transform: 'translate(0px, 150px)',
      })),
      state('inactive', style({
        transform: 'translate( 0px, -155px)',
      })),
      transition('active => inactive', animate('500ms ease-in-out')),
      transition('inactive => active', animate('500ms ease-in-out'))
    ]),
  ]
})
export class BottombarPanelComponent implements OnInit {
  state = 'inactive';
  covDetails;
  current = "";
  original= "";
  pchange= "";
  diff= "";
  mode="none";
  scenario = "Average";
  units = "Mgal/d"
  totalRecharge;
  totalOriginalRecharge;

  constructor(private mapService: MapService,) { }

  ngOnInit() {
    this.mapService.setDetailsPanel(this);
    // this.covDetails.rechargeUpdate.subscribe(() => {
    //   this.totalRecharge = this.covDetails.totalRecharge;
    // })
    // this.covDetails.baseLandcoverUpdate.subscribe(() => {
    //   this.baseLandcover = this.covDetails.baseLandcover;
    // })
    // this.covDetails.scenarioUpdate.subscribe(() => {
    //   this.scenario = scenarios[this.covDetails.scenario];
    // })
  }

  ngAfterViewInit() {
    
  }

  updateTotalRecharge(totalRecharge: number) {
    this.totalRecharge = this.convertValue(totalRecharge);
  }

  setTotalRecharge(totalOriginalRecharge: number) {
    this.totalOriginalRecharge = this.convertValue(totalOriginalRecharge);
  }

  updateMetrics(original: number, current: number, mode: string) {
    this.mode = mode;
    //no reason to update repeatedly, store full map data ahead of time
    //should do the same for aquifers since also static
    if(mode == "full") {
      this.original = this.roundToPrecision(this.totalOriginalRecharge, 4).toString();
      this.current = this.roundToPrecision(this.totalRecharge, 4).toString();
      var diff = this.totalRecharge - this.totalOriginalRecharge;
      this.diff = this.roundToPrecision(diff, 4).toString();
      this.pchange = this.roundToPrecision((diff / this.totalOriginalRecharge * 100), 4).toString();
    }
    else {
      var convertedOrigin = this.convertValue(original);
      var convertedCurrent = this.convertValue(current)

      this.original = this.roundToPrecision(convertedOrigin, 4).toString();
      this.current = this.roundToPrecision(convertedCurrent, 4).toString();
      var diff = convertedCurrent - convertedOrigin;
      this.diff = this.roundToPrecision(diff, 4).toString();
      this.pchange = this.roundToPrecision((diff / convertedOrigin * 100), 4).toString();
    }
    
    
  }

  convertValue(valueIPY: number) {
    //use 4 decimal precision
    switch(this.units) {
      case "in/yr":
        return valueIPY;
      case "Mgal/d":
        return (valueIPY * 75 * 75 * 144) / (231 * 0.3048 * 0.3048 * 365 * 1000000);
    }
  }

  roundToPrecision(value: number, precision: number) {
    var roundMag = Math.pow(10, precision);
    return Math.round(value * roundMag) / roundMag;
  }

  updateDetails(scenario: string) {
    var scenarios = {
      "recharge_scenario0" : "Average",
      "recharge_scenario1" : "Drought"
    }
    if(scenario != null) this.scenario = scenarios[scenario];
  }

  backToBase() {
    this.mode = "none";
  }
  

  toggleMenu() {
    this.state = (this.state == 'inactive' ? 'active' : 'inactive');
  }



}
