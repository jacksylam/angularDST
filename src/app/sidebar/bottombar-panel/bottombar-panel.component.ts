import { Component, OnInit, ViewChild } from '@angular/core';
import {animate, transition, state, trigger, style} from '@angular/animations';
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
        transform: 'translate( 0px, -245px)',
      })),
      transition('active => inactive', animate('500ms ease-in-out')),
      transition('inactive => active', animate('500ms ease-in-out'))
    ]),
  ]
})



export class BottombarPanelComponent implements OnInit {
  @ViewChild('chart') chart;

  state = 'active';
  includeCaprock = true;

  loading = 0;
  debug = false;

  metrics = {
    USC: {
      average: {
        original: "",
        current: "",
        diff: "",
        pchange: ""
      },
      volumetric: {
        original: "",
        current: "",
        diff: "",
        pchange: ""
      },
      area: ""
    },
    Metric: {
      average: {
        original: "",
        current: "",
        diff: "",
        pchange: ""
      },
      volumetric: {
        original: "",
        current: "",
        diff: "",
        pchange: ""
      },
      area: ""
    }
  };

  displayMetrics = {
    values: {
      average: {
        original: "",
        current: "",
        diff: "",
        pchange: ""
      },
      volumetric: {
        original: "",
        current: "",
        diff: "",
        pchange: ""
      },
      area: ""
    },
    units: {
      area: "",
      volumetric: "",
      average: ""
    }
  };

  unitSystem: string;

  units = {
    USC: {
      area: "Square Miles",
      cell: "Square Feet",
      volumetric: "Million Gallons Per Day",
      average: "Inches Per Year"
    },
    Metric: {
      area: "Square Kilometers",
      cell: "Square Meters",
      volumetric: "Megaliters Per Day",
      average: "Millimeters Per Year"
    }
  }
  

  mode: string;

  constructor(private mapService: MapService) { }

  ngOnInit() {
    this.mapService.setDetailsPanel(this);
    this.unitSystem = "USC";
    this.mode = "none";
    this.displayMetrics.units = this.units.USC;
  }

  ngAfterViewInit() {
  }


  updateMetrics(mode: string, metrics: any) {
    this.metrics = metrics;

    //console.log(this.metrics);
    
    this.displayMetrics.values = metrics[this.unitSystem];
    //this.displayMetrics.area = metrics.area;


    //capitalize first letter since didn't do this originally
    this.mode = mode.charAt(0).toUpperCase() + mode.slice(1);
  
    //bargraph can only be rendered if element exists
    //delay so transition has time to process (might want to switch how checking for mode)
    setTimeout(() => {
      if(this.chart) {
        this.generateBargraph(parseFloat(metrics[this.unitSystem].volumetric.original), parseFloat(metrics[this.unitSystem].volumetric.current));
      }
    }, 200);
  }

  toggleCaprock(e) {
    this.includeCaprock = !this.includeCaprock;
    this.mapService.toggleCaprock(this, this.mode);
  }

  setUnits(type: string) {

    this.unitSystem = type;

    this.displayMetrics.values = this.metrics[type];

    this.displayMetrics.units = this.units[type];

    //regenerate bargraph with new units if in a recharge vis mode
    if(this.mode != "none" && this.mode != "Cell") {
      this.generateBargraph(parseFloat(this.metrics[this.unitSystem].volumetric.original), parseFloat(this.metrics[this.unitSystem].volumetric.current));
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
      x: ["Total Recharge <br>(" + this.displayMetrics.units.volumetric + ")"],
      y: [originalRecharge],
      // text: 'Text A',
      // textposition: 'auto',
      name: 'Baseline',
      type: 'bar'
    };
    
    let current = {
      x: ["Total Recharge <br>(" + this.displayMetrics.units.volumetric + ")"],
      y: [currentRecharge],
      name: 'This Analysis',
      type: 'bar'
    };
    
    let data = [original, current];

    //start display 10 units below min value, but not less than 0
    let minScale = 0;
    //max recharge 75% of graph height
    let maxRecharge = Math.max(originalRecharge, currentRecharge);
    //let minRecharge = Math.min(originalRecharge, currentRecharge);
    let maxScale = maxRecharge * 2;
    //if both values are 0 just set it to 1
    if(maxScale == 0) {
      maxScale = 1;
    }

    let layout = {
      barmode: 'group',
      height: 240,
      width: 315,
      plot_bgcolor: 'ivory',
      paper_bgcolor: 'ivory',
      margin: {
        l: 50,
        r: 20,
        b: 60,
        t: 40,
        pad: 0
      },
      yaxis: {
        range: [minScale, maxScale]
      },
      annotations: [
        {
          x: -0.2,
          y: originalRecharge,
          xanchor: 'auto',
          yanchor: 'bottom',
          text: originalRecharge.toString(),
          showarrow: false,
          font: {
            size: 10
          }
        },
        {
          x: 0.2,
          y: currentRecharge,
          xanchor: 'auto',
          yanchor: 'bottom',
          text: currentRecharge.toString(),
          showarrow: false,
          font: {
            size: 10
          }
        },
      ]
    };
    
    Plotly.newPlot(this.chart.nativeElement, data, layout);
  }

  setLoading(isLoading: -1 | 1) {
    if(!this.debug) {
      this.loading += isLoading;
    }
  }
}