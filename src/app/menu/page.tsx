import { prisma } from "@/lib/db/prisma"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Menu | Hive Buckhead",
  description: "View our full menu at Hive Buckhead",
}
export const revalidate = 60

interface MenuItemType {
  id: string; name: string; description?: string | null
  price?: number | null; tags?: string | null
  available: boolean; featured: boolean
}
interface MenuSectionType {
  id: string; name: string; description?: string | null
  items: MenuItemType[]
}

export default async function MenuPage() {
  let sections: MenuSectionType[] = []
  try {
    const raw = await prisma.menuSection.findMany({
      where: { active: true },
      include: {
        items: {
          where: { active: true },
          orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
        }
      },
      orderBy: { sortOrder: "asc" },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sections = raw as any
  } catch { /* Menu not yet seeded */ }

  const tagLabel: Record<string, string> = {
    gf: "Gluten-Free", v: "Vegetarian", vegan: "Vegan", nuts: "Contains Nuts",
    dairy: "Contains Dairy", spicy: "Spicy", halal: "Halal",
  }

  return (
    <div className="min-h-screen bg-hive-bg text-foreground py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/icon.png" alt="Hive Buckhead" width={56} height={56} className="mx-auto mb-3" />
          <h1 className="font-serif text-4xl text-gold-500 tracking-[0.1em]">HIVE BUCKHEAD</h1>
          <p className="text-muted-foreground text-sm tracking-wider mt-1">OUR MENU</p>
        </div>
        {sections.length === 0 ? (
          <div className="text-center text-muted-foreground py-20">
            <p className="text-lg mb-2">Menu coming soon</p>
            <p className="text-sm">Call us at (678) 539-6865 for today selection.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {sections.map(section => (
              <div key={section.id}>
                <div className="mb-4 pb-2 border-b border-gold-500/30">
                  <h2 className="font-serif text-2xl text-gold-500">{section.name}</h2>
                  {section.description && <p className="text-sm text-muted-foreground mt-1">{section.description}</p>}
                </div>
                <div className="space-y-3">
                  {section.items.map(item => (
                    <div key={item.id} className={`flex items-start justify-between gap-4 p-3 rounded-lg ${!item.available ? "opacity-50" : ""} ${item.featured ? "bg-gold-500/5 border border-gold-500/20" : ""}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{item.name}</span>
                          {item.featured && <span className="text-[10px] text-gold-500 border border-gold-500/40 rounded px-1.5 py-0.5">Featured</span>}
                          {!item.available && <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">Unavailable</span>}
                        </div>
                        {item.description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.description}</p>}
                        {item.tags && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.tags.split(",").map((t: string) => t.trim()).filter(Boolean).map((tag: string) => (
                              <span key={tag} className="text-[10px] text-muted-foreground/60 border border-border/50 rounded px-1 py-0.5">
                                {tagLabel[tag] ?? tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {item.price != null && (
                        <span className="text-gold-500 font-medium text-sm shrink-0">${Number(item.price).toFixed(2)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-12 text-center text-xs text-muted-foreground pb-8">
          <p>Menu subject to availability. Prices may change without notice.</p>
          <p className="mt-1"><a href="/rsvp" className="text-gold-500">Make a reservation</a></p>
        </div>
      </div>
    </div>
  )
}
