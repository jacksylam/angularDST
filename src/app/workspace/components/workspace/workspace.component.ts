import { Component, OnInit, AfterViewInit, ViewChild, ViewContainerRef, ComponentFactoryResolver } from '@angular/core';
import { DisplayUnitComponent } from '../window-display-components/display-unit/display-unit.component';
import { DisplayWrapperComponent } from '../window-display-components/display-wrapper/display-wrapper.component'
import { WindowFactoryService } from '../../services/window-factory.service'

@Component({
  selector: 'app-workspace',
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.css']
})

export class WorkspaceComponent implements OnInit, AfterViewInit {

  @ViewChild("windowContainer", { read: ViewContainerRef }) container: ViewContainerRef;

  static test;

  constructor(private componentFactoryResolver: ComponentFactoryResolver, private windowFactoryService: WindowFactoryService) { }

  ngOnInit() {
    if(WorkspaceComponent.test == undefined) {
      WorkspaceComponent.test = this.container;
    }
    else {
      this.container = WorkspaceComponent.test;
    }
    // if(this.windowFactoryService.isEmpty()) {
    //   this.addWindow();
    // }
    // else{
    //   this.windowFactoryService.foreach((unit) => {
    //     let componentRef = this.loadDisplayUnit();
    //     setTimeout(() => {
    //       //componentRef.destroy();
    //       componentRef.instance.displayUnit.window.mapComponent = unit.window.mapComponent;
    //       console.log(componentRef.instance.displayUnit);
    //     }, 10000);
    //   });
    // }
  }

  ngAfterViewInit() {
  }

  addWindow() {
    this.loadDisplayUnit();
  }

  loadDisplayUnit(displayUnit?: DisplayUnitComponent) {
    let componentFactory = this.componentFactoryResolver.resolveComponentFactory(DisplayWrapperComponent);
    let componentRef = this.container.createComponent<DisplayWrapperComponent>(componentFactory);
    if(displayUnit != undefined) {
      componentRef.instance.displayUnit = displayUnit;
    }
    else {
      //add the new window's display unit to the list of created display units
      this.windowFactoryService.addUnit(componentRef.instance.displayUnit);
    }
    //console.log(displayUnit);
    return componentRef;

    // componentRef.instance.displayUnit.close.subscribe((closeEvent: any) => {
    //   componentRef.destroy();
    // });
  }

}
