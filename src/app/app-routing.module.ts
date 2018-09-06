import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from "./home/home.component"
import { WorkspaceComponent } from "./workspace/workspace.component"
import { InstructionsComponent } from './instructions/instructions.component';
import { HowToCiteComponent } from './how-to-cite/how-to-cite.component';
import { BackgroundComponent } from './background/background.component';
import { DisclaimerComponent } from './disclaimer/disclaimer.component';
import { FeedbackComponent } from './feedback/feedback.component';
import { NotFoundComponent } from './not-found/not-found.component';

const routes: Routes = [
  // {
  //   path: '',
  //   children: []
  // }
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home',  component: HomeComponent },
  { path: 'workspace', component: WorkspaceComponent},
  { path: 'instructions',  component: InstructionsComponent },
  { path: 'how_to_cite', component: HowToCiteComponent},
  { path: 'background',  component: BackgroundComponent },
  { path: 'disclaimer', component: DisclaimerComponent},
  { path: 'feedback', component: FeedbackComponent},
  { path: '**', component: NotFoundComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {useHash: true})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
