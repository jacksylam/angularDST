import { Component, OnInit, AfterViewInit, ViewChild, ViewContainerRef, ComponentFactoryResolver } from '@angular/core';
import { DisplayUnitComponent } from '../window-display-components/display-unit/display-unit.component';
@Component({
  selector: 'app-workspace',
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.css']
})

export class WorkspaceComponent implements OnInit, AfterViewInit {

  @ViewChild("windowContainer", { read: ViewContainerRef }) container: ViewContainerRef;



  constructor(private componentFactoryResolver: ComponentFactoryResolver) { }

  ngOnInit() {
    this.loadDisplayUnit();
  }

  ngAfterViewInit() {
  }


  loadDisplayUnit() {
    let componentFactory = this.componentFactoryResolver.resolveComponentFactory(DisplayUnitComponent);
    this.container.createComponent<DisplayUnitComponent>(componentFactory);
  }

}
