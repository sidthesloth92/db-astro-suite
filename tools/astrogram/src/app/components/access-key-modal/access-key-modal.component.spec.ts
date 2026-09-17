import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsService } from '@db-astro-suite/ui';
import { AccessKeyModalComponent } from './access-key-modal.component';

describe('AccessKeyModalComponent', () => {
  let fixture: ComponentFixture<AccessKeyModalComponent>;
  let component: AccessKeyModalComponent;
  let analytics: jasmine.SpyObj<AnalyticsService>;

  beforeEach(async () => {
    analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', [
      'trackInstagramCtaClicked',
      'trackAccessKeySubmitted',
    ]);
    await TestBed.configureTestingModule({
      imports: [AccessKeyModalComponent],
      providers: [{ provide: AnalyticsService, useValue: analytics }],
    }).compileComponents();

    fixture = TestBed.createComponent(AccessKeyModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should start in the gate view', () => {
    expect(component.view()).toBe('cta');
  });

  it('should jump to the key-entry view when showError is set', () => {
    fixture.componentRef.setInput('showError', true);
    fixture.detectChanges();
    expect(component.view()).toBe('key');
  });

  it('should keep submit disabled below the minimum key length', () => {
    component.keyValue.set('abc');
    expect(component.isSubmitDisabled()).toBeTrue();
  });

  it('should enable submit at four or more characters', () => {
    component.keyValue.set('abcd');
    expect(component.isSubmitDisabled()).toBeFalse();
  });

  it('should emit the trimmed key on submit when long enough', () => {
    const emitted: string[] = [];
    component.submitted.subscribe((k) => emitted.push(k));
    component.keyValue.set('  ASTRO-1234  ');
    component.onSubmit();
    expect(emitted).toEqual(['ASTRO-1234']);
    expect(analytics.trackAccessKeySubmitted).toHaveBeenCalledWith(true);
  });

  it('should not emit when the key is too short', () => {
    const emitted: string[] = [];
    component.submitted.subscribe((k) => emitted.push(k));
    component.keyValue.set('ab');
    component.onSubmit();
    expect(emitted).toEqual([]);
    expect(analytics.trackAccessKeySubmitted).toHaveBeenCalledWith(false);
  });

  it('should emit cancelled on close', () => {
    let cancelled = false;
    component.cancelled.subscribe(() => (cancelled = true));
    component.onCancel();
    expect(cancelled).toBeTrue();
  });

  it('should switch between views', () => {
    component.switchToKey();
    expect(component.view()).toBe('key');
    component.switchToCta();
    expect(component.view()).toBe('cta');
  });
});
