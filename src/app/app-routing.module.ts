import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from "./home/home.component"

//import { WorkspaceComponent } from "./workspace/workspace.component"
import { WorkspaceComponent } from "./workspace/components/workspace/workspace.component"

import { InstructionsComponent } from './instructions/instructions.component';
import { HowToCiteComponent } from './how-to-cite/how-to-cite.component';
import { BackgroundComponent } from './background/background.component';
import { DisclaimerComponent } from './disclaimer/disclaimer.component';
import { FeedbackComponent } from './feedback/feedback.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { LcTableStandaloneComponent } from './lc-table-standalone/lc-table-standalone.component';
import { BrowserGuard } from "./guards/browser-guard.service";
import {BrowserErrorComponent} from "./browser-error/browser-error.component";

const routes: Routes = [
  {
    path: '',
    canActivate: [BrowserGuard],
    children: [
      { path: '', redirectTo: '/home', pathMatch: 'full' },
      { path: 'home',  component: HomeComponent },
      { path: 'workspace', component: WorkspaceComponent},
      { path: 'instructions',  component: InstructionsComponent },
      { path: 'about', component: HowToCiteComponent},
      { path: 'background',  component: BackgroundComponent },
      { path: 'disclaimer', component: DisclaimerComponent},
      { path: 'feedback', component: FeedbackComponent},
      { path: 'land_cover_table', component: LcTableStandaloneComponent},
    ]
  },
  { path: 'browser_error', component: BrowserErrorComponent},
  { path: '**', component: NotFoundComponent}
  
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {useHash: true})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
