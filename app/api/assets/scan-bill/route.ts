import { ok, error, authorize } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { saveUpload, ALLOWED_BILL } from "@/lib/uploads";
import { prisma } from "@/lib/prisma";

type LineItem = {
  itemType: "asset" | "expense";
  description?: string;
  assetTagId?: string;
  purchaseDate?: string;
  purchasedFrom?: string;
  cost?: number;
  brand?: string;
  model?: string;
  serialNo?: string;
  vendor?: string;
  amount?: number;
};

async function extractWithOpenAI(imageBase64: string, mimeType: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You extract line items from construction purchase bills/receipts for an Indian company.
Return JSON: { "vendor": string, "purchaseDate": "YYYY-MM-DD"|null, "lineItems": [{ "itemType": "asset"|"expense", "description", "assetTagId", "purchaseDate", "purchasedFrom", "cost", "brand", "model", "serialNo", "vendor", "amount" }] }
Classify durable equipment/tools/machinery as "asset". Classify consumables, fuel, cement bags, small supplies as "expense".
If multiple line items exist, return one object per line. Use INR amounts as numbers without currency symbol.`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
            { type: "text", text: "Extract all line items from this bill." },
          ],
        },
      ],
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error: ${err.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  const content = json.choices[0]?.message?.content;
  if (!content) throw new Error("No extraction result.");
  return JSON.parse(content) as {
    vendor?: string;
    purchaseDate?: string;
    lineItems: LineItem[];
  };
}

export async function POST(req: Request) {
  const { user, response } = await authorize([ROLES.SITE_MANAGER]);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const form = await req.formData().catch(() => null);
  if (!form) return error("Invalid upload.");

  const file = form.get("file");
  const jobSiteId = String(form.get("jobSiteId") || "");
  if (!(file instanceof File)) return error("No file provided.");
  if (!jobSiteId) return error("Job site is required.");

  let billUrl: string;
  try {
    billUrl = await saveUpload(file, "bills", ALLOWED_BILL);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Upload failed.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mimeType = file.type || "image/jpeg";

  let extracted: Awaited<ReturnType<typeof extractWithOpenAI>>;
  try {
    extracted = await extractWithOpenAI(base64, mimeType);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Bill scan failed.");
  }

  const assetDrafts: Record<string, unknown>[] = [];
  const expenseIds: string[] = [];

  for (const line of extracted.lineItems || []) {
    if (line.itemType === "expense") {
      const exp = await prisma.expenseRecord.create({
        data: {
          companyId: user.companyId,
          jobSiteId,
          description: line.description || "Consumable / expense",
          amount: line.amount ?? line.cost ?? 0,
          vendor: line.vendor || extracted.vendor || null,
          purchaseDate: line.purchaseDate
            ? new Date(line.purchaseDate)
            : extracted.purchaseDate
              ? new Date(extracted.purchaseDate)
              : null,
          sourceBillUrl: billUrl,
          lineItemRaw: JSON.stringify(line),
          createdById: user.id,
        },
      });
      expenseIds.push(exp.id);
    } else {
      assetDrafts.push({
        description: line.description || "",
        assetTagId: line.assetTagId || "",
        purchaseDate: line.purchaseDate || extracted.purchaseDate || "",
        purchasedFrom: line.purchasedFrom || extracted.vendor || "",
        cost: line.cost ?? line.amount ?? 0,
        brand: line.brand || "",
        model: line.model || "",
        serialNo: line.serialNo || "",
        sourceBillUrl: billUrl,
        jobSiteId,
      });
    }
  }

  return ok({
    billUrl,
    assetDrafts,
    expenseIds,
    message:
      assetDrafts.length > 0
        ? `${assetDrafts.length} asset draft(s) ready for review. ${expenseIds.length} expense line(s) logged.`
        : `${expenseIds.length} expense line(s) logged. No durable assets detected.`,
  });
}
