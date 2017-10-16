import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxgraphComponent } from './ngxgraph.component';

describe('NgxgraphComponent', () => {
  let component: NgxgraphComponent;
  let fixture: ComponentFixture<NgxgraphComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NgxgraphComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NgxgraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
