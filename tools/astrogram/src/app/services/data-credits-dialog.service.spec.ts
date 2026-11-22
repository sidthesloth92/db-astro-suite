import { TestBed } from '@angular/core/testing';
import { DataCreditsDialogService } from './data-credits-dialog.service';

describe('DataCreditsDialogService', () => {
  let service: DataCreditsDialogService;

  beforeEach(() => {
    service = TestBed.inject(DataCreditsDialogService);
  });

  it('should start closed', () => {
    expect(service.isOpen()).toBeFalse();
  });

  it('should open and close the dialog', () => {
    service.open();
    expect(service.isOpen()).toBeTrue();

    service.close();
    expect(service.isOpen()).toBeFalse();
  });
});
