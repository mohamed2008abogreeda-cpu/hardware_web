import { describe, it, expect } from 'vitest';
import { getDisplayStatus, filterForCustomer } from '../src/config/access-reader';

/**
 * Unit tests for Access DB reader — status mapping and field filtering.
 * Based on REAL database values from accounting.mdb.
 */

describe('getDisplayStatus', () => {
  // Real rep_state values: "تم التسليم", "لم يتم التسليم", numbers, empty
  // Real rep_state2 values: "تم الاصلاح", "لا تصلح", "إعاده توجيه", "الرجوع للعميل", empty

  it('should return "تم التسليم" when repState is "تم التسليم"', () => {
    expect(getDisplayStatus('anything', 'تم التسليم')).toBe('تم التسليم');
  });

  it('should return "جاهز للاستلام" when repState2 is "تم الاصلاح"', () => {
    expect(getDisplayStatus('تم الاصلاح', '')).toBe('جاهز للاستلام');
  });

  it('should return "لا تصلح" when repState2 is "لا تصلح"', () => {
    expect(getDisplayStatus('لا تصلح', '')).toBe('لا تصلح');
  });

  it('should return "إعاده توجيه" when repState2 is "إعاده توجيه"', () => {
    expect(getDisplayStatus('إعاده توجيه', '')).toBe('إعاده توجيه');
  });

  it('should return "انتظار موافقة" when repState2 is "الرجوع للعميل"', () => {
    expect(getDisplayStatus('الرجوع للعميل', '')).toBe('انتظار موافقة');
  });

  it('should return "قيد الإصلاح" when repState is "لم يتم التسليم" and repState2 is empty', () => {
    expect(getDisplayStatus('', 'لم يتم التسليم')).toBe('قيد الإصلاح');
  });

  it('should return "قيد الفحص" as default when both are empty', () => {
    expect(getDisplayStatus('', '')).toBe('قيد الفحص');
  });

  it('should prioritize "تم التسليم" over any repState2 value', () => {
    expect(getDisplayStatus('تم الاصلاح', 'تم التسليم')).toBe('تم التسليم');
    expect(getDisplayStatus('لا تصلح', 'تم التسليم')).toBe('تم التسليم');
  });

  it('should handle real data combinations from the database', () => {
    // Most common: delivered (12,218 records)
    expect(getDisplayStatus('', 'تم التسليم')).toBe('تم التسليم');
    // Not delivered yet (2,565 records)
    expect(getDisplayStatus('', 'لم يتم التسليم')).toBe('قيد الإصلاح');
    // Repaired (7,112 records)
    expect(getDisplayStatus('تم الاصلاح', 'لم يتم التسليم')).toBe('جاهز للاستلام');
    // Unrepairable (2,209 records)
    expect(getDisplayStatus('لا تصلح', 'لم يتم التسليم')).toBe('لا تصلح');
    // Redirected (66 records)
    expect(getDisplayStatus('إعاده توجيه', 'لم يتم التسليم')).toBe('إعاده توجيه');
    // Customer callback (41 records)
    expect(getDisplayStatus('الرجوع للعميل', 'لم يتم التسليم')).toBe('انتظار موافقة');
  });
});

describe('filterForCustomer', () => {
  it('should only expose safe fields and strip internal data', () => {
    const record = {
      rep_code: 'AB-4806',
      rep_agent: 'احمد مصطفى سامى',
      rep_tel: '01555407414',
      rep_name: 'seagate1tb lap',
      rep_date1: '02/20/22 22:28:38',
      rep_date2: '02/21/22 22:28:38',
      rep_defects: 'شاشة مكسورة',
      rep_serial: 'SN123456',
      rep_emp: 'حسان',
      rep_solution: '',
      rep_amount: '0',
      rep_state: 'لم يتم التسليم',
      rep_state2: '',
      rep_user: 'محمود',
      rep_user2: '',
      rep_emp2: '',
      rep_memo: 'ملاحظات داخلية',
    };

    const filtered = filterForCustomer(record);

    // Should expose customer-safe fields
    expect(filtered.rep_code).toBe('AB-4806');
    expect(filtered.rep_name).toBe('seagate1tb lap');
    expect(filtered.rep_agent).toBe('احمد مصطفى سامى');
    expect(filtered.rep_defects).toBe('شاشة مكسورة');
    expect(filtered.displayStatus).toBe('قيد الإصلاح');

    // Should NOT expose internal fields
    expect(filtered).not.toHaveProperty('rep_tel');
    expect(filtered).not.toHaveProperty('rep_emp');
    expect(filtered).not.toHaveProperty('rep_emp2');
    expect(filtered).not.toHaveProperty('rep_user');
    expect(filtered).not.toHaveProperty('rep_user2');
    expect(filtered).not.toHaveProperty('rep_memo');
    expect(filtered).not.toHaveProperty('rep_serial');
  });

  it('should map repair-completed to "جاهز للاستلام"', () => {
    const record = {
      rep_code: 'AB-4807',
      rep_agent: 'اسامه صلاح صيام',
      rep_tel: '01020785833',
      rep_name: 'hp tower',
      rep_date1: '02/21/22 13:49:31',
      rep_date2: '02/22/22 13:49:31',
      rep_defects: 'win10',
      rep_serial: '',
      rep_emp: 'حازم ابو النجا',
      rep_solution: 'تم تنصيب الويندوز',
      rep_amount: '0',
      rep_state: 'لم يتم التسليم',
      rep_state2: 'تم الاصلاح',
      rep_user: 'محمود',
      rep_user2: '',
      rep_emp2: '',
      rep_memo: '',
    };

    const filtered = filterForCustomer(record);
    expect(filtered.displayStatus).toBe('جاهز للاستلام');
  });
});
