import { TestBed, inject } from '@angular/core/testing';

import { CovDetailsService } from './cov-details.service';

describe('CovDetailsService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CovDetailsService]
    });
  });

  it('should be created', inject([CovDetailsService], (service: CovDetailsService) => {
    expect(service).toBeTruthy();
  }));
});
