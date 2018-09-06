import { TestBed, inject } from '@angular/core/testing';

import { WindowFactoryService } from './window-factory.service';

describe('WindowFactoryService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WindowFactoryService]
    });
  });

  it('should be created', inject([WindowFactoryService], (service: WindowFactoryService) => {
    expect(service).toBeTruthy();
  }));
});
