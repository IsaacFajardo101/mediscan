# Progress log

Work done since implementing the Scan Result screen. Branch: `frontend-results`.

## Tech stack (confirmed)
- Expo SDK 57 (`expo ~57.0.26`), React Native 0.86.3, React 19.2.3, TypeScript 6.
- Expo Router (file-based, routes in `src/app/`), Reanimated 4.5.1, `expo-image`, `react-native-svg`.
- Run the app from `front-end/` (`npx expo start`). Running it from the repo root makes `npx` offer to download `expo@58.0.19`. Answer **n** and `cd front-end`.
- `expo lint` can't run: `eslint` isn't installed.
- `npx tsc --noEmit` has one old error in `src/components/app-tabs.web.tsx` (`/explore` route, Expo template leftover). Ignore it.

## Figma
- MCP account: `Gerfus`. No edit access to the original file (`aEsugaihERN9TCjJDdHd82`), so reads fail there.
- Working copy: `NWTHwh0KIfKzUNNkOlk15k` (IS-MediScan (Copy)), readable. Session ID is created with `create_session`.
- Screens implemented so far:
  - Scan Result: node `1373:5512`
  - Manual Entry: node `2307:4071`
- Workflow: load `figma:figma-design-to-code`, then `get_design_context` (pass `skillNames`), download SVGs with `curl -L`, no temporary Figma URLs in code.

## Conventions the user asked for
- Use design tokens from `src/constants/display.ts` (`Colors`, `Type`, `Spacing`, `Radius`) and `src/constants/assets.ts` (`Assets`).
- Do **not** use `src/constants/theme.ts` (Expo template leftover).
- Reuse `AppHeader.tsx` for headers (`back` prop gives back arrow + centered title).
- For Manual Entry, use tokens only where they match; otherwise literal Figma values.
- Colors not in `display.ts` are kept as named constants at the top of each screen file.

## Done

### Scan Result: `src/app/result.tsx`
- Moved from `(tabs)/` to `app/` (root Stack, like `manual-entry` and `notifications`): it's a flow screen with its own bottom bar, so no hidden-tab workaround is needed. Route is still `/result`.
- Verified banner, Paracetamol label (sample image `assets/images/meds/decolgen.heic`), five-row info card, fixed bottom buttons.
- Data is a hardcoded `sample` object.
- `AppHeader` reused as-is (title 22px vs 28px in Figma, border vs shadow: left alone).
- `app/_layout.tsx`: registered `result` as a Stack screen with `AppHeader title="Scan Result" back`. (The earlier hidden-tab entry in `(tabs)/_layout.tsx` was removed.)
- SVGs downloaded to `assets/images/result/`: verified, manufacturer, expiry-date, batch-number, medicine-type, strength, details, save.
- Open: "View Medicine Details" and "Save to Vault" are TODO no-ops. Nothing links to `/result` yet.
- Off-token colors: banner `#C5FFC8`, confidence badge `#78D07D`, gray text `#7E7B77`, `#938B8B`.

### Manual Entry: `src/app/manual-entry.tsx`
- Medicine Name search input, Expiration Date input (auto-formats `MM / DD / YYYY`), helper texts, "verified details" card with five read-only "Auto-filled" fields, Save to Vault and Cancel.
- Cancel calls `router.back()`. Screen scrolls with keyboard handling.
- `src/app/_layout.tsx`: manual-entry header title changed from "Add Medicine" to "Manual Entry" (uses `AppHeader back`).
- SVGs downloaded to `assets/images/manual-entry/`: search, calendar, lock, lock-small, bookmark.
- Icons are centered at each SVG's own root size inside the Figma icon slot.
- Open: medicine search has no results list or picking, so the read-only fields stay empty (the `selected` object is a TODO). The calendar icon has no date picker (none installed). "Save to Vault" is a TODO.
- Off-token colors: input border `#C9D6CF`, read-only bg `#F1F5F3` / border `#E1E8E4`, placeholder `#9AAFA3`, helper `#5B6B6C`, required star `#D93025`.

### `src/constants/assets.ts`
- Added `meds.decolgen` and `icons.*` for both screens (verified, manufacturer, expiryDate, batchNumber, medicineType, strength, details, save, search, calendar, lock, lockSmall, bookmark).

### Scan Result states (verified / needs_verification / no_results)
- Figma nodes: needs verification `1922:3731`, no results `1945:3925` (verified is `1373:5512`).
- `src/app/result.tsx` picks the state from the route param: `/result?state=verified | needs_verification | no_results` (default `verified`). The camera still pushes plain `/result` (temporary, for checking).
- `src/data/mockScanResults.ts`: `ScanResult` union type, `mockScanResults` per state, and `fromSearchResponse()` that turns an API search response (0 or many medicines) into a result. Similarity (80/75/70/60), confidence (80) and the photos are mock values because the API has none.
- `src/data/response_2_multiple.json` (10 medicines) and `response_3_empty.json` (`data: []`) are copies of the Drive mock responses. The verified state still uses the hardcoded Paracetamol sample (not `response_1_single.json`).
- Components in `src/components/`: `VerificationBanner` (now has a `status` prop), `MedicineInfoCard`, `PossibleMatches` (list + warning note, photo crops copied from Figma), `ScanActions` (bottom bar, buttons depend on state).
- Redo Scan calls `router.replace('/camera')`. Tapping a possible match, View Medicine Details and Save to Vault are TODOs.
- Assets: warning-amber/red, scan-white/red SVGs in `assets/images/result/`; `match-1..4.png` in `assets/images/meds/`.
- Off-token colors (amber `#E89C38`, red `#D93025`, etc.) are kept as local constants in each component, as requested.
- The "No Results" frame reuses the hint text "Tap the correct medicine above to edit or save it." from the design (probably a leftover in Figma).

## Not verified yet
- Neither screen has been run on a device, simulator or web, so there's no visual comparison against the Figma screenshots yet.
- `.heic` and `.svg` load through Metro and `expo-image`; Metro asset extensions are confirmed, but runtime rendering is untested.

## Next steps / ideas
- Run both screens and compare with the Figma frames (web: `/result` and `/manual-entry`, device frame about 402x874).
- Wire the camera / manual-entry flow to `router.push('/result')`.
- Implement medicine search and picking, a date picker, and Save to Vault.
- Consider promoting the off-token colors into `display.ts`.
