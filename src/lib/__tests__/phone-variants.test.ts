import { describe, it, expect } from 'vitest';
import { getPhoneVariants, type NormalizedPhone } from '../phone';

describe('Phone Variants Logic', () => {
  it('should generate variant for 9-digit number', () => {
    const phone: NormalizedPhone = {
      countryCode: '55',
      areaCode: '41',
      number: '999999999',
      full: '5541999999999'
    };
    const variants = getPhoneVariants(phone);
    expect(variants).toHaveLength(2);
    expect(variants[1].number).toBe('99999999');
    expect(variants[1].full).toBe('554199999999');
  });

  it('should generate variant for 8-digit number', () => {
    const phone: NormalizedPhone = {
      countryCode: '55',
      areaCode: '41',
      number: '88888888',
      full: '554188888888'
    };
    const variants = getPhoneVariants(phone);
    expect(variants).toHaveLength(2);
    expect(variants[1].number).toBe('988888888');
    expect(variants[1].full).toBe('5541988888888');
  });
});
