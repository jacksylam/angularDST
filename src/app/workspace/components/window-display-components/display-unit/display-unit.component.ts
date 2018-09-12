import { Component, OnInit, Input, ViewChild, Output } from '@angular/core';

@Component({
  selector: 'app-display-unit',
  templateUrl: './display-unit.component.html',
  styleUrls: ['./display-unit.component.css']
})
export class DisplayUnitComponent implements OnInit {

  @ViewChild('window') window

  //@Output()

  private id: number = -1;

  components: {
    visWindow: boolean,
    reportWindow: boolean
  };

  constructor() {
    this.components = {
      visWindow: true,
      reportWindow: false
    }
  }

  ngAterViewInit() {
    
  }

  ngOnInit() {
  }

  setID(id: number) {
    this.id = id;
  }

}
