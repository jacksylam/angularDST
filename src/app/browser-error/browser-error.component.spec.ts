import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BrowserErrorComponent } from './browser-error.component';

describe('BrowserErrorComponent', () => {
  let component: BrowserErrorComponent;
  let fixture: ComponentFixture<BrowserErrorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BrowserErrorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BrowserErrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
