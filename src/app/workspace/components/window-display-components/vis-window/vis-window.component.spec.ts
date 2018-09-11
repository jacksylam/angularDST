import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VisWindowComponent } from './vis-window.component';

describe('VisWindowComponent', () => {
  let component: VisWindowComponent;
  let fixture: ComponentFixture<VisWindowComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VisWindowComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisWindowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
