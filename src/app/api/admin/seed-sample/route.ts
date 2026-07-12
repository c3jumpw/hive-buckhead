/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { getSession } from "@/lib/auth/session"

const FIRST = ["James","Sarah","Michael","Emily","David","Ashley","Chris","Jessica","Matt","Lauren","Tyler","Amanda","Josh","Rachel","Kevin","Megan"]
const LAST  = ["Johnson","Smith","Williams","Brown","Jones","Davis","Miller","Wilson","Moore","Taylor","Anderson","Thomas","Jackson","White","Harris","Martin"]
const OCC   = ["Birthday","Anniversary","Date Night","Business Dinner","Celebration","Graduation",null,null,null]
const NOTES = ["Allergic to shellfish","Window seat preferred","Celebrating anniversary, please have flowers","First time visiting","VIP guest","Vegetarian options needed",null,null,null]
const SECTIONS = ["FINE_DINING","BAR","DEN","PATIO"]
const STATUSES = ["REQUESTED","CONFIRMED","CONFIRMED","SEATED","COMPLETED","COMPLETED","COMPLETED","CANCELLED"]
const TIMES   = ["17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30","21:00"]

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random()*arr.length)] }
function randInt(min: number, max: number) { return Math.floor(Math.random()*(max-min+1))+min }
function randDate(daysOffset: number) {
  const d = new Date(); d.setDate(d.getDate()+daysOffset); return d
}
function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  return Array.from({length:8},()=>chars[Math.floor(Math.random()*chars.length)]).join("")
}

export async function POST() {
  const session = await getSession()
  if (!session || (session.accessLevel !== "OWNER" && session.accessLevel !== "MANAGER")) {
    return NextResponse.json({error:"Forbidden"},{status:403})
  }

  const staff = await prisma.staff.findMany({ where:{active:true,accessLevel:{in:["OWNER","MANAGER","STAFF"]}}, select:{id:true} })
  if (staff.length === 0) return NextResponse.json({error:"No staff found"},{status:400})

  const reservations = []
  for (let i = 0; i < 30; i++) {
    const daysOffset = randInt(-14, 7)
    const status = daysOffset < -1 ? rand(["COMPLETED","COMPLETED","CANCELLED","COMPLETED"]) :
                   daysOffset < 0  ? rand(["COMPLETED","SEATED","COMPLETED"]) :
                   daysOffset === 0 ? rand(["CONFIRMED","SEATED","REQUESTED"]) :
                   rand(["REQUESTED","CONFIRMED","CONFIRMED"])
    const orderTotal = (status==="COMPLETED") ? randInt(80,400) : null
    const serverId = (rand(staff as any[]) as any).id

    reservations.push({
      rsvpCode: generateCode(),
      firstName: rand(FIRST), lastName: rand(LAST),
      phone: `404${randInt(1000000,9999999)}`,
      email: null,
      date: randDate(daysOffset),
      arrivalTime: rand(TIMES),
      partySize: randInt(1,8),
      section: rand(SECTIONS) as never,
      occasion: rand(OCC),
      notes: rand(NOTES),
      source: rand(["web_form","staff","phone","walk_in"]),
      status: status as never,
      serverId,
      orderTotal: orderTotal ? orderTotal : null,
      tipAmount: orderTotal ? Math.round(orderTotal * 0.2) : null,
      closingRemarks: status==="COMPLETED" ? "Great table, guests very happy" : null,
      seatedAt: (status==="SEATED"||status==="COMPLETED") ? new Date() : null,
      completedAt: status==="COMPLETED" ? new Date() : null,
      cancelledAt: status==="CANCELLED" ? new Date() : null,
      confirmedAt: ["CONFIRMED","SEATED","COMPLETED"].includes(status) ? new Date() : null,
    })
  }

  await prisma.reservation.createMany({ data: reservations })

  return NextResponse.json({ count: reservations.length })
}
