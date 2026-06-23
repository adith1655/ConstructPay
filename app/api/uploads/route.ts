import { ok, error, authorize } from "@/lib/api";
import { saveUpload, ALLOWED_IMAGE, ALLOWED_BILL } from "@/lib/uploads";
import { MANAGER_ROLES, ROLES } from "@/lib/constants";

export async function POST(req: Request) {
  const { user, response } = await authorize([...MANAGER_ROLES, ROLES.WORKER]);
  if (!user) return response;

  const form = await req.formData().catch(() => null);
  if (!form) return error("Invalid upload.");

  const file = form.get("file");
  const kind = String(form.get("kind") || "photo");
  if (!(file instanceof File)) return error("No file provided.");

  const allowed = kind === "bill" ? ALLOWED_BILL : ALLOWED_IMAGE;
  const subdir = kind === "bill" ? "bills" : "assets";

  try {
    const url = await saveUpload(file, subdir, allowed);
    return ok({ url });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Upload failed.");
  }
}
