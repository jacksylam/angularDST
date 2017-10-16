import { Component, OnInit } from '@angular/core';
import {ViewChild, ElementRef } from '@angular/core';
import * as _ from 'lodash'


@Component({
  selector: 'app-graphs',
  templateUrl: './graphs.component.html',
  styleUrls: ['./graphs.component.css']
})
export class GraphsComponent implements OnInit {
  @ViewChild('chart') el: ElementRef;
  
  constructor() { }

  ngOnInit() {
    this.basicChart()
    
  }

  basicChart() {
    const element = this.el.nativeElement
    const data = [{
      x: [1, 2, 3, 4, 5],
      y: [1, 2, 4, 8, 16]
    }]
    const style = {
      margin: { t: 0 },
      height: 500,
      width: 500
    }
    Plotly.plot( element, data, style )
  }
}
