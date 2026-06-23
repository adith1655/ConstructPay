# ConstructPay — Role Hierarchy & Auth Spec (Asset Tiger-style ref)

## 1. Asset Tiger ref pattern (why mention it)
Asset Tiger = cloud asset tracker. Relevant pattern reuse for ConstructPay:
- Unlimited users, each own access level (viewer → full admin) — RBAC tiered, not flat.
- Multi-site asset/location tracking — maps to ConstructPay multi-site crews.
- Check-in/check-out audit log — maps to clock-in/out + audit trail already in ConstructPay features.
- Custom fields + reports per role — admins configure, lower roles consume.

Takeaway: copy the **tiered-permission + multi-site** model, not the asset-specific stuff (no barcode/depreciation needed here).

## 2. ConstructPay current hierarchy (from demo login page)
```
Platform Owner
   └── Company Admin   (per subscription)
          └── Site Manager
                 └── Worker
```
Demo accounts found on /login: Platform Owner, Company Admin, Site Manager, Worker — pw `Password123!` shared across all demo accounts.

## 3. Requested changes

### 3.1 Google login — staged rollout, not blanket
| Role | Google login? | Condition |
|---|---|---|
| Super Admin (you) | ✅ Yes | Tied to your personal Google account, always-on |
| Company Admin | ✅ Yes (2 seats/subscription) | Only AFTER Platform/Super Admin approves the company |
| Site Manager | ✅ Yes | Added by approved Company Admin |
| Worker | ✅ Yes | Added by Site Manager |

Flow:
1. Company requests access (existing "Request Access" gate stays — self-signup remains disabled per current site copy).
2. Super Admin approves company → system provisions **2 Company Admin seats**.
3. Company Admin logs in via Google → can add multiple Site Managers.
4. Each Site Manager logs in via Google → can add Workers.
5. Worker logs in via Google.

### 3.2 Remove demo accounts
Delete all 4 demo accounts (Platform Owner, Company Admin, Site Manager, Worker) + their `Password123!` credential path entirely from `/login` page and DB seed.

