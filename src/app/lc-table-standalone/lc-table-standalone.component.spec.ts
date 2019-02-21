import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LcTableStandaloneComponent } from './lc-table-standalone.component';

describe('LcTableStandaloneComponent', () => {
  let component: LcTableStandaloneComponent;
  let fixture: ComponentFixture<LcTableStandaloneComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LcTableStandaloneComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LcTableStandaloneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
