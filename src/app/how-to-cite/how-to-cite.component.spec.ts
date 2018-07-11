import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HowToCiteComponent } from './how-to-cite.component';

describe('HowToCiteComponent', () => {
  let component: HowToCiteComponent;
  let fixture: ComponentFixture<HowToCiteComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HowToCiteComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HowToCiteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
