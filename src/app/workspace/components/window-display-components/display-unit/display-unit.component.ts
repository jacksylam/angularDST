import { Component, OnInit, ViewChild, Output, Input, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-display-unit',
  templateUrl: './display-unit.component.html',
  styleUrls: ['./display-unit.component.css']
})
export class DisplayUnitComponent implements OnInit {

  @ViewChild('reportWindow') reportWindow;
  @ViewChild('visWindow') visWindow;

  @Input("id") id;

  @Output("close") close = new EventEmitter();
  
  private position = {
    top: 100,
    left: 300,
    width: 765,
    height: 540
  };

  data = null;

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

  windowClosed(e: any) {
    if(e == "vis") {
      this.components.visWindow = false;
    }
    else {
      this.components.reportWindow = false;
    }

    if(!this.components.reportWindow && !this.components.visWindow) {
      this.close.emit(null);
    }
  }

  //for now pass data through open event (eventually should be pulled automatically from metric service)
  showReport(data: any) {
    this.data = data;
    //set false before true so reloads and brings forward
    this.components.reportWindow = false;
    //ensure component has time to process change
    setTimeout(() => {
      this.components.reportWindow = true;
    }, 0);
    
  }

  ngOnInit() {
  }

  setID(id: number) {
    this.id = id;
  }

}
