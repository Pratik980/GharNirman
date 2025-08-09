import admin from "firebase-admin";
import fs from "fs";
import path from "path";

const serviceAccountPath = path.resolve(
  "firebase/gharnirman-3a8a4-firebase-adminsdk-fbsvc-4f98de3d5b.json"
);

let serviceAccount;

try {
  const fileData = fs.readFileSync(serviceAccountPath, "utf8");
  serviceAccount = JSON.parse(fileData);
} catch (error) {
  console.error("Error reading or parsing service account file:", error);
  process.exit(1); // Exit the process if the file can't be read
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
