import { TestBed } from '@angular/core/testing';

import { MetricsComputatorService } from './metrics-computator.service';

describe('MetricsComputatorService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: MetricsComputatorService = TestBed.get(MetricsComputatorService);
    expect(service).toBeTruthy();
  });
});
