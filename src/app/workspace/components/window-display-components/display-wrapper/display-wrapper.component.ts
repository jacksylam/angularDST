import { Component, OnInit, ViewChild } from '@angular/core';
import { DisplayUnitComponent } from '../display-unit/display-unit.component'

@Component({
  selector: 'app-display-wrapper',
  templateUrl: './display-wrapper.component.html',
  styleUrls: ['./display-wrapper.component.css']
})
export class DisplayWrapperComponent implements OnInit {

  @ViewChild('displayunit') displayUnit;

  constructor() { }

  ngOnInit() {
  }

}
