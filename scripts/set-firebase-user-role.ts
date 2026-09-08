// Example:
//   npx tsx scripts/set-firebase-user-role.ts <firebaseUid>
//   npx tsx scripts/set-firebase-user-role.ts <firebaseUid> admin
//   npm run firebase:set-user-role -- <firebaseUid> admin

import "dotenv/config";
import { getAdminAuth } from "@/lib/firebase/admin";

type Args = {
  uid: string;
  role: string;
};

function printUsageAndExit(code: number): never {
  const msg = [
    "Usage:",
    "  npx tsx scripts/set-firebase-user-role.ts <firebaseUid> [role]",
    "",
    "Examples:",
    "  npx tsx scripts/set-firebase-user-role.ts abc123",
    "  npx tsx scripts/set-firebase-user-role.ts abc123 admin",
    "",
    "Notes:",
    "  - Default role is admin when omitted.",
    "  - Existing custom claims are preserved and merged.",
  ].join("\n");

  if (code === 0) console.log(msg);
  else console.error(msg);
  process.exit(code);
}

function parseArgs(argv: string[]): Args {
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsageAndExit(0);
  }

  const uid = argv[0];
  const role = argv[1] ?? "admin";

  if (!uid) {
    console.error("Missing required <firebaseUid>.");
    printUsageAndExit(1);
  }

  return { uid, role };
}

async function main() {
  const { uid, role } = parseArgs(process.argv.slice(2));
  const adminAuth = getAdminAuth();

  if (!adminAuth) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID and credentials (GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY).",
    );
  }

  const user = await adminAuth.getUser(uid);
  const existingClaims = user.customClaims ?? {};
  const nextClaims = { ...existingClaims, role };

  await adminAuth.setCustomUserClaims(uid, nextClaims);

  console.log("[scripts/set-firebase-user-role] Updated custom claims", {
    uid,
    role,
    claims: nextClaims,
  });
  console.log(
    "[scripts/set-firebase-user-role] Ask the user to refresh/re-login so ID token picks up new claims.",
  );
}

main().catch((error) => {
  console.error("[scripts/set-firebase-user-role] Failed", { error });
  process.exit(1);
});
