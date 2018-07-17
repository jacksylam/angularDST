import { TestBed, inject } from '@angular/core/testing';

import { ModifiedShpwriteService } from './modified-shpwrite.service';

describe('ModifiedShpwriteService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ModifiedShpwriteService]
    });
  });

  it('should be created', inject([ModifiedShpwriteService], (service: ModifiedShpwriteService) => {
    expect(service).toBeTruthy();
  }));
});
