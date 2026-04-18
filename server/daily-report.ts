import { db, pool } from "./db";
import { dailyReportSettings, properties } from "@shared/schema";
import { sendWhatsAppMessage } from "./whatsapp";
import { eq } from "drizzle-orm";

export interface PropertyRevenue {
  propertyId: number;
  propertyName: string;
  roomRevenue: number;
  foodRevenue: number;
  extraRevenue: number;
  totalRevenue: number;
}

export interface DailyReportData {
  date: string;
  properties: PropertyRevenue[];
  grandTotal: number;
  cashTotal: number;
  upiTotal: number;
}

export async function getDailyReportData(targetDate: string, propertyIds: number[]): Promise<DailyReportData> {
  if (!propertyIds || propertyIds.length === 0) {
    return { date: targetDate, properties: [], grandTotal: 0, cashTotal: 0, upiTotal: 0 };
  }

  const client = await pool.connect();
  try {
    const revenueSources = `('booking_payment','advance_payment','food_order_payment','extra_service_payment','addon_payment')`;

    const roomResult = await client.query(`
      SELECT property_id, COALESCE(SUM(amount::numeric), 0) AS revenue
      FROM wallet_transactions
      WHERE transaction_date = $1
        AND transaction_type = 'credit'
        AND (is_reversal IS NULL OR is_reversal = false)
        AND source IN ('booking_payment','advance_payment')
        AND property_id = ANY($2)
      GROUP BY property_id
    `, [targetDate, propertyIds]);

    const foodResult = await client.query(`
      SELECT property_id, COALESCE(SUM(amount::numeric), 0) AS revenue
      FROM wallet_transactions
      WHERE transaction_date = $1
        AND transaction_type = 'credit'
        AND (is_reversal IS NULL OR is_reversal = false)
        AND source IN ('food_order_payment','addon_payment')
        AND property_id = ANY($2)
      GROUP BY property_id
    `, [targetDate, propertyIds]);

    const extraResult = await client.query(`
      SELECT property_id, COALESCE(SUM(amount::numeric), 0) AS revenue
      FROM wallet_transactions
      WHERE transaction_date = $1
        AND transaction_type = 'credit'
        AND (is_reversal IS NULL OR is_reversal = false)
        AND source = 'extra_service_payment'
        AND property_id = ANY($2)
      GROUP BY property_id
    `, [targetDate, propertyIds]);

    const propResult = await client.query(`
      SELECT id, name FROM properties WHERE id = ANY($1) ORDER BY id
    `, [propertyIds]);

    const cashResult = await client.query(`
      SELECT COALESCE(SUM(wt.amount::numeric), 0) AS total
      FROM wallet_transactions wt
      JOIN wallets w ON w.id = wt.wallet_id
      WHERE wt.transaction_date = $1
        AND wt.transaction_type = 'credit'
        AND (wt.is_reversal IS NULL OR wt.is_reversal = false)
        AND w.type = 'cash'
        AND wt.source IN ${revenueSources}
        AND wt.property_id = ANY($2)
    `, [targetDate, propertyIds]);

    const upiResult = await client.query(`
      SELECT COALESCE(SUM(wt.amount::numeric), 0) AS total
      FROM wallet_transactions wt
      JOIN wallets w ON w.id = wt.wallet_id
      WHERE wt.transaction_date = $1
        AND wt.transaction_type = 'credit'
        AND (wt.is_reversal IS NULL OR wt.is_reversal = false)
        AND w.type = 'upi'
        AND wt.source IN ${revenueSources}
        AND wt.property_id = ANY($2)
    `, [targetDate, propertyIds]);

    const roomMap: Record<number, number> = {};
    roomResult.rows.forEach(r => { roomMap[r.property_id] = parseFloat(r.revenue); });
    const foodMap: Record<number, number> = {};
    foodResult.rows.forEach(r => { foodMap[r.property_id] = parseFloat(r.revenue); });
    const extraMap: Record<number, number> = {};
    extraResult.rows.forEach(r => { extraMap[r.property_id] = parseFloat(r.revenue); });

    const propsData: PropertyRevenue[] = propertyIds.map(pid => {
      const found = propResult.rows.find(r => r.id === pid);
      const rooms = roomMap[pid] || 0;
      const food = foodMap[pid] || 0;
      const extra = extraMap[pid] || 0;
      return {
        propertyId: pid,
        propertyName: found?.name || `Property #${pid}`,
        roomRevenue: rooms,
        foodRevenue: food,
        extraRevenue: extra,
        totalRevenue: rooms + food + extra,
      };
    });

    const grandTotal = propsData.reduce((sum, p) => sum + p.totalRevenue, 0);
    const cashTotal = parseFloat(cashResult.rows[0]?.total || "0");
    const upiTotal = parseFloat(upiResult.rows[0]?.total || "0");

    return { date: targetDate, properties: propsData, grandTotal, cashTotal, upiTotal };
  } finally {
    client.release();
  }
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-IN");
}

export function buildReportVariable(data: DailyReportData): string {
  const dateStr = new Date(data.date + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });

  let body = `📅 ${dateStr}\n`;

  for (const p of data.properties) {
    body += `\n🏨 ${p.propertyName}\n`;
    body += `• Rooms: ₹${fmt(p.roomRevenue)}\n`;
    body += `• Food: ₹${fmt(p.foodRevenue)}\n`;
    body += `• Extra: ₹${fmt(p.extraRevenue)}\n`;
    body += `• Total: ₹${fmt(p.totalRevenue)}`;
  }

  body += `\n\n💰 Grand Total: ₹${fmt(data.grandTotal)}`;
  body += `\n💳 Cash: ₹${fmt(data.cashTotal)}`;
  body += `\n📲 UPI: ₹${fmt(data.upiTotal)}`;

  return body;
}

export function buildReportMessage(data: DailyReportData): string {
  return buildReportVariable(data);
}

export async function sendDailyReport(targetDate?: string): Promise<{ success: boolean; message: string; details: string[] }> {
  const [settings] = await db.select().from(dailyReportSettings).limit(1);

  if (!settings || !settings.isEnabled) {
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

  const date = targetDate || new Date().toISOString().split("T")[0];
  const data = await getDailyReportData(date, settings.propertyIds as number[]);
  const messageBody = buildReportMessage(data);

  const details: string[] = [];
  let anySuccess = false;

  for (const phone of settings.phoneNumbers as string[]) {
    const cleaned = phone.replace(/\D/g, "").slice(-10);
    const result = await sendWhatsAppMessage({
      mobile: cleaned,
      countryCode: "91",
      templateId: settings.templateId!,
      variables: [messageBody],
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
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const today = now.toISOString().split("T")[0];

      if (h !== 23 || m >= 15) return;
      if (_reportSentToday === today) return;

      _reportSentToday = today;
      console.log("[DAILY-REPORT] Running 11 PM daily report...");
      const result = await sendDailyReport(today);
      console.log(`[DAILY-REPORT] ${result.message}`);
      result.details.forEach(d => console.log(`[DAILY-REPORT]  ${d}`));
    } catch (err: any) {
      console.error("[DAILY-REPORT] Error:", err.message);
    }
  }

  setInterval(checkAndSend, INTERVAL);
  console.log("[DAILY-REPORT] Daily report job started — fires at 11:00 PM");
}
