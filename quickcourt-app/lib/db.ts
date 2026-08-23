import dns from "node:dns"
import { URL } from "node:url"
import mongoose, { Schema, model, models } from "mongoose"

dns.setServers(["8.8.8.8", "1.1.1.1"])
dns.setDefaultResultOrder("ipv4first")

const MONGO_URL = process.env.MONGO_URL || ""
const ATLAS_FALLBACK_HOSTS = [
  "ac-n1pzoxc-shard-00-00.hhb3oip.mongodb.net:27017",
  "ac-n1pzoxc-shard-00-01.hhb3oip.mongodb.net:27017",
  "ac-n1pzoxc-shard-00-02.hhb3oip.mongodb.net:27017",
]

let cached = (global as typeof globalThis & {
  mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
}).mongoose

if (!cached) {
  cached = (global as typeof globalThis & {
    mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
  }).mongoose = { conn: null, promise: null }
}

function databaseNameFromUrl(url: string): string {
  const named = process.env.MONGO_DB?.trim()
  if (named) return named
  try {
    const parsed = new URL(url.replace(/^mongodb\+srv:\/\//i, "https://"))
    const fromPath = parsed.pathname.replace(/^\//, "").trim()
    if (fromPath) return fromPath
  } catch {
    return "quickcourt"
  }
  return "quickcourt"
}

function srvToStandard(url: string, hosts: string[], dbName: string): string {
  const parsed = new URL(url.replace(/^mongodb\+srv:\/\//i, "https://"))
  const auth = parsed.username
    ? `${encodeURIComponent(decodeURIComponent(parsed.username))}:${encodeURIComponent(decodeURIComponent(parsed.password))}@`
    : ""
  const params = new URLSearchParams(parsed.search)
  params.set("ssl", "true")
  params.set("retryWrites", "true")
  params.set("w", "majority")
  params.set("authSource", params.get("authSource") || "admin")
  params.set("appName", params.get("appName") || "quickcourt")
  return `mongodb://${auth}${hosts.join(",")}/${dbName}?${params.toString()}`
}

async function resolveMongoUrl(url: string): Promise<{ uri: string; dbName: string }> {
  const dbName = databaseNameFromUrl(url)
  if (!url.startsWith("mongodb+srv://")) {
    return { uri: url, dbName }
  }
  try {
    const hostname = new URL(url.replace(/^mongodb\+srv:\/\//i, "https://")).hostname
    const records = await dns.promises.resolveSrv(`_mongodb._tcp.${hostname}`)
    const hosts = records
      .sort((a, b) => a.priority - b.priority || b.weight - a.weight)
      .map((r) => `${r.name}:${r.port}`)
    if (hosts.length === 0) {
      return { uri: srvToStandard(url, ATLAS_FALLBACK_HOSTS, dbName), dbName }
    }
    return { uri: srvToStandard(url, hosts, dbName), dbName }
  } catch {
    return { uri: srvToStandard(url, ATLAS_FALLBACK_HOSTS, dbName), dbName }
  }
}

async function mergeFromTest(conn: typeof mongoose) {
  const current = conn.connection.name
  if (current !== "quickcourt") return
  const source = conn.connection.getClient().db("test")
  const target = conn.connection.db
  if (!target) return
  const names = ["users", "venues", "courts", "bookings", "timeslots", "reports", "alerts"]
  for (const name of names) {
    const docs = await source.collection(name).find({}).toArray()
    for (const doc of docs) {
      await target.collection(name).updateOne({ _id: doc._id }, { $setOnInsert: doc }, { upsert: true })
    }
  }
}

export async function dbConnect() {
  if (!MONGO_URL) {
    throw new Error("Please define the MONGO_URL environment variable")
  }
  const expectedDb = databaseNameFromUrl(MONGO_URL)
  if (cached!.conn && cached!.conn.connection.name !== expectedDb) {
    await cached!.conn.disconnect()
    cached!.conn = null
    cached!.promise = null
  }
  if (cached!.conn) {
    return cached!.conn
  }
  if (!cached!.promise) {
    cached!.promise = resolveMongoUrl(MONGO_URL)
      .then(({ uri, dbName }) =>
        mongoose.connect(uri, {
          bufferCommands: false,
          family: 4,
          dbName,
          serverSelectionTimeoutMS: 15000,
        })
      )
      .then(async (conn) => {
        await mergeFromTest(conn)
        if (process.env.NODE_ENV !== "production") {
          console.log(`MongoDB connected to database "${conn.connection.name}"`)
        }
        return conn
      })
      .catch((err) => {
        cached!.promise = null
        throw err
      })
  }
  cached!.conn = await cached!.promise
  return cached!.conn
}

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "owner", "admin"], default: "user" },
    isVerified: { type: Boolean, default: true },
    accountStatus: { type: String, enum: ["active", "suspended", "banned"], default: "active" },
    lastLogin: { type: Date, default: null },
    phone: { type: String, default: "" },
    location: { type: String, default: "" },
    avatar: { type: String, default: "" },
    bio: { type: String, default: "" },
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
      privacyLevel: { type: String, enum: ["public", "friends", "private"], default: "public" },
    },
  },
  { timestamps: true }
)

export const User = models.User || model("User", UserSchema)

const VenueSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    location: { type: String, required: true },
    sports: [{ type: String }],
    priceRange: {
      min: { type: Number, required: true, min: 0 },
      max: { type: Number, required: true, min: 0 },
    },
    courtCount: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    image: { type: String },
    images: { type: [String], default: [] },
    amenities: [{ type: String }],
    status: { type: String, enum: ["approved", "pending", "rejected", "suspended"], default: "pending" },
    owner: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
)

export const Venue = models.Venue || model("Venue", VenueSchema)

const CourtSchema = new Schema(
  {
    venue: { type: Schema.Types.ObjectId, ref: "Venue", required: true },
    name: { type: String, required: true },
    sport: { type: String, required: true },
    basePricePerHour: { type: Number, required: true, min: 0 },
    dayPrice: { type: Number, min: 0 },
    nightPrice: { type: Number, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const Court = models.Court || model("Court", CourtSchema)

const TimeSlotSchema = new Schema(
  {
    venue: { type: Schema.Types.ObjectId, ref: "Venue", required: true },
    court: { type: Schema.Types.ObjectId, ref: "Court", required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
)

TimeSlotSchema.index({ court: 1, date: 1, time: 1 }, { unique: true })

export const TimeSlot = models.TimeSlot || model("TimeSlot", TimeSlotSchema)

const BookingSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    venue: { type: Schema.Types.ObjectId, ref: "Venue", required: true },
    court: { type: Schema.Types.ObjectId, ref: "Court", required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    duration: { type: Number, default: 1, min: 1, max: 8 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["confirmed", "cancelled"], default: "confirmed" },
    customerName: { type: String },
    customerEmail: { type: String },
    venueName: { type: String },
    venueLocation: { type: String },
    courtName: { type: String },
    sport: { type: String },
    paymentStatus: { type: String, enum: ["pending", "completed", "failed", "refunded"], default: "completed" },
    paymentMethod: { type: String, default: "online" },
    notes: { type: String },
    refundAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

BookingSchema.index(
  { court: 1, date: 1, time: 1 },
  { unique: true, partialFilterExpression: { status: "confirmed" } }
)

export const Booking = models.Booking || model("Booking", BookingSchema)

const ReportSchema = new Schema(
  {
    type: { type: String, enum: ["venue", "user", "booking", "content"], required: true },
    reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reportedItem: {
      _id: { type: Schema.Types.ObjectId, required: true },
      name: { type: String, required: true },
      type: { type: String, required: true },
    },
    reason: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ["pending", "investigating", "resolved", "dismissed"], default: "pending" },
    priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    moderatorNotes: { type: String },
    action: { type: String, enum: ["warn", "suspend", "ban", "remove_content", "dismiss", "none"], default: "none" },
  },
  { timestamps: true }
)

export const Report = models.Report || model("Report", ReportSchema)

const AlertSchema = new Schema(
  {
    type: { type: String, enum: ["warning", "info", "success", "error"], required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    category: { type: String, enum: ["system", "security", "performance", "user"], default: "system" },
    priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date },
  },
  { timestamps: true }
)

export const Alert = models.Alert || model("Alert", AlertSchema)

