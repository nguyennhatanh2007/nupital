import type { BankQrInfo, LoveStoryEvent, Wedding, WeddingEvent } from "@prisma/client";

export interface WeddingData {
  groomName: string;
  groomBio: string;
  brideName: string;
  brideBio: string;
  weddingDate: string;
  location: string;
  heroImage: string;
  groomImage: string;
  brideImage: string;
  storyMilestones: Array<{
    title: string;
    date: string;
    description: string;
    image?: string;
  }>;
  galleryImages: string[];
  bankQrInfo?: {
    bankName: string;
    accountNumber: string;
    ownerName: string;
    qrImage?: string | null;
    groomBankName?: string | null;
    groomAccountNumber?: string | null;
    groomOwnerName?: string | null;
    groomQrImage?: string | null;
    brideBankName?: string | null;
    brideAccountNumber?: string | null;
    brideOwnerName?: string | null;
    brideQrImage?: string | null;
  };
  weddingEvents: Array<{
    type: string;
    title: string;
    dateTime: string;
    lunarDate: string;
    locationName: string;
    locationUrl: string;
  }>;
}

type WeddingWithStory = Wedding & {
  loveStory: LoveStoryEvent[];
  weddingEvents: WeddingEvent[];
  bankQrInfo: BankQrInfo | null;
};

export function mapWeddingToWeddingData(wedding: WeddingWithStory): WeddingData {
  const galleryImages = Array.isArray(wedding.gallery)
    ? wedding.gallery.filter((item): item is string => typeof item === "string")
    : [];

  return {
    groomName: wedding.groomName,
    groomBio: wedding.groomBio,
    brideName: wedding.brideName,
    brideBio: wedding.brideBio,
    weddingDate: wedding.weddingDate.toISOString().split("T")[0],
    location: wedding.location,
    heroImage: wedding.heroImage,
    groomImage: wedding.groomImage,
    brideImage: wedding.brideImage,
    storyMilestones: wedding.loveStory
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((item) => ({
          title: item.title,
          date: item.eventDate.toISOString().split("T")[0],
          description: item.description,
          image: (item as any).image || undefined,
      })),
    galleryImages,
    bankQrInfo: wedding.bankQrInfo
      ? {
          bankName: wedding.bankQrInfo.bankName,
          accountNumber: wedding.bankQrInfo.accountNumber,
          ownerName: wedding.bankQrInfo.ownerName,
          qrImage: wedding.bankQrInfo.qrImage,
          groomBankName: wedding.bankQrInfo.groomBankName,
          groomAccountNumber: wedding.bankQrInfo.groomAccountNumber,
          groomOwnerName: wedding.bankQrInfo.groomOwnerName,
          groomQrImage: wedding.bankQrInfo.groomQrImage,
          brideBankName: wedding.bankQrInfo.brideBankName,
          brideAccountNumber: wedding.bankQrInfo.brideAccountNumber,
          brideOwnerName: wedding.bankQrInfo.brideOwnerName,
          brideQrImage: wedding.bankQrInfo.brideQrImage,
        }
      : undefined,
    weddingEvents: wedding.weddingEvents.map((e) => {
      // compute lunar date automatically if not provided
      const date = e.dateTime;
      const tz = 7; // Vietnam timezone
      const [lday, lmonth, lyear] = convertSolar2Lunar(date.getDate(), date.getMonth() + 1, date.getFullYear(), tz);
      const lunarName = `Ngày ${lday} tháng ${lmonth} năm ${getYearName(lyear)} (Âm lịch)`;
      return {
        type: e.type,
        title: e.title,
        dateTime: e.dateTime.toISOString(),
        lunarDate: e.lunarDate || lunarName,
        locationName: e.locationName,
        locationUrl: e.locationUrl,
      };
    }),
  };
}

// --- Lunar conversion utilities (adapted algorithm) ---
function INT(d: number) {
  return Math.floor(d);
}

function jdFromDate(dd: number, mm: number, yy: number) {
  const a = INT((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
  if (jd < 2299161) {
    jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
  }
  return jd;
}

function getNewMoonDay(k: number, timeZone: number) {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180;
  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  C1 -= 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  C1 -= 0.0004 * Math.sin(dr * 3 * Mpr);
  C1 += 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  C1 -= 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
  C1 -= 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
  C1 += 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
  let deltaT = 0;
  if (T < -11) {
    deltaT = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
  } else {
    deltaT = -0.000278 + 0.000265 * T + 0.000262 * T2;
  }
  const JdNew = Jd1 + C1 - deltaT;
  return INT(JdNew + 0.5 + timeZone / 24);
}

function getSunLongitude(jdn: number, timeZone: number) {
  const T = (jdn - 2451545.5 - timeZone / 24) / 36525;
  const T2 = T * T;
  const dr = Math.PI / 180;
  const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
  let L = L0 + DL;
  L = L * dr;
  L = L - Math.PI * 2 * (INT(L / (Math.PI * 2)));
  return INT(L / Math.PI * 6);
}

function getLunarMonth11(yy: number, timeZone: number) {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = INT(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
}

function getLeapMonthOffset(a11: number, timeZone: number) {
  const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = 0;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);
  return i - 1;
}

export function convertSolar2Lunar(dd: number, mm: number, yy: number, timeZone: number) {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, timeZone);
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, timeZone);
  }
  const a11 = getLunarMonth11(yy, timeZone);
  let b11 = a11;
  let lunarYear = 0;
  if (a11 >= monthStart) {
    lunarYear = yy;
    b11 = getLunarMonth11(yy - 1, timeZone);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1, timeZone);
  }
  const lunarDay = dayNumber - monthStart + 1;
  let diff = INT((monthStart - a11) / 29);
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leap = getLeapMonthOffset(a11, timeZone);
    if (diff >= leap) {
      lunarMonth = diff + 10;
    }
  }
  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
  return [lunarDay, lunarMonth, lunarYear];
}

export function getYearName(year: number) {
  const CAN = ["Canh","Tân","Nhâm","Quý","Giáp","Ất","Bính","Đinh","Mậu","Kỷ"];
  const CHI = ["Thân","Dậu","Tuất","Hợi","Tý","Sửu","Dần","Mão","Thìn","Tỵ","Ngọ","Mùi"];
  return `${CAN[(year + 6) % 10]} ${CHI[(year + 8) % 12]}`;
}