import { Component, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { ComponentFactoryResolver } from '@angular/core/src/linker/component_factory_resolver';
import { DisplayUnitComponent } from '../window-display-components/display-unit/display-unit.component';
import { DisplayWrapperComponent } from '../window-display-components/display-wrapper/display-wrapper.component'
import { WindowFactoryService } from '../../services/window-factory.service'

@Component({
  selector: 'app-workspace',
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.css']
})

export class WorkspaceComponent implements OnInit {

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

    componentRef.instance.displayUnit.close.subscribe((closeEvent: any) => {
      componentRef.destroy();
    });
  }

}
