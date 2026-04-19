import { db, pool } from "./db";
import { dailyReportSettings } from "@shared/schema";
import { sendWhatsAppMessage } from "./whatsapp";
import { eq } from "drizzle-orm";

export interface PropertyRevenue {
  propertyId: number;
  propertyName: string;
  totalRevenue: number;
}

export interface DailyReportData {
  date: string;
  fromTime: string;
  toTime: string;
  properties: PropertyRevenue[];
  grandTotal: number;
  cashTotal: number;
  upiTotal: number;
}

/**
 * Convert a JS Date to IST date string (YYYY-MM-DD).
 * IST = UTC + 5:30
 */
function toISTDateString(date: Date): string {
  return new Date(date.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0];
}

/**
 * Build the time range for the report window (12:00 PM IST → end).
 * isManual=true  → end = now (current time when button is pressed)
 * isManual=false → end = 11:59:59 PM IST on targetDate (auto nightly run)
 */
export function getReportTimeRange(
  targetDate: string,
  isManual: boolean
): { fromTime: Date; toTime: Date } {
  const fromTime = new Date(`${targetDate}T12:00:00+05:30`);
  const toTime = isManual
    ? new Date()
    : new Date(`${targetDate}T23:59:59+05:30`);
  return { fromTime, toTime };
}

/**
 * Fetch revenue data for the given properties within the [fromTime, toTime] window.
 * Filters on created_at (UTC timestamp) so partial-day manual sends work correctly.
 */
export async function getDailyReportData(
  targetDate: string,
  propertyIds: number[],
  fromTime: Date,
  toTime: Date
): Promise<DailyReportData> {
  if (!propertyIds || propertyIds.length === 0) {
    return {
      date: targetDate,
      fromTime: fromTime.toISOString(),
      toTime: toTime.toISOString(),
      properties: [],
      grandTotal: 0,
      cashTotal: 0,
      upiTotal: 0,
    };
  }

  const client = await pool.connect();
  try {
    const revenueSources = `('booking_payment','advance_payment','food_order_payment','extra_service_payment','addon_payment')`;

    const revenueResult = await client.query(`
      SELECT property_id, COALESCE(SUM(amount::numeric), 0) AS revenue
      FROM wallet_transactions
      WHERE created_at >= $1 AND created_at <= $2
        AND transaction_type = 'credit'
        AND (is_reversal IS NULL OR is_reversal = false)
        AND source IN ('booking_payment','advance_payment','food_order_payment','addon_payment','extra_service_payment')
        AND property_id = ANY($3)
      GROUP BY property_id
    `, [fromTime, toTime, propertyIds]);

    const propResult = await client.query(`
      SELECT id, name FROM properties WHERE id = ANY($1)
    `, [propertyIds]);

    const cashResult = await client.query(`
      SELECT COALESCE(SUM(wt.amount::numeric), 0) AS total
      FROM wallet_transactions wt
      JOIN wallets w ON w.id = wt.wallet_id
      WHERE wt.created_at >= $1 AND wt.created_at <= $2
        AND wt.transaction_type = 'credit'
        AND (wt.is_reversal IS NULL OR wt.is_reversal = false)
        AND w.type = 'cash'
        AND wt.source IN ${revenueSources}
        AND wt.property_id = ANY($3)
    `, [fromTime, toTime, propertyIds]);

    const upiResult = await client.query(`
      SELECT COALESCE(SUM(wt.amount::numeric), 0) AS total
      FROM wallet_transactions wt
      JOIN wallets w ON w.id = wt.wallet_id
      WHERE wt.created_at >= $1 AND wt.created_at <= $2
        AND wt.transaction_type = 'credit'
        AND (wt.is_reversal IS NULL OR wt.is_reversal = false)
        AND w.type = 'upi'
        AND wt.source IN ${revenueSources}
        AND wt.property_id = ANY($3)
    `, [fromTime, toTime, propertyIds]);

    const revenueMap: Record<number, number> = {};
    revenueResult.rows.forEach(r => { revenueMap[r.property_id] = parseFloat(r.revenue); });

    const propsData: PropertyRevenue[] = propertyIds.map(pid => {
      const found = propResult.rows.find(r => r.id === pid);
      const total = revenueMap[pid] || 0;
      return {
        propertyId: pid,
        propertyName: found?.name || `Property #${pid}`,
        totalRevenue: total,
      };
    });

    const grandTotal = propsData.reduce((sum, p) => sum + p.totalRevenue, 0);
    const cashTotal = parseFloat(cashResult.rows[0]?.total || "0");
    const upiTotal = parseFloat(upiResult.rows[0]?.total || "0");

    return {
      date: targetDate,
      fromTime: fromTime.toISOString(),
      toTime: toTime.toISOString(),
      properties: propsData,
      grandTotal,
      cashTotal,
      upiTotal,
    };
  } finally {
    client.release();
  }
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-IN");
}

function fmtIST(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
    hour12: true,
  });
}

