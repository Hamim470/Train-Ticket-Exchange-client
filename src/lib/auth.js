import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db(process.env.DB_NAME || "Train_Ticket_Exchange");

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    client,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },

  user: {
    modelName: "users",
    additionalFields: {
      phone: {
        type: "string",
        required: true,
        input: true,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "buyer",
        input: false,
      },
      kycStatus: {
        type: "string",
        required: false,
        defaultValue: "unverified",
        input: false,
      },
      nidData: {
        type: "string",
        required: false,
        defaultValue: "",
        input: false,
      },
      walletBalance: {
        type: "number",
        required: false,
        defaultValue: 0,
        input: false,
      },
    },
  },
  session: {
    modelName: "session",
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
  ],
});