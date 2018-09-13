import { Component, OnInit, AfterViewInit, ViewChild, ViewContainerRef, ComponentFactoryResolver } from '@angular/core';
import { DisplayUnitComponent } from '../window-display-components/display-unit/display-unit.component';
@Component({
  selector: 'app-workspace',
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.css']
})

export class WorkspaceComponent implements OnInit, AfterViewInit {

  @ViewChild("windowContainer", { read: ViewContainerRef }) container: ViewContainerRef;

  idPos = [];

  constructor(private componentFactoryResolver: ComponentFactoryResolver) { }

  ngOnInit() {
    this.loadDisplayUnit();
  }

  ngAfterViewInit() {
  }


  loadDisplayUnit() {
    let componentFactory = this.componentFactoryResolver.resolveComponentFactory(DisplayUnitComponent);
    let componentRef = this.container.createComponent<DisplayUnitComponent>(componentFactory);
    componentRef.instance.id = this.getAvailableDisplayID(componentRef);
    componentRef.instance.close.subscribe(() => {
      let id = this.idPos.indexOf(componentRef);
      this.idPos[id] = null;
      console.log(this.idPos);
      componentRef.destroy();
    });
  }

  //might want to move into a service, fine like this for now
  getAvailableDisplayID(componentRef): number {
    for(let i = 0; i < this.idPos.length; i++) {
      if(this.idPos[i] == null) {
        //fill empty spot
        this.idPos[i] = componentRef;
        //return 1 based position
        return i + 1;
      }
    }
    //none have been removed, push new component and return new length as id
    return this.idPos.push(componentRef);
  }
}
