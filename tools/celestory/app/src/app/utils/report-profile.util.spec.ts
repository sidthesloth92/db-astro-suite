import { describe, expect, it } from 'vitest';
import { reportProfileSubject } from './report-profile.util';

describe('reportProfileSubject', () => {
  it('should name the reported handle in the contact subject', () => {
    expect(reportProfileSubject('astrowithdb')).toBe('Report profile @astrowithdb');
  });
});
