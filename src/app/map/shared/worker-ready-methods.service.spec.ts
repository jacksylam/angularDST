import { TestBed } from '@angular/core/testing';

import { WorkerReadyMethodsService } from './worker-ready-methods.service';

describe('WorkerReadyMethodsService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: WorkerReadyMethodsService = TestBed.get(WorkerReadyMethodsService);
    expect(service).toBeTruthy();
  });
});