/**
 * Returns the 7 template variables for WID 32163:
 * {{1}} = date, {{2..N}} = per-property total, {{N+1}} = grand total, {{N+2}} = cash, {{N+3}} = UPI
 */
export function buildReportVariables(data: DailyReportData): string[] {
  const dateStr = new Date(data.date + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const vars: string[] = [dateStr];
  for (const p of data.properties) {
    vars.push(fmt(p.totalRevenue));
  }
  vars.push(fmt(data.grandTotal));
  vars.push(fmt(data.cashTotal));
  vars.push(fmt(data.upiTotal));

  return vars;
}

/**
 * Renders the full message for preview (mimics what WhatsApp will show)
 */
export function buildReportMessage(data: DailyReportData): string {
  const vars = buildReportVariables(data);
  const date = vars[0];
  const from = fmtIST(data.fromTime);
  const to = fmtIST(data.toTime);

  let msg = `📊 *Daily Revenue Report – The Pahadi Stays*\n\n📅 ${date} (${from} – ${to})\n`;

  data.properties.forEach((p, i) => {
    msg += `\n🏨 ${p.propertyName}: ₹${vars[i + 1]}`;
  });

  const offset = data.properties.length + 1;
  msg += `\n\n💰 *Total Business:* ₹${vars[offset]}`;
  msg += `\n\n💳 Cash: ₹${vars[offset + 1]}`;
  msg += `\n📲 UPI: ₹${vars[offset + 2]}`;
  msg += `\n\n⚙️ Auto-generated by Hostezee PMS`;

  return msg;
}

export async function sendDailyReport(
  targetDate?: string,
  opts: { ignoreEnabled?: boolean; isManual?: boolean } = {}
): Promise<{ success: boolean; message: string; details: string[] }> {
  const [settings] = await db.select().from(dailyReportSettings).limit(1);

  if (!settings) {
    return { success: false, message: "Daily report not configured", details: [] };
  }
  if (!opts.ignoreEnabled && !settings.isEnabled) {
    return { success: false, message: "Daily report is disabled", details: [] };
  }
  if (!settings.phoneNumbers || settings.phoneNumbers.length === 0) {
    return { success: false, message: "No phone numbers configured", details: [] };
  }
  if (!settings.propertyIds || settings.propertyIds.length === 0) {
    return { success: false, message: "No properties selected", details: [] };
  }
  if (!settings.templateId) {
    return { success: false, message: "No WhatsApp template ID configured", details: [] };
  }

  const isManual = opts.isManual ?? false;

  // Determine target date in IST
  const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const date = targetDate || istNow.toISOString().split("T")[0];

  const { fromTime, toTime } = getReportTimeRange(date, isManual);

  console.log(`[DAILY-REPORT] Time range: ${fromTime.toISOString()} → ${toTime.toISOString()} (isManual=${isManual})`);

  const data = await getDailyReportData(date, settings.propertyIds as number[], fromTime, toTime);
  const variables = buildReportVariables(data);

  const details: string[] = [];
  let anySuccess = false;

  for (const phone of settings.phoneNumbers as string[]) {
    const cleaned = phone.replace(/\D/g, "").slice(-10);
    const result = await sendWhatsAppMessage({
      mobile: cleaned,
      countryCode: "91",
      templateId: settings.templateId!,
      variables,
    });
    const icon = result.success ? "✅" : "❌";
    details.push(`${icon} ${phone}: ${result.success ? "Sent" : (result.error || "Failed")}`);
    if (result.success) anySuccess = true;
  }

  await db.update(dailyReportSettings).set({
    lastSentAt: new Date(),
    lastSentStatus: anySuccess ? "success" : "failed",
    lastSentError: anySuccess ? null : details.join("; "),
    updatedAt: new Date(),
  }).where(eq(dailyReportSettings.id, 1));

  return {
    success: anySuccess,
    message: anySuccess ? `Report sent to ${settings.phoneNumbers.length} number(s)` : "Failed to send to all numbers",
    details,
  };
}

let _reportSentToday = "";

export function startDailyReportJob() {
  const INTERVAL = 15 * 60 * 1000;

  async function checkAndSend() {
    try {
      // Use IST time for the hour/minute check
      const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
      const h = nowIST.getUTCHours();
      const m = nowIST.getUTCMinutes();
      const today = nowIST.toISOString().split("T")[0];

      if (h !== 23 || m >= 15) return;
      if (_reportSentToday === today) return;

      _reportSentToday = today;
      console.log("[DAILY-REPORT] Running 11 PM IST daily report...");
      // Auto report: 12 PM IST → 11:59 PM IST (isManual=false)
      const result = await sendDailyReport(today, { isManual: false });
      console.log(`[DAILY-REPORT] ${result.message}`);
      result.details.forEach(d => console.log(`[DAILY-REPORT]  ${d}`));
    } catch (err: any) {
      console.error("[DAILY-REPORT] Error:", err.message);
    }
  }

  setInterval(checkAndSend, INTERVAL);
  console.log("[DAILY-REPORT] Daily report job started — fires at 11:00 PM IST");
}
