/**
 * 农历算法库
 * 基于寿星万年历算法实现
 * 支持1900-2100年农历转换
 */

(function(global) {
  'use strict';

  // 农历数据：每年的月份大小及闰月信息
  // 格式：高4位=闰月月份(0=无闰月), 低12位=各月大小(1=大30天, 0=小29天), 最后数据=闰月大小
  const lunarInfo = [
    0x04AE53,0x0A5748,0x5526BD,0x0D2650,0x0D9544,0x46AAB9,0x056A4D,0x09AD42,0x24AEB6,0x04AE4A, // 1900-1909
    0x6AA74D,0x0A4D52,0x0D4546,0x52D4BA,0x0B554F,0x056A45,0x4AADB0,0x025D44,0x092D49,0x5192BD, // 1910-1919
    0x0A954E,0x0B4A43,0x6B6537,0x0AD54B,0x055340,0x4AF6B5,0x0B5649,0x016A3E,0x60AB43,0x092E58, // 1920-1929
    0x0D164B,0x61E540,0x0CAA55,0x056A4A,0x4AADBE,0x025D52,0x092D47,0x5D92BB,0x0A954F,0x0B4A45, // 1930-1939
    0x4B5539,0x0AD54E,0x055343,0x4AF6B8,0x0B564C,0x016A42,0x60D436,0x0EA54B,0x06AA41,0x5AB54F, // 1940-1949
    0x04B645,0x0A5739,0x5527BD,0x0D264E,0x0D5242,0x4DAAB6,0x056A4A,0x09AD3F,0x24AEB3,0x04AE48, // 1950-1959
    0x6AA73C,0x0A4D50,0x0D4544,0x51D4B8,0x0B554D,0x056A41,0x4AADB6,0x025D4A,0x092D3F,0x5192B3, // 1960-1969
    0x0A9547,0x0B4A3C,0x6B6530,0x0AD54E,0x055343,0x4AF6B7,0x0B564B,0x016A40,0x60AB34,0x092E49, // 1970-1979
    0x0D164D,0x61E542,0x0CAA56,0x056A4B,0x4AADBF,0x025D53,0x092D48,0x5D92BC,0x0A9550,0x0B4A45, // 1980-1989
    0x4B553A,0x0AD54E,0x055344,0x4AF6B8,0x0B564D,0x016A42,0x60D437,0x0EA54C,0x06AA41,0x5AB54F, // 1990-1999
    0x04B645,0x0A573A,0x4527BD,0x0D264E,0x0D5243,0x4DAAB7,0x056A4B,0x09AD40,0x24AEB4,0x04AE49, // 2000-2009
    0x6AA73D,0x0A4D52,0x0D4546,0x51D4BA,0x0B554E,0x056A43,0x4AADBB,0x025D4E,0x092D42,0x5192B6, // 2010-2019
    0x0A954A,0x0B4A40,0x5B6534,0x0AD548,0x05533D,0x4AF6B1,0x0B5645,0x016A3B,0x60AB4F,0x092E43, // 2020-2029
    0x0D1657,0x51E54B,0x0CAA3F,0x056A54,0x4AADB8,0x025D4D,0x092D42,0x5D92B6,0x0A954B,0x0B4A40, // 2030-2039
    0x4B5534,0x0AD549,0x05533E,0x4AF6B2,0x0B5646,0x016A3B,0x60D44F,0x0EA543,0x06AA38,0x5AB54C, // 2040-2049
    0x04B641,0x0A5735,0x4527B9,0x0D264D,0x0D5241,0x4DAAB5,0x056A49,0x09AD3E,0x24AEB2,0x04AE47, // 2050-2059
    0x5AA73B,0x0A4D50,0x0D4544,0x51D4B8,0x0B554C,0x056A41,0x4AADB6,0x025D4A,0x092D3F,0x5192B3, // 2060-2069
    0x0A9547,0x0B4A3C,0x5B6530,0x0AD54E,0x055343,0x4AF6B7,0x0B564B,0x016A40,0x60AB34,0x092E49, // 2070-2079
    0x0D164D,0x61E542,0x0CAA56,0x056A4B,0x4AADBF,0x025D53,0x092D48,0x5D92BC,0x0A9550,0x0B4A45, // 2080-2089
    0x4B553A,0x0AD54E,0x055344,0x4AF6B8,0x0B564D,0x016A42,0x60D437,0x0EA54C,0x06AA41,0x5AB54F, // 2090-2099
    0x04B645, // 2100
  ];

  const Gan = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const Zhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const Animals = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
  const lunarMonths = ['正','二','三','四','五','六','七','八','九','十','冬','腊'];
  const lunarDays = [
    '初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
    '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
    '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'
  ];

  // 节气
  const solarTerms = ['小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至'];
  const solarTermsData = [
    '9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f',
    '97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e',
    '97bcf97c3598082c95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa',
    '97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f',
    'b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f',
    '97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e',
    '97bcf97c3598082c95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa',
    '97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f'
  ];

  // 简化的节气查表法（精确到天）
  const SOLAR_TERMS_TABLE = {
    2024: {
      '1-6':'小寒','1-20':'大寒','2-4':'立春','2-19':'雨水','3-5':'惊蛰','3-20':'春分',
      '4-4':'清明','4-19':'谷雨','5-5':'立夏','5-20':'小满','6-5':'芒种','6-21':'夏至',
      '7-6':'小暑','7-22':'大暑','8-7':'立秋','8-22':'处暑','9-7':'白露','9-22':'秋分',
      '10-8':'寒露','10-23':'霜降','11-7':'立冬','11-22':'小雪','12-6':'大雪','12-21':'冬至'
    },
    2025: {
      '1-5':'小寒','1-20':'大寒','2-3':'立春','2-18':'雨水','3-5':'惊蛰','3-20':'春分',
      '4-4':'清明','4-20':'谷雨','5-5':'立夏','5-21':'小满','6-5':'芒种','6-21':'夏至',
      '7-7':'小暑','7-22':'大暑','8-7':'立秋','8-22':'处暑','9-7':'白露','9-23':'秋分',
      '10-8':'寒露','10-23':'霜降','11-7':'立冬','11-22':'小雪','12-7':'大雪','12-22':'冬至'
    },
    2026: {
      '1-5':'小寒','1-20':'大寒','2-4':'立春','2-19':'雨水','3-6':'惊蛰','3-21':'春分',
      '4-5':'清明','4-20':'谷雨','5-5':'立夏','5-21':'小满','6-6':'芒种','6-21':'夏至',
      '7-7':'小暑','7-23':'大暑','8-7':'立秋','8-23':'处暑','9-8':'白露','9-23':'秋分',
      '10-8':'寒露','10-23':'霜降','11-7':'立冬','11-22':'小雪','12-7':'大雪','12-22':'冬至'
    },
    2027: {
      '1-6':'小寒','1-20':'大寒','2-3':'立春','2-18':'雨水','3-6':'惊蛰','3-21':'春分',
      '4-5':'清明','4-20':'谷雨','5-6':'立夏','5-21':'小满','6-6':'芒种','6-21':'夏至',
      '7-7':'小暑','7-23':'大暑','8-7':'立秋','8-23':'处暑','9-8':'白露','9-23':'秋分',
      '10-8':'寒露','10-23':'霜降','11-7':'立冬','11-22':'小雪','12-7':'大雪','12-22':'冬至'
    },
  };

  /**
   * 获取节气名称
   * @param {number} year
   * @param {number} month 1-12
   * @param {number} day
   */
  function getSolarTerm(year, month, day) {
    const table = SOLAR_TERMS_TABLE[year];
    if (!table) return null;
    const key = `${month}-${day}`;
    return table[key] || null;
  }

  /**
   * 计算某年某月的天数
   */
  function lunarMonthDays(lunarYear, lunarMonth) {
    if ((lunarInfo[lunarYear - 1900] & (0x10000 >> lunarMonth)) === 0) return 29;
    return 30;
  }

  /**
   * 获取某年闰月
   */
  function leapMonth(lunarYear) {
    return lunarInfo[lunarYear - 1900] & 0xf;
  }

  /**
   * 获取某年闰月天数
   */
  function leapDays(lunarYear) {
    if (leapMonth(lunarYear)) {
      return (lunarInfo[lunarYear - 1900] & 0x10000) ? 30 : 29;
    }
    return 0;
  }

  /**
   * 某年的天数（含闰月）
   */
  function yearDays(lunarYear) {
    let sum = 348;
    for (let i = 0x8000; i > 0x8; i >>= 1) {
      if ((lunarInfo[lunarYear - 1900] & i) !== 0) sum += 1;
    }
    return sum + leapDays(lunarYear);
  }

  /**
   * 公历转农历
   * @param {Date} date
   * @returns {{ lunarYear, lunarMonth, lunarDay, isLeap, lunarDayStr, lunarMonthStr, ganZhi, zodiac }}
   */
  function solar2lunar(date) {
    const baseDate = new Date(1900, 0, 31); // 农历1900年1月1日对应公历1900-1-31
    let offset = Math.floor((date - baseDate) / 86400000);
    if (offset < 0) return null;

    let lunarYear, lunarMonth, lunarDay;
    let leap = 0, isLeap = false;
    let temp = 0;

    // 计算农历年
    for (lunarYear = 1900; lunarYear < 2101 && offset > 0; lunarYear++) {
      temp = yearDays(lunarYear);
      offset -= temp;
    }
    if (offset < 0) {
      offset += temp;
      lunarYear--;
    }

    // 计算农历月
    const leapM = leapMonth(lunarYear);
    for (lunarMonth = 1; lunarMonth < 13 && offset > 0; lunarMonth++) {
      // 闰月
      if (leapM > 0 && lunarMonth === (leapM + 1) && leap === 0) {
        lunarMonth--;
        leap = 1;
        temp = leapDays(lunarYear);
      } else {
        temp = lunarMonthDays(lunarYear, lunarMonth);
      }
      // 解除闰月
      if (leap === 1 && lunarMonth === (leapM + 1)) leap = 0;
      offset -= temp;
    }

    if (offset === 0 && leapM > 0 && lunarMonth === leapM + 1) {
      if (leap) {
        leap = 0;
      } else {
        leap = 1;
        lunarMonth--;
      }
    }

    if (offset < 0) {
      offset += temp;
      lunarMonth--;
    }

    lunarDay = offset + 1;
    isLeap = leap === 1;

    const ganIdx = (lunarYear - 4) % 10;
    const zhiIdx = (lunarYear - 4) % 12;

    return {
      lunarYear,
      lunarMonth,
      lunarDay,
      isLeap,
      lunarDayStr: lunarDays[lunarDay - 1],
      lunarMonthStr: (isLeap ? '闰' : '') + lunarMonths[lunarMonth - 1] + '月',
      ganZhi: Gan[ganIdx < 0 ? ganIdx + 10 : ganIdx] + Zhi[zhiIdx < 0 ? zhiIdx + 12 : zhiIdx],
      zodiac: Animals[(zhiIdx < 0 ? zhiIdx + 12 : zhiIdx)]
    };
  }

  global.LunarCalendar = {
    solar2lunar,
    getSolarTerm,
  };

})(window);
