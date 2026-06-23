import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/gif"];
const ALLOWED_BILL = [...ALLOWED_IMAGE, "application/pdf"];

export async function saveUpload(
  file: File,
  subdir: string,
  allowed: string[] = ALLOWED_IMAGE
) {
  if (!allowed.includes(file.type)) {
    throw new Error(`File type ${file.type} not allowed.`);
  }
  const maxBytes = 4 * 1024 * 1024;
  if (file.size > maxBytes) throw new Error("File exceeds 4MB limit.");

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, name), buffer);
  return `/uploads/${subdir}/${name}`;
}

export { ALLOWED_IMAGE, ALLOWED_BILL };
