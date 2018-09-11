import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportWindowComponent } from './report-window.component';

describe('ReportWindowComponent', () => {
  let component: ReportWindowComponent;
  let fixture: ComponentFixture<ReportWindowComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReportWindowComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReportWindowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
