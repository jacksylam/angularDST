import { TestBed, inject } from '@angular/core/testing';

import { MapFirestoreService } from './map-firestore.service';

describe('MapFirestoreService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MapFirestoreService]
    });
  });

  it('should be created', inject([MapFirestoreService], (service: MapFirestoreService) => {
    expect(service).toBeTruthy();
  }));
});
