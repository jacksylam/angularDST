import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ShapeNameComponent } from './shape-name.component';

describe('ShapeNameComponent', () => {
  let component: ShapeNameComponent;
  let fixture: ComponentFixture<ShapeNameComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ShapeNameComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ShapeNameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
