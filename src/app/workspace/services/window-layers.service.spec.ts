import { TestBed, inject } from '@angular/core/testing';

import { WindowLayersService } from './window-layers.service';

describe('WindowLayersService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WindowLayersService]
    });
  });

  it('should be created', inject([WindowLayersService], (service: WindowLayersService) => {
    expect(service).toBeTruthy();
  }));
});
