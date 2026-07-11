/**
 * src/lib/integrations/google-sheets.ts
 * Google Sheets integration — writes staff records to a shared spreadsheet.
 *
 * Spreadsheet ID: 1mmLYmcSNZIiyQHFtXVWiF1z3P5DKfQGrhQQM8yndNVE
 * Service account: hive-sheets@gen-lang-client-0286055899.iam.gserviceaccount.com
 *
 * Each tab in the spreadsheet corresponds to a different data type:
 *   "Staff Records"      — all active staff profiles
 *   "Onboarding Log"     — completed onboarding submissions
 *   "Offboarding Log"    — termination records
 */

import { google } from "googleapis"
import { GOOGLE_SHEETS_CONFIG } from "@/lib/config"

/**
 * Creates an authenticated Google Sheets API client.
 * Uses service account credentials (not OAuth — no user login needed).
 */
async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_SHEETS_CONFIG.serviceAccountEmail,
      private_key: GOOGLE_SHEETS_CONFIG.privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })
  return google.sheets({ version: "v4", auth })
}

/**
 * Appends a row of data to the specified sheet tab.
 * @param sheetName - Tab name in the spreadsheet (e.g. "Staff Records")
 * @param row - Array of values to append as a new row
 */
async function appendRow(sheetName: string, row: (string | number | boolean | null)[]): Promise<boolean> {
  try {
    const sheets = await getSheetsClient()
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEETS_CONFIG.spreadsheetId,
      range: `${sheetName}!A1`,  // starts from A1, appends after last row
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    })
    return true
  } catch (e: any) {
    console.error(`[GoogleSheets] appendRow to "${sheetName}" failed:`, e?.message ?? e)
    return false
  }
}

/**
 * Logs a new staff member to the "Staff Records" sheet after onboarding.
 * @param staff - Staff profile data from onboarding completion
 */
export async function logStaffToSheet(staff: {
  teamId: string; name: string; email: string; phone?: string
  role: string; startDate?: string; createdAt: string
}): Promise<boolean> {
  return appendRow(GOOGLE_SHEETS_CONFIG.sheets.staff, [
    staff.teamId, staff.name, staff.email,
    staff.phone ?? "", staff.role,
    staff.startDate ?? "", staff.createdAt,
    new Date().toISOString(),  // date added to sheet
  ])
}

/**
 * Logs a completed onboarding submission to the "Onboarding Log" sheet.
 */
export async function logOnboardingToSheet(data: {
  teamId: string; name: string; email: string
  completedAt: string; position: string
}): Promise<boolean> {
  return appendRow(GOOGLE_SHEETS_CONFIG.sheets.onboarding, [
    data.teamId, data.name, data.email, data.position,
    data.completedAt, new Date().toISOString(),
  ])
}

/**
 * Logs an offboarding record to the "Offboarding Log" sheet.
 */
export async function logOffboardingToSheet(data: {
  teamId?: string; name: string; email: string; role: string
  terminationDate: string; reason: string; processedBy: string
}): Promise<boolean> {
  return appendRow(GOOGLE_SHEETS_CONFIG.sheets.offboarding, [
    data.teamId ?? "", data.name, data.email, data.role,
    data.terminationDate, data.reason, data.processedBy,
    new Date().toISOString(),
  ])
}
