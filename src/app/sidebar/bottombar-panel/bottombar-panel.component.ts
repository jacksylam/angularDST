import { Component, OnInit } from '@angular/core';
import {animate, transition, state, trigger, style, ViewChild} from '@angular/core';
import { CovDetailsService } from 'app/map/shared/cov-details.service';
import {MapService} from '../../map/shared/map.service';
import { timeout } from 'q';

@Component({
  selector: 'app-bottombar-panel',
  templateUrl: './bottombar-panel.component.html',
  styleUrls: ['./bottombar-panel.component.css'],
  animations: [
    trigger('movePanel', [
         state('active', style({
        transform: 'translate(0px, 0px)',
      })),
      state('inactive', style({
        transform: 'translate( 0px, -310px)',
      })),
      transition('active => inactive', animate('500ms ease-in-out')),
      transition('inactive => active', animate('500ms ease-in-out'))
    ]),
  ]
})



export class BottombarPanelComponent implements OnInit {
  @ViewChild('chart') chart;

  state = 'inactive';
  covDetails;
  current = "";
  original= "";
  pchange= "";
  diff= "";
  mode="none";
  scenario = "Average";
  units = "Mgal/d"
  totalRecharge = 0;
  totalOriginalRecharge = 0;

  //store ipy values passed for recalculation on unit change (don't want to use stored values to prevent compounded precision loss due to rounding)
  ipyVals = {
    current: 0,
    original: 0
  }

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
    if(this.mode == "full") {
      //if update finished after switch to metric view, update metrics
      this.updateMetrics(null, null, "full");
    }
  }

  setTotalRecharge(totalOriginalRecharge: number) {
    this.totalOriginalRecharge = totalOriginalRecharge;
  }

  updateMetrics(original: number, current: number, mode: string) {
    
    this.mode = mode;

    var convertedOrigin;
    var convertedCurrent;
    //no reason to update repeatedly, store full map data ahead of time
    //should do the same for aquifers since also static
    if(mode == "full") {
      this.ipyVals.original = this.totalOriginalRecharge;
      this.ipyVals.current = this.totalRecharge;

      convertedOrigin = this.convertValue(this.totalOriginalRecharge);
      convertedCurrent = this.convertValue(this.totalRecharge)

      
    }
    else {
      this.ipyVals.original = original;
      this.ipyVals.current = current;

      convertedOrigin = this.convertValue(original);
      convertedCurrent = this.convertValue(current)
    }

    this.original = this.roundToPrecision(convertedOrigin, 4).toString();
    this.current = this.roundToPrecision(convertedCurrent, 4).toString();
    var diff = convertedCurrent - convertedOrigin;
    this.diff = this.roundToPrecision(diff, 4).toString();
    this.pchange = this.roundToPrecision((diff / convertedOrigin * 100), 4).toString();
    
    //bargraph can only be rendered if element exists
    //delay so transition has time to process (might want to switch how checking for mode)
    setTimeout(() => {
      if(this.chart) {
        this.generateBargraph(convertedOrigin, convertedCurrent);
      }
    }, 200);
    
    
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

  setUnits(type: string) {
    this.units = type;
    //update with stored ipy vals
    this.updateMetrics(this.ipyVals.original, this.ipyVals.current, this.mode);
  }

  roundToPrecision(value: number, precision: number) {
    var roundMag = Math.pow(10, precision);
    return Math.round(value * roundMag) / roundMag;
  }

  // updateDetails(scenario: string) {
  //   var scenarios = {
  //     "recharge_scenario0" : "Average",
  //     "recharge_scenario1" : "Drought"
  //   }
  //   if(scenario != null) this.scenario = scenarios[scenario];
  // }

  backToBase() {
    this.mode = "none";
  }
  

  toggleMenu() {
    this.state = (this.state == 'inactive' ? 'active' : 'inactive');
  }


  
  
 

  generateBargraph(originalRecharge: number, currentRecharge: number) {
  
    var original = {
      x: ['Recharge'],
      y: [originalRecharge],
      name: 'Original',
      type: 'bar',
      marker: {
        color: 'rgb(56, 117, 194)'
      },
    };
    
    var current = {
      x: ['Recharge'],
      y: [currentRecharge],
      name: 'Current',
      type: 'bar',
      marker: {
        color: '#016422'
      },
    };
    
    var data = [original, current];
    
    var layout = {
      barmode: 'group',
      height: 300,
      width: 350,
      plot_bgcolor: 'ivory',
      paper_bgcolor: 'ivory',
      margin: {
        l: 50,
        r: 20,
        b: 50,
        t: 40,
        pad: 0
      }
    };
    
    Plotly.newPlot(this.chart.nativeElement, data, layout);
  }
}
