import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AdvancedMappingDialogComponent } from './advanced-mapping-dialog.component';

describe('AdvancedMappingDialogComponent', () => {
  let component: AdvancedMappingDialogComponent;
  let fixture: ComponentFixture<AdvancedMappingDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AdvancedMappingDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AdvancedMappingDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
