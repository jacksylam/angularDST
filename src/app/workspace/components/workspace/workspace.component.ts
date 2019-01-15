import { Component, OnInit, AfterViewInit, ViewChild, ViewContainerRef, ComponentFactoryResolver } from '@angular/core';
import { DisplayUnitComponent } from '../window-display-components/display-unit/display-unit.component';
import {MatDialog} from "@angular/material";
import {TermsOfUseComponent} from "../../../terms-of-use/terms-of-use.component"
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-workspace',
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.css']
})

export class WorkspaceComponent implements OnInit, AfterViewInit {

  @ViewChild("windowContainer", { read: ViewContainerRef }) container: ViewContainerRef;

  idPos = [];
  accepted = false;

  constructor(private componentFactoryResolver: ComponentFactoryResolver, private dialog: MatDialog, route: ActivatedRoute) {
    route.url.subscribe(() => {
      this.serveTerms();
    });
  }

  ngOnInit() {
    this.loadDisplayUnit();
  }

  ngAfterViewInit() {
  }

  serveTerms() {
    if(!this.accepted) {
      this.dialog.open(TermsOfUseComponent, {maxHeight: "90vh"}).afterClosed()
      .subscribe((accepted) => {
        this.accepted = accepted;
      });
    }
  }


  loadDisplayUnit() {
    let componentFactory = this.componentFactoryResolver.resolveComponentFactory(DisplayUnitComponent);
    let componentRef = this.container.createComponent<DisplayUnitComponent>(componentFactory);
    componentRef.instance.id = this.getAvailableDisplayID(componentRef);
    componentRef.instance.close.subscribe(() => {
      let id = this.idPos.indexOf(componentRef);
      this.idPos[id] = null;
      //console.log(this.idPos);
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
