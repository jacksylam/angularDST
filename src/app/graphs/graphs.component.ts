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
  
    var values = [];
    for(let i = 0; i < 21; i++){
      values.push(100000000 * Math.cos(Math.random()));
    }

    const element = this.el.nativeElement
    const data = [{
      x: [2020,2021,2022,2023,2024,2025,2026,2027,2028,2029,2030,2031,2032,2033,2034,2035,2036,2037,2038,2039,2040],
      y: values
    }]
    const style = {
      margin: {  l: 65,
        r: 50,
        b: 65,
        t: 90, },
      height: 300,
      width: 1000,
      title: "Potential Recharge",
      yaxis: {
        title: 'Gallons',
      },
      xaxis:{
        title: "Year",
        autotick: false
      }
    }
    Plotly.plot( element, data, style )
  }
}
