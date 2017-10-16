import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NgxChartsModule } from '@swimlane/ngx-charts';
import { NgxgraphComponent } from './ngxgraph/ngxgraph.component';



@NgModule({
  imports: [
    CommonModule,
    NgxChartsModule,
  ],
  declarations: [
    NgxgraphComponent,

  ],
  exports: [
    NgxgraphComponent,
  ]
})
export class NgxGraphsModule { }
