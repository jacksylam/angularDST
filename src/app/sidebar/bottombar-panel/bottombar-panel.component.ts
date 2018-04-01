import { Component, OnInit } from '@angular/core';
import {animate, transition, state, trigger, style, ViewChild} from '@angular/core';
import { CovDetailsService } from 'app/map/shared/cov-details.service';
import {MapService} from '../../map/shared/map.service';
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
        transform: 'translate( 0px, -275px)',
      })),
      transition('active => inactive', animate('500ms ease-in-out')),
      transition('inactive => active', animate('500ms ease-in-out'))
    ]),
  ]
})



export class BottombarPanelComponent implements OnInit {
  @ViewChild('chart') chart;

  state = 'inactive';
  current = "";
  original = "";
  cells = 0;
  pchange = "";
  diff = "";
  mode = "none";
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
  }

  ngAfterViewInit() {
    
  }

  updateTotalRecharge(totalRecharge: number) {
    this.totalRecharge = totalRecharge;
    if(this.mode == "full") {
      //if update finished after switch to metric view, update metrics
      this.updateMetrics(null, null, "full", this.cells);
    }
  }

  setTotalRecharge(totalOriginalRecharge: number) {
    this.totalOriginalRecharge = totalOriginalRecharge;
  }

  updateMetrics(original: number, current: number, mode: string, numcells: number) {
    
    this.mode = mode;
    this.cells = numcells;
    var convertedOrigin;
    var convertedCurrent;
    //no reason to update repeatedly, store full map data ahead of time
    //should do the same for aquifers since also static
    if(mode == "full") {
      this.ipyVals.original = this.totalOriginalRecharge;
      this.ipyVals.current = this.totalRecharge;

      convertedOrigin = this.convertValue(this.totalOriginalRecharge, numcells);
      convertedCurrent = this.convertValue(this.totalRecharge, numcells)

      
    }
    else {
      this.ipyVals.original = original;
      this.ipyVals.current = current;

      convertedOrigin = this.convertValue(original, numcells);
      convertedCurrent = this.convertValue(current, numcells)
    }

    //use 3 significant figure precision
    var precision = 3;

    this.original = convertedOrigin.toPrecision(precision);
    this.current = convertedCurrent.toPrecision(precision);
    var diff = convertedCurrent - convertedOrigin;
    this.diff = diff.toPrecision(precision);
    //ensure not dividing by 0
    this.pchange = convertedOrigin == 0 ? "0" : (diff / convertedOrigin * 100).toPrecision(precision);
    //if all values 0 just set pchange to 0
    if(this.pchange == "NaN") {
      this.pchange = "0"
    }
    
    //bargraph can only be rendered if element exists
    //delay so transition has time to process (might want to switch how checking for mode)
    setTimeout(() => {
      if(this.chart) {
        this.generateBargraph(convertedOrigin, convertedCurrent);
      }
    }, 200);
    
    
  }


  convertValue(valueIPY: number, cells: number) {
    
    switch(this.units) {
      case "in/yr":
        //ipy values are summation, need to divide by number of cells for average (0 if no cells)
        return cells > 0 ? valueIPY / cells : 0;
      case "Mgal/d":
        return (valueIPY * 75 * 75 * 144) / (231 * 0.3048 * 0.3048 * 365 * 1000000);
    }
  }

  setUnits(type: string) {
    this.units = type;
    //update with stored ipy vals
    this.updateMetrics(this.ipyVals.original, this.ipyVals.current, this.mode, this.cells);
  }


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
      type: 'bar'
    };
    
    var current = {
      x: ['Recharge'],
      y: [currentRecharge],
      name: 'Current',
      type: 'bar'
    };
    
    var data = [original, current];

    //start display 10 units below min value, but not less than 0
    var minScale = Math.max(Math.min(originalRecharge, currentRecharge) - 10, 0);
    //max recharge 75% of graph height
    var maxRecharge = Math.max(originalRecharge, currentRecharge);
    var maxScale = maxRecharge + .75 * (maxRecharge - minScale);
    //if both values are 0 just set it to 1
    if(maxScale == 0) {
      maxScale = 1;
    }

    var layout = {
      barmode: 'group',
      height: 275,
      width: 350,
      plot_bgcolor: 'ivory',
      paper_bgcolor: 'ivory',
      margin: {
        l: 50,
        r: 20,
        b: 50,
        t: 40,
        pad: 0
      },
      yaxis: {
        range: [minScale, maxScale]
      }
    };
    
    Plotly.newPlot(this.chart.nativeElement, data, layout);
  }
}