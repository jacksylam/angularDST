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
    this.totalRecharge = totalRecharge;
  }

  setTotalRecharge(totalOriginalRecharge: number) {
    this.totalOriginalRecharge = totalOriginalRecharge;
  }

  updateMetrics(original: number, current: number, mode: string) {
    this.mode = mode;
    //no reason to update repeatedly, store full map data ahead of time
    //should do the same for aquifers since also static
    if(mode == "full") {
      this.original = this.totalOriginalRecharge.toString();
      this.current = this.totalRecharge.toString();
      var diff = this.totalOriginalRecharge - this.totalRecharge;
      this.diff = diff.toString();
      this.pchange = (diff / this.totalOriginalRecharge * 100).toString();
    }
    else {
      this.original = original.toString();
      this.current = current.toString();
      var diff = original - current;
      console.log(original);
      this.diff = diff.toString();
      this.pchange = (diff / original * 100).toString();
    }
    
    
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
