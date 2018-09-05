import { Component, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { WindowComponent } from 'app/window/window.component';
import { ComponentFactoryResolver } from '@angular/core/src/linker/component_factory_resolver';

@Component({
  selector: 'app-workspace',
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.css']
})

export class WorkspaceComponent implements OnInit {
  //put this in service instead, have foreach method to get details
  //WindowComponent interface, implemented by VisWindowComponent and ReportWindowComponent with all positional data, titles, etc.
  //have superclass displayUnit, provides window-specific services, ID/displayNumber, and contains an object with constituent VisWindow and ReportWindow (can be null, displays when not null)
  
  //For display unit in the array, generate a DisplayWrapperComponent
  //DisplayWrapperComponent only creates a DisplayUnit (wrapper avoids complexity of having to store all DisplayUnit properties)
  //has @Input accepting a DisplayUnit, and sets its DisplayUnit to this if provided an input, otherwise creates a new one
  static DISPLAY_UNITS: DisplayUnit[] = [];
  //also add methods for adding and removing displayunits from this array in service

  @ViewChild("windowContainer", { read: ViewContainerRef }) container: ViewContainerRef;

  

  constructor(private componentFactoryResolver: ComponentFactoryResolver, private windowFactoryService: WindowFactoryService) { }

  ngAterViewInit() {
    this.windowFactoryService.foreach((unit) => {
      this.loadDisplayUnit(unit);
    });
  }

  ngOnInit() {
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

    componentRef.instance.close.subscribe((closeEvent: any) => {
      componentRef.destroy();
    });
  }

}
