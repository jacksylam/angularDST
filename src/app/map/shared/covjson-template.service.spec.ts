import { TestBed, inject } from '@angular/core/testing';

import { CovjsonTemplateService } from './covjson-template.service';

describe('CovjsonTemplateService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CovjsonTemplateService]
    });
  });

  it('should be created', inject([CovjsonTemplateService], (service: CovjsonTemplateService) => {
    expect(service).toBeTruthy();
  }));
});
