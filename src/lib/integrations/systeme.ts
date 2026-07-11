/**
 * src/lib/integrations/systeme.ts
 * Systeme.io CRM integration — adds/updates contacts when guests RSVP.
 *
 * Tags applied:
 *   past-customer — guest confirmed reservation or attended
 *   hive-club-member — VIP/returning member (manual tag)
 *   inquirer — guest started but did not complete RSVP (future use)
 */

import { SYSTEME_CONFIG } from "@/lib/config"

type SystemeResult = { success: boolean; contactId?: string; error?: string }

/**
 * Upserts a contact in Systeme.io and applies the given tags.
 * If contact already exists (by email), updates their tags.
 * @param email - Guest email address (required for upsert)
 * @param firstName - Guest first name
 * @param lastName - Guest last name
 * @param phone - Guest phone (optional)
 * @param tags - Tag names to apply (must exist in Systeme.io account)
 */
export async function upsertSystemeContact(
  email: string,
  firstName: string,
  lastName: string,
  phone?: string,
  tags: string[] = [SYSTEME_CONFIG.tags.pastCustomer]
): Promise<SystemeResult> {
  try {
    // Systeme.io API: POST /contacts upserts by email
    const response = await fetch(`${SYSTEME_CONFIG.apiUrl}/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": SYSTEME_CONFIG.apiKey,
      },
      body: JSON.stringify({
        email,
        fields: [
          { slug: "first_name", value: firstName },
          { slug: "last_name", value: lastName },
          ...(phone ? [{ slug: "phone", value: phone }] : []),
        ],
        // Tags applied to this contact — must match Systeme.io tag names exactly
        tags: tags.map(name => ({ name })),
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("[Systeme.io] Upsert failed:", err)
      return { success: false, error: err }
    }

    const data = await response.json()
    return { success: true, contactId: String(data.id) }
  } catch (e: any) {
    console.error("[Systeme.io] Network error:", e)
    return { success: false, error: String(e) }
  }
}
