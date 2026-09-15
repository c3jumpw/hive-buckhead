"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Edit3, Trash2, Save, X, ChevronDown, ChevronUp, Eye, EyeOff, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

type MenuItem = {
  id: string; name: string; description?: string | null
  price?: number | null; tags?: string | null
  available: boolean; featured: boolean; sortOrder: number
}
type MenuSection = {
  id: string; name: string; description?: string | null; sortOrder: number; active: boolean
  items: MenuItem[]
}

export function MenuManagerClient({ sections: initSections }: { sections: MenuSection[] }) {
  const router = useRouter()
  const [sections, setSections] = useState(initSections)
  const [expandedSection, setExpandedSection] = useState<string | null>(initSections[0]?.id ?? null)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [addingItem, setAddingItem] = useState<string | null>(null) // sectionId
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // New section form
  const [newSectionName, setNewSectionName] = useState("")
  const [newSectionDesc, setNewSectionDesc] = useState("")
  const [addingSection, setAddingSection] = useState(false)

  // New item form
  const [newItem, setNewItem] = useState({ name: "", description: "", price: "", tags: "" })

  async function createSection() {
    if (!newSectionName.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/menu/sections", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSectionName, description: newSectionDesc || null, sortOrder: sections.length }),
      })
      if (res.ok) {
        const { data } = await res.json()
        setSections(prev => [...prev, { ...data, items: [] }])
        setNewSectionName(""); setNewSectionDesc(""); setAddingSection(false)
        toast({ title: `Section "${data.name}" created` })
      }
    } catch { toast({ title: "Failed", variant: "destructive" }) }
    finally { setSaving(false) }
  }

  async function addItem(sectionId: string) {
    if (!newItem.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/menu/items", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId, name: newItem.name.trim(),
          description: newItem.description || null,
          price: newItem.price ? parseFloat(newItem.price) : null,
          tags: newItem.tags || null,
          sortOrder: sections.find(s => s.id === sectionId)?.items.length ?? 0,
        }),
      })
      if (res.ok) {
        const { data } = await res.json()
        setSections(prev => prev.map(s => s.id === sectionId ? { ...s, items: [...s.items, data] } : s))
        setNewItem({ name: "", description: "", price: "", tags: "" })
        setAddingItem(null)
        toast({ title: `"${data.name}" added` })
      }
    } catch { toast({ title: "Failed", variant: "destructive" }) }
    finally { setSaving(false) }
  }

  async function toggleItem(sectionId: string, itemId: string, field: "available" | "featured", value: boolean) {
    setSections(prev => prev.map(s => s.id === sectionId ? {
      ...s, items: s.items.map(i => i.id === itemId ? { ...i, [field]: value } : i)
    } : s))
    await fetch(`/api/menu/items/${itemId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    }).catch(() => toast({ title: "Save failed", variant: "destructive" }))
  }

  async function deleteItem(sectionId: string, itemId: string, name: string) {
    if (!confirm(`Remove "${name}" from the menu?`)) return
    await fetch(`/api/menu/items/${itemId}`, { method: "DELETE" })
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, items: s.items.filter(i => i.id !== itemId) } : s))
    toast({ title: `"${name}" removed` })
  }

  const totalItems = sections.reduce((a, s) => a + s.items.length, 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-hive-surface shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl text-gold-500">Menu Management</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{sections.length} sections · {totalItems} items · <a href="https://menu.hivebuckhead.com" target="_blank" className="text-gold-500 underline underline-offset-2">View public menu ↗</a></p>
          </div>
          <Button size="sm" onClick={() => setAddingSection(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Add Section
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-3xl">
        {/* Add section form */}
        {addingSection && (
          <div className="bg-hive-surface border border-gold-500/30 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-medium text-gold-500">New Section</h3>
            <div className="space-y-1"><Label className="text-xs text-muted-foreground">Section Name *</Label>
              <Input value={newSectionName} onChange={e => setNewSectionName(e.target.value)} placeholder="e.g. Brunch, Dinner, Hookah Flavors" className="h-9" />
            </div>
            <div className="space-y-1"><Label className="text-xs text-muted-foreground">Description (optional)</Label>
              <Input value={newSectionDesc} onChange={e => setNewSectionDesc(e.target.value)} placeholder="e.g. Served all day, every day 11AM–Close" className="h-9" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={createSection} disabled={saving}><Save className="h-3.5 w-3.5 mr-1.5" />Create</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAddingSection(false); setNewSectionName(""); setNewSectionDesc("") }}><X className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        )}

        {sections.length === 0 && !addingSection && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg mb-2">No menu sections yet</p>
            <p className="text-sm mb-4">Add sections like Brunch, Dinner, Happy Hour, or Hookah Flavors</p>
            <Button onClick={() => setAddingSection(true)}><Plus className="h-4 w-4 mr-2" />Add First Section</Button>
          </div>
        )}

        {sections.map(section => (
          <div key={section.id} className="bg-hive-surface border border-border rounded-xl overflow-hidden">
            {/* Section header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <button onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)} className="flex-1 flex items-center gap-2 text-left">
                <span className="font-medium text-sm">{section.name}</span>
                <span className="text-xs text-muted-foreground">({section.items.length} items)</span>
                {expandedSection === section.id ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto" />}
              </button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingItem(section.id); setExpandedSection(section.id) }}>
                <Plus className="h-3 w-3 mr-1" />Add Item
              </Button>
            </div>

            {/* Section items */}
            {expandedSection === section.id && (
              <div className="divide-y divide-border">
                {/* Add item form */}
                {addingItem === section.id && (
                  <div className="p-4 bg-hive-surface2 space-y-3">
                    <p className="text-xs font-medium text-gold-500">New Item</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs text-muted-foreground">Item Name *</Label>
                        <Input value={newItem.name} onChange={e => setNewItem(i => ({ ...i, name: e.target.value }))} placeholder="e.g. Short Rib" className="h-9" autoFocus />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <Textarea value={newItem.description} onChange={e => setNewItem(i => ({ ...i, description: e.target.value }))} placeholder="Tricolor potatoes, mash..." className="h-16 resize-none" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Price ($)</Label>
                        <Input type="number" step="0.01" value={newItem.price} onChange={e => setNewItem(i => ({ ...i, price: e.target.value }))} placeholder="24.00" className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Tags (gf, vegan, spicy…)</Label>
                        <Input value={newItem.tags} onChange={e => setNewItem(i => ({ ...i, tags: e.target.value }))} placeholder="gf,spicy" className="h-9" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => addItem(section.id)} disabled={saving}><Save className="h-3.5 w-3.5 mr-1.5" />Add Item</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setAddingItem(null); setNewItem({ name: "", description: "", price: "", tags: "" }) }}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                )}

                {section.items.length === 0 && addingItem !== section.id && (
                  <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                    No items yet. <button onClick={() => setAddingItem(section.id)} className="text-gold-500 underline underline-offset-2">Add the first item</button>
                  </div>
                )}

                {section.items.map(item => (
                  <div key={item.id} className={cn("flex items-start gap-3 px-4 py-3 hover:bg-hive-surface2/50 transition-colors", !item.available && "opacity-50")}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-sm font-medium", !item.available && "line-through")}>{item.name}</span>
                        {item.featured && <Star className="h-3 w-3 text-gold-500 fill-gold-500" />}
                        {item.price != null && <span className="text-xs text-gold-500 font-medium">${Number(item.price).toFixed(2)}</span>}
                      </div>
                      {item.description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.description}</p>}
                      {item.tags && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{item.tags}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => toggleItem(section.id, item.id, "featured", !item.featured)} title={item.featured ? "Unfeature" : "Feature"} className={cn("p-1.5 rounded hover:bg-hive-surface3 transition-colors", item.featured ? "text-gold-500" : "text-muted-foreground")}>
                        <Star className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => toggleItem(section.id, item.id, "available", !item.available)} title={item.available ? "Mark sold out" : "Mark available"} className="p-1.5 rounded hover:bg-hive-surface3 transition-colors text-muted-foreground hover:text-foreground">
                        {item.available ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => deleteItem(section.id, item.id, item.name)} className="p-1.5 rounded hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
