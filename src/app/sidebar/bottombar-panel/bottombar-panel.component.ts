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
  totalRecharge = "";
  baseLandcover = "";
  scenario = "";

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

  updateDetails(totalRecharge, scenario, baseLandcover) {
    var scenarios = {
      "recharge_scenario0" : "Average",
      "recharge_scenario1" : "Drought"
    }
    if(totalRecharge != null) this.totalRecharge = totalRecharge;
    if(baseLandcover != null) this.baseLandcover = baseLandcover;
    if(scenario != null) this.scenario = scenarios[scenario];
  }

  toggleMenu() {
    this.state = (this.state == 'inactive' ? 'active' : 'inactive');
  }

}
