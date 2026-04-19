/**
 * 节假日数据库
 * 包含中国法定节假日（2024-2027）
 * 以及特殊纪念日
 */

(function(global) {
  'use strict';

  // 格式：'YYYY-M-D' => { name, type }
  // type: 'holiday'=法定节假日, 'festival'=传统节日, 'international'=国际节日, 'memorial'=纪念日
  const HOLIDAYS = {
    // ========== 固定公历节日 ==========
    // 元旦
    '__1-1': { name: '元旦', type: 'holiday', color: '#ff6b6b' },
    // 妇女节
    '__3-8': { name: '妇女节', type: 'international', color: '#ff9ff3' },
    // 植树节
    '__3-12': { name: '植树节', type: 'memorial', color: '#4ade80' },
    // 世界卫生日
    '__4-7': { name: '世界卫生日', type: 'international', color: '#ffd700' },
    // 愚人节
    '__4-1': { name: '愚人节', type: 'international', color: '#ffd700' },
    // 劳动节
    '__5-1': { name: '劳动节', type: 'holiday', color: '#ff6b6b' },
    // 青年节
    '__5-4': { name: '青年节', type: 'memorial', color: '#4a9eff' },
    // 儿童节
    '__6-1': { name: '儿童节', type: 'international', color: '#ffd700' },
    // 建党节
    '__7-1': { name: '建党节', type: 'memorial', color: '#ff6b6b' },
    // 建军节
    '__8-1': { name: '建军节', type: 'memorial', color: '#ff6b6b' },
    // 教师节
    '__9-10': { name: '教师节', type: 'memorial', color: '#ffd700' },
    // 国庆节
    '__10-1': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '__10-2': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '__10-3': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    // 地球日
    '__4-22': { name: '地球日', type: 'international', color: '#4ade80' },
    // 世界读书日
    '__4-23': { name: '读书日', type: 'international', color: '#4a9eff' },
    // 世界环境日
    '__6-5': { name: '环境日', type: 'international', color: '#4ade80' },
    // 圣诞节
    '__12-25': { name: '圣诞节', type: 'international', color: '#ff6b6b' },
    // 平安夜
    '__12-24': { name: '平安夜', type: 'international', color: '#ff9ff3' },

    // ========== 2024年法定节假日 ==========
    '2024-2-10': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2024-2-11': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2024-2-12': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2024-2-13': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2024-2-14': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2024-2-15': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2024-2-16': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2024-4-4': { name: '清明节', type: 'holiday', color: '#4ade80' },
    '2024-4-5': { name: '清明节', type: 'holiday', color: '#4ade80' },
    '2024-4-6': { name: '清明节', type: 'holiday', color: '#4ade80' },
    '2024-5-1': { name: '劳动节', type: 'holiday', color: '#ff6b6b' },
    '2024-5-2': { name: '劳动节', type: 'holiday', color: '#ff6b6b' },
    '2024-5-3': { name: '劳动节', type: 'holiday', color: '#ff6b6b' },
    '2024-5-4': { name: '劳动节', type: 'holiday', color: '#ff6b6b' },
    '2024-5-5': { name: '劳动节', type: 'holiday', color: '#ff6b6b' },
    '2024-6-8': { name: '端午节', type: 'holiday', color: '#ffd700' },
    '2024-6-9': { name: '端午节', type: 'holiday', color: '#ffd700' },
    '2024-6-10': { name: '端午节', type: 'holiday', color: '#ffd700' },
    '2024-9-15': { name: '中秋节', type: 'holiday', color: '#ffd700' },
    '2024-9-16': { name: '中秋节', type: 'holiday', color: '#ffd700' },
    '2024-9-17': { name: '中秋节', type: 'holiday', color: '#ffd700' },
    '2024-10-1': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '2024-10-2': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '2024-10-3': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '2024-10-4': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '2024-10-5': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '2024-10-6': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '2024-10-7': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },

    // ========== 2025年法定节假日 ==========
    '2025-1-1': { name: '元旦', type: 'holiday', color: '#ff6b6b' },
    '2025-1-28': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2025-1-29': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2025-1-30': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2025-1-31': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2025-2-1': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2025-2-2': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2025-2-3': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2025-2-4': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2025-4-4': { name: '清明节', type: 'holiday', color: '#4ade80' },
    '2025-4-5': { name: '清明节', type: 'holiday', color: '#4ade80' },
    '2025-4-6': { name: '清明节', type: 'holiday', color: '#4ade80' },
    '2025-5-1': { name: '劳动节', type: 'holiday', color: '#ff6b6b' },
    '2025-5-2': { name: '劳动节', type: 'holiday', color: '#ff6b6b' },
    '2025-5-3': { name: '劳动节', type: 'holiday', color: '#ff6b6b' },
    '2025-5-4': { name: '劳动节', type: 'holiday', color: '#ff6b6b' },
    '2025-5-5': { name: '劳动节', type: 'holiday', color: '#ff6b6b' },
    '2025-5-31': { name: '端午节', type: 'holiday', color: '#ffd700' },
    '2025-6-1': { name: '端午节', type: 'holiday', color: '#ffd700' },
    '2025-6-2': { name: '端午节', type: 'holiday', color: '#ffd700' },
    '2025-10-1': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '2025-10-2': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '2025-10-3': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '2025-10-4': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '2025-10-5': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '2025-10-6': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '2025-10-7': { name: '中秋节', type: 'holiday', color: '#ffd700' },
    '2025-10-8': { name: '中秋节', type: 'holiday', color: '#ffd700' },

    // ========== 2026年法定节假日 ==========
    '2026-1-1': { name: '元旦', type: 'holiday', color: '#ff6b6b' },
    '2026-1-2': { name: '元旦', type: 'holiday', color: '#ff6b6b' },
    '2026-1-3': { name: '元旦', type: 'holiday', color: '#ff6b6b' },
    '2026-2-17': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2026-2-18': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2026-2-19': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2026-2-20': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2026-2-21': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2026-2-22': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2026-2-23': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2026-4-5': { name: '清明节', type: 'holiday', color: '#4ade80' },
    '2026-4-6': { name: '清明节', type: 'holiday', color: '#4ade80' },
    '2026-5-1': { name: '劳动节', type: 'holiday', color: '#ff6b6b' },
    '2026-5-2': { name: '劳动节', type: 'holiday', color: '#ff6b6b' },
    '2026-5-3': { name: '劳动节', type: 'holiday', color: '#ff6b6b' },
    '2026-5-4': { name: '劳动节', type: 'holiday', color: '#ff6b6b' },
    '2026-5-5': { name: '劳动节', type: 'holiday', color: '#ff6b6b' },
    '2026-6-19': { name: '端午节', type: 'holiday', color: '#ffd700' },
    '2026-6-20': { name: '端午节', type: 'holiday', color: '#ffd700' },
    '2026-6-21': { name: '端午节', type: 'holiday', color: '#ffd700' },
    '2026-9-25': { name: '中秋节', type: 'holiday', color: '#ffd700' },
    '2026-9-26': { name: '中秋节', type: 'holiday', color: '#ffd700' },
    '2026-9-27': { name: '中秋节', type: 'holiday', color: '#ffd700' },
    '2026-10-1': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '2026-10-2': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '2026-10-3': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '2026-10-4': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '2026-10-5': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '2026-10-6': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '2026-10-7': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },

    // ========== 2027年法定节假日 ==========
    '2027-1-1': { name: '元旦', type: 'holiday', color: '#ff6b6b' },
    '2027-2-6': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2027-2-7': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2027-2-8': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2027-2-9': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2027-2-10': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2027-2-11': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2027-2-12': { name: '春节', type: 'holiday', color: '#ff6b6b' },
    '2027-4-5': { name: '清明节', type: 'holiday', color: '#4ade80' },
    '2027-4-6': { name: '清明节', type: 'holiday', color: '#4ade80' },
    '2027-5-1': { name: '劳动节', type: 'holiday', color: '#ff6b6b' },
    '2027-5-2': { name: '劳动节', type: 'holiday', color: '#ff6b6b' },
    '2027-5-3': { name: '劳动节', type: 'holiday', color: '#ff6b6b' },
    '2027-5-4': { name: '劳动节', type: 'holiday', color: '#ff6b6b' },
    '2027-5-5': { name: '劳动节', type: 'holiday', color: '#ff6b6b' },
    '2027-6-9': { name: '端午节', type: 'holiday', color: '#ffd700' },
    '2027-6-10': { name: '端午节', type: 'holiday', color: '#ffd700' },
    '2027-6-11': { name: '端午节', type: 'holiday', color: '#ffd700' },
    '2027-10-1': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '2027-10-2': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '2027-10-3': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '2027-10-4': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '2027-10-5': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '2027-10-6': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
    '2027-10-7': { name: '国庆节', type: 'holiday', color: '#ff6b6b' },
  };

  /**
   * 获取某日的节假日信息
   * @param {number} year
   * @param {number} month 1-12
   * @param {number} day
   * @returns {{ name, type, color } | null}
   */
  function getHoliday(year, month, day) {
    const specificKey = `${year}-${month}-${day}`;
    const genericKey = `__${month}-${day}`;
    return HOLIDAYS[specificKey] || HOLIDAYS[genericKey] || null;
  }

  global.HolidayDB = { getHoliday };

})(window);
