import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayWrapperComponent } from './display-wrapper.component';

describe('DisplayWrapperComponent', () => {
  let component: DisplayWrapperComponent;
  let fixture: ComponentFixture<DisplayWrapperComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DisplayWrapperComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DisplayWrapperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