### 3.3 Super Admin exception
Only the **main Super Admin account** keeps Google OAuth wired to your specific Google account from day one — not gated behind any approval step (you're the approver).

## 4. Seat logic
- 1 subscription = 1 company = max **2 Company Admin** seats.
- Company Admin → unlimited Site Managers.
- Site Manager → unlimited Workers.

## 5. Implementation notes (for whoever builds this)
- Add `google_oauth_enabled` flag per role tier, default `false` except `super_admin`.
- Flag flips `true` for `company_admin` only on `company.status == approved`.
- Cascade: `site_manager.google_oauth_enabled = true` whenever parent `company_admin` is approved; same cascade for `worker` under approved `site_manager`.
- Drop demo seed script / demo login buttons from `/login` route.
- Enforce seat cap (2) at `company_admin` invite endpoint — reject 3rd invite with clear error.

## 6. Open questions to confirm before build
- Google Workspace domain restriction needed per company, or any Gmail allowed?
- ~~What happens to existing email/password logins once Google is added — coexist or fully replace?~~ **Confirmed: "Verify through Google" option to be added** — Google sign-in is an added verification path alongside existing login, not a replacement.
- ~~Does removing demo accounts also mean removing the "Demo accounts · password" line of login UI copy?~~ **Confirmed: yes** — remove that line entirely from `/login`.

## 7. Asset Inventory module (this is the Asset Tiger-style core, not just a ref pattern)

### 7.1 Ownership
**Site Manager** is the operating role for this module — full CRUD on assets at their site(s). **Company Admin**: view-only across all sites under their company; any edit needs go through a request routed to Site Manager, who makes the actual change. **Worker**: view-only (e.g. "what's assigned to me"), no edit rights.

### 7.2 Asset record — DB-backed, editable fields
Based on Asset Tiger's "Add an Asset" form (ref screenshots), field set to replicate:

**Asset Details**
- Description *(required)*
- Asset Tag ID *(required, unique — system-generated or manual override)*
- Purchase Date (date picker)
- Purchased from
- Cost (₹ — India Rupee prefix, matches ConstructPay's existing ₹ job-costing feature)
- Brand *(required)*
- Model *(required)*
- Serial No *(required)*

**Site, Location, Category and Department** — all dropdowns, each with an inline "+ New" to add an option on the fly:
- Site (dropdown, e.g. company/project name — ties to ConstructPay's existing multi-site structure)
- Location (dropdown, sub-location within the site, e.g. "PIA / PTA Plant")
- Category (dropdown, e.g. "Hand Tools")
- Department (dropdown)

**Asset Photo**
- File upload, JPG/GIF/PNG only

CRUD:
- **Add** new asset (manual form as above, or auto-filled via bill scan — see 7.4)
- **Edit** any field above
- **Delete / retire** (soft delete — keep audit trail, don't hard-remove row)
- All changes logged with timestamp + editor identity (who changed what, when) — audit trail, consistent with ConstructPay's existing "full audit trail" compliance feature.
- Dropdown fields (Site, Location, Category, Department) backed by lookup tables per company, editable/extendable by Site Manager via "+ New" inline add — avoids free-text drift in the asset DB.

### 7.3 Alerts
Configurable, site-scoped, surfaced to Site Manager (and optionally escalated to Company Admin):
- Maintenance due / overdue
- Warranty or contract expiring
- Asset idle too long at a location (stale inventory flag)
- Low-value-threshold or missing-data flags (e.g. asset added without location)
Delivery: in-app notification at minimum; email optional (matches existing alert pattern from Asset Tiger ref in §1).

### 7.4 AI bill scanning → OCR-filled asset form (editable by Site Manager)
Flow:
1. Site Manager uploads/scans a bill or receipt (photo or PDF) from their device — entry point is the same **"Add an Asset"** form shown above, with a "Scan Bill" option above the Asset Details block.
2. Backend sends the image/PDF to an OCR + AI extraction step (vision-capable LLM call) to pull out: Description, Asset Tag ID (if printed on bill), Purchase Date, Purchased from, Cost, Brand, Model, Serial No.
3. Extraction results **auto-fill the Add an Asset form fields** shown in 7.2 — the form opens pre-populated rather than blank.
4. Dropdowns (Site, Location, Category, Department) are **not** OCR-guessed by default — Site Manager selects from existing dropdown list or adds via "+ New" inline (matches the reference UI exactly).
5. Site Manager reviews every pre-filled field, **edits/corrects as needed** (OCR can misread serial numbers, prices, etc.), fills any field OCR couldn't extract, then clicks **Submit**.
6. On submit, record is written to the asset DB exactly like a manual entry. Original bill image stored and linked to the asset record it generated (audit trail: asset → source bill).
7. Multi-item bills: if OCR detects multiple line items on one bill, generate one pre-filled draft form per item, queued for the Site Manager to review one at a time (not auto-submitted in bulk).

Important: OCR/AI output is **pre-fill, not auto-commit** — Site Manager always confirms via Submit before anything hits the live inventory. Same safeguard as before, now mapped onto the real form fields instead of a generic "draft" concept.

## 8. Asset Inventory module — decisions (was open questions)
- ~~Does Worker get any visibility into assets?~~ **Confirmed: view-only.** Worker can see assets (e.g. "what's assigned to me") but cannot edit. Module is mainly managed by Site Manager.
- ~~Should Company Admin be able to edit assets directly?~~ **Confirmed: strictly view-only.** Edit requests from Company Admin are routed to Site Manager, who makes the actual change.
- ~~Bill scanning: handle multi-item bills (one bill → many assets)?~~ **Resolved in §7.4 step 7** — one pre-filled draft form per line item, reviewed one at a time.
- ~~Where do non-asset-worthy bill line items go (e.g. consumables, fuel)?~~ **Confirmed: logged elsewhere as expenses**, not written into the asset inventory. Needs its own expense record/table, separate from the asset DB — line items the AI extraction step classifies as consumables/non-durable get routed there instead of into 7.2's asset form.
