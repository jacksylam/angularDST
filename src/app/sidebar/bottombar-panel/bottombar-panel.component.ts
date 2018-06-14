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

  metrics = {
    IPY: {
      original: "",
      current: "",
      diff: "",
      pchange: ""
    },
    MGPD: {
      original: "",
      current: "",
      diff: "",
      pchange: ""
    },
    cells: ""
  }

  displayMetrics = {
    values: {
      original: "",
      current: "",
      difference: "",
      pchange: ""
    },   
    cells: "",
    units: ""
  }

  units: string;

  mode: string;

  //store ipy values passed for recalculation on unit change (don't want to use stored values to prevent compounded precision loss due to rounding)
  ipyVals = {
    current: 0,
    original: 0
  }

  constructor(private mapService: MapService) { }

  ngOnInit() {
    this.mapService.setDetailsPanel(this);
    this.units = "MGPD";
    this.mode = "none";
    this.displayMetrics.units = "Mgal/day"
  }

  ngAfterViewInit() {
    
  }


  updateMetrics(mode: string, metrics: any) {
    
    

    this.metrics = metrics;

    console.log(this.metrics);
    
    this.displayMetrics.values = metrics[this.units];

    this.mode = mode;
    
    //bargraph can only be rendered if element exists
    //delay so transition has time to process (might want to switch how checking for mode)
    setTimeout(() => {
      if(this.chart) {
        this.generateBargraph(parseFloat(metrics[this.units].original), parseFloat(metrics[this.units].current));
      }
    }, 200);
    
    
  }

  setUnits(type: string) {

    this.units = type;

    switch(type) {
      case "IPY": {
        this.displayMetrics.units = "in/y";
        break;
      }
      case "MGPD": {
        this.displayMetrics.units = "Mgal/day";
        break;
      }
    }
    //update with stored ipy vals
    this.displayMetrics.values = this.metrics[type];

    //regenerate bargraph with new units if in a recharge vis mode
    if(this.mode != "none") {
      this.generateBargraph(parseFloat(this.metrics[this.units].original), parseFloat(this.metrics[this.units].current));
    }
  }


  backToBase() {
    this.mode = "none";
  }
  

  toggleMenu() {
    this.state = (this.state == 'inactive' ? 'active' : 'inactive');
  }


  
  
 

  generateBargraph(originalRecharge: number, currentRecharge: number) {
  
    let original = {
      x: ['Recharge'],
      y: [originalRecharge],
      name: 'Original',
      type: 'bar'
    };
    
    let current = {
      x: ['Recharge'],
      y: [currentRecharge],
      name: 'Current',
      type: 'bar'
    };
    
    let data = [original, current];

    //start display 10 units below min value, but not less than 0
    let minScale = Math.max(Math.min(originalRecharge, currentRecharge) - 10, 0);
    //max recharge 75% of graph height
    let maxRecharge = Math.max(originalRecharge, currentRecharge);
    let maxScale = maxRecharge + .75 * (maxRecharge - minScale);
    //if both values are 0 just set it to 1
    if(maxScale == 0) {
      maxScale = 1;
    }

    let layout = {
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