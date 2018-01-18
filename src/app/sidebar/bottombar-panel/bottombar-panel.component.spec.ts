import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BottombarPanelComponent } from './bottombar-panel.component';

describe('BottombarPanelComponent', () => {
  let component: BottombarPanelComponent;
  let fixture: ComponentFixture<BottombarPanelComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BottombarPanelComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BottombarPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
