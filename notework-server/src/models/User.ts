import { Schema, model, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

export interface IGoogleCalendarIntegration {
  connected: boolean;
  accessToken?: string; // encrypted
  refreshToken?: string; // encrypted
  tokenExpiry?: Date;
  connectedAt?: Date;
  googleEmail?: string; // which Google account is connected, shown in Settings UI
  syncToken?: string;
}

export interface ICalendarIntegrations {
  google?: IGoogleCalendarIntegration;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  avatar: string;
  avatarPublicId: string;
  avatarType: "upload" | "url" | "generated";
  role: "user" | "admin";
  isActive: boolean;
  calendarIntegrations?: ICalendarIntegrations;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const GoogleCalendarSchema = new Schema<IGoogleCalendarIntegration>(
  {
    connected: { type: Boolean, default: false },
    accessToken: { type: String },
    refreshToken: { type: String },
    tokenExpiry: { type: Date },
    connectedAt: { type: Date },
    googleEmail: { type: String },
    syncToken: { type: String },
  },
  { _id: false },
);

const CalendarIntegrationsSchema = new Schema<ICalendarIntegrations>(
  {
    google: { type: GoogleCalendarSchema, default: undefined },
  },
  { _id: false },
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    avatar: { type: String, default: "" },
    avatarPublicId: { type: String, default: "" },
    avatarType: {
      type: String,
      enum: ["upload", "url", "generated"],
      default: "generated",
    },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true },
    calendarIntegrations: {
      type: CalendarIntegrationsSchema,
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err: unknown) {
    next(err as Error);
  }
});

UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = model<IUser>("User", UserSchema);
