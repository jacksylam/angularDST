import { TestBed, inject } from '@angular/core/testing';

import { DBConnectService } from './dbconnect.service';

describe('DBConnectService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DBConnectService]
    });
  });

  it('should be created', inject([DBConnectService], (service: DBConnectService) => {
    expect(service).toBeTruthy();
  }));
});
