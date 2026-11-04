# Progress log

Branch: `frontend-results`. Work on the Scan Result and Manual Entry screens.

## Tech stack
- Expo SDK 58 (upgraded from 57; `npm install`, `npx expo install --check` and `npx expo-doctor` were clean), React Native 0.88.1, React 19.3.0 (as in `package.json` after the upgrade), TypeScript 6, Expo Router (routes in `src/app/`), `expo-image`, Reanimated.
- Typecheck with `npx tsc --noEmit`. `expo lint` can't run (`eslint` not installed).
- **Type errors to look into next time:** after the SDK 58 upgrade (2026-11-04), `tsc --noEmit` reported 43 errors in 21 files (the app still runs in Expo Go despite them). Fixed since: the `edit-medicine.tsx` ones (see Overlays: `usePreventRemove`), and the typed-route errors (`/add-note`, `/medicine/[id]`, `/explore`, `(tabs)/index`, `recent-scans`, etc.) no longer show up, probably because the generated route types were refreshed; not investigated. None of the screens built on this branch (Result, Possible Matches, Edit Medicine, Manual Entry, overlays) has type errors. **Still open (about 26 error lines, none in this branch's screens):**
  - View refs (`useRef` on a `View` is typed as a function component, so `measureInWindow` fails): `AddMenu`, `AddTabButton`, `CardMenu`, `MedicineCard`, `app-tabs.web`.
  - `useColorScheme()` can be `null` and is never `'unspecified'`: `use-theme.ts`, `app-tabs.tsx`, `app-tabs.web.tsx`.
  - `StyleSheet.absoluteFillObject` removed (`HealthInfo.tsx:187`; use `absoluteFill`).
  - `NodeJS.Timeout` unavailable (`ProfileContext.tsx:26-27`; use `ReturnType<typeof setTimeout>`).
  - Call/argument mismatches: `add-edit-profile.tsx:88`, `profile-detail.tsx:67` (TS2769), `verify-code.tsx:89,99`. Not read yet.
  - Planned approach: fix in that order, no `any`/`@ts-ignore`, re-run `tsc` after each group. Not started.
- **SDK 58 notes (from the docs):** `beforeRemove` and `__unsafe_action__` navigation events were removed (use `usePreventRemove`, `removed`, `removePrevented`); `useNavigation` throws outside a navigator; `navigation.dispatch` is queued; iOS 26 headers are transparent by default (`enableLegacyHeaderAppearance()` is deprecated). Migration page: https://docs.expo.dev/router/migrate/sdk-57-to-58.md
- Expo Go "Failed to download remote update" was a network/bundling issue when first running SDK 58; the app runs now.

## Conventions the user asked for
- Use design tokens from `src/constants/display.ts` (`Colors`, `Type`, `Spacing`, `Radius`) and `src/constants/assets.ts` (`Assets`). Do **not** use `src/constants/theme.ts` (Expo template leftover).
- Reuse `AppHeader.tsx` for headers (`back` gives the back arrow and centered title).
- Colors from Figma that are not in `display.ts` stay as local constants in the file that uses them.
- Figma workflow: load `figma:figma-design-to-code`, call `get_design_context`, download SVGs/PNGs with `curl -L`, no temporary Figma URLs in code.
- Figma working copy: `NWTHwh0KIfKzUNNkOlk15k` (IS-MediScan Copy). Nodes: verified `1373:5512`, needs verification `1922:3731`, no results `1945:3925`, manual entry `2307:4071`.

## Done

### Scan Result: `src/app/result.tsx`
- Lives in `app/` (root Stack, like `manual-entry`), registered in `app/_layout.tsx` with `AppHeader title="Scan Result" back`.
- Three states, chosen with the route param `/result?state=verified | needs_verification | no_results` (default `verified`).
- Components in `src/components/`:
  - `VerificationBanner`: `status` prop (verified / needs_verification / no_results).
  - `MedicineInfoCard`: `rows` of icon, label, value.
  - `PossibleMatches`: heading, tappable match cards, warning note. The cards show a `MedicineIcon` (not photos) since the medicine photos were dropped.
  - `ScanActions`: bottom bar, buttons depend on state. Redo Scan calls `router.replace('/camera')`. `View Medicine Details` (verified) calls `onViewDetails`, wired in `result.tsx` (see below).
- Mock data in `src/data/`:
  - `mockScanResults.ts`: `ScanResult` type, `mockScanResults` per state, `fromSearchResponse()` (0 medicines gives no_results, otherwise needs_verification).
  - `response_1_single.json`, `response_2_multiple.json` (10 medicines), `response_3_empty.json`: copies of the mock API responses. `response_1_single.json` is not used yet.
  - Similarity (80/75/70/60, one per shown match, max 4 matches) is a mock value, since the API has none.
  - The verified state shows a `MedicineIcon` (size 96, `components/medicine/MedicineIcon.tsx`, picks the icon from the dosage form with `getMedicineForm()` in `utils/medicine.ts`) instead of a photo. The verified `medicine` is `{ name, category, form }`; `form` is the raw dosage form string.
  - **The verified mock is "Heparin Leo 5,000 IU/mL"** (FDA reg. BR-1005, first entry of `response_2_multiple.json`), temporarily, so it matches the Medicine Details screen. Confidence 96 (the vault mock's value). `VERIFIED_VAULT_ID = 'mock-0f3b194307307840'` (exported from `mockScanResults.ts`) is its id in the mock vault (`src/mock/index.ts` builds ids as `mock-<fda_approval_id>`).
  - `View Medicine Details` does `router.push({ pathname: '/medicine/[id]', params: { id: VERIFIED_VAULT_ID } })`. That route (`src/app/medicine/[id].tsx`, uses `useVaultMedicine` from `services/vaultStore`) renders `components/medicine/MedicineDetails.tsx` in `mode="saved"`. If the medicine was deleted from the vault it shows "no longer in your vault" (resetting the vault to the mock brings it back).
  - The Expiry Date row on the verified card is read from the vault entry (`vault_expiry_date`, the mock vault sets it relative to the day it was created), with the old sample date as a fallback. Manufacturer / Medicine Type / Strength rows use the values the Details screen shows (the mock's manufacturer field holds a category: mis-mapped data). Batch Number stays a sample value (no such field in the data).
  - Later, when real scan data is wired: `MedicineDetails` also has `mode="preview"` (Add Note + Save to Vault, really calls `addMedicine`), meant for Scan Results. It needs a route that builds a full `NewMedicine`.
- `(tabs)/camera.tsx`: after the mock scan, `router.push("/result")` (temporary, for checking). Both the capture button and gallery picks go there.

### Needs Verification: select a medicine, edit, save (Figma `1922:3828` and `1922:3935`)
- `result.tsx` keeps `selectedId`: only one possible match is selected at a time; tapping the selected one again deselects it. Nothing is selected at first.
- `PossibleMatchCard` (new, extracted from `PossibleMatches`): selected look (green background, 2px border, check badge). Shows `<MedicineIcon form={getMedicineForm(match.form)} size={96} />` instead of a photo (the icon is 96 tall, so cards are about 16px taller than the Figma frame). `PossibleMatch` no longer has `image`; `MatchImage`, `MOCK_IMAGES`, the crop data and `Assets.meds.match1..4` were removed. This card is also the selected-medicine card on Edit Medicine.
- `ScanActions` for needs_verification: no selection shows hint, filled amber Redo Scan, and below it an outlined full-width Save to Vault (border, text and icon in `Colors.actionPrimary`; the icon is `saveWhite` tinted with `tintColor`, check it shows in Expo Go). With a selection: a full-width Edit button above the outlined amber Redo Scan. Save to Vault is **not** shown after selecting (the way to save a chosen match is Edit, then Save to Vault there). With no selection, Save to Vault opens the Medicine Added overlay with no medicine name (saving is still a TODO); the hint "Tap the correct medicine above to edit or save it." may no longer fit.
- Edit opens `src/app/edit-medicine.tsx` (`/edit-medicine?id=...`, registered in `app/_layout.tsx` with `AppHeader back`, so the back arrow returns to Scan Result). It has the selected-medicine card, Medicine Name, Expiration Date (typed, auto-formatted), plus a sticky Save to Vault bar. Medicine Name is auto-filled from the match. The Medicine Form dropdown and Dosage / Strength fields were removed on purpose (user's decision; `PossibleMatch.form` and `.strength` stay in the data, `form` drives the card icon). The Time of Intake, Brand Name, Manufacturer, Assigned To and Notes fields from the Figma frame are left out on purpose too.
- Save to Vault (Scan Result needs_verification and verified, Edit Medicine, Manual Entry) now only opens the Medicine Added overlay (see Overlays); nothing is actually saved yet.
- New shared pieces: `components/FormField.tsx` (`FormField`, `InputBox`, `FormColors`), `utils/date.ts` (`formatDateInput`), `findPossibleMatch(id)` in `mockScanResults.ts`; `PossibleMatch` now has `form` and `strength`. `manual-entry.tsx` still has its own copies of these.
- New assets: check-selected, edit, save-white, scan-amber (`assets/images/result/`), chevron-down (`assets/images/edit-medicine/`).

### Overlays (Figma `1615:3933` Medicine Added, `1945:4040` Leave page?)
- `components/OverlayModal.tsx`: shared RN `Modal` with dim backdrop (`rgba(5,31,32,0.45)`), white 20px-radius card; tapping outside or Android back calls `onRequestClose`.
- `components/MedicineAddedModal.tsx` (`visible`, `medicineName`, `onViewVault`, `onClose`): shown by Save to Vault on Scan Result, Manual Entry and Edit Medicine. View in Vault closes it and does `router.navigate('/vault')`; tapping outside only closes it (user's choice, new vs. the Figma frame). Add Another defaults to closing it and `router.navigate('/camera')` (done inside the modal; Scan Result and Edit Medicine use that). Manual Entry passes the optional `onAddAnother` prop instead: it closes the overlay and clears the Medicine Name and Expiration Date fields, and stays on the screen. Name shown: verified medicine, selected match, or the typed Medicine Name.
- `components/QuitEditingModal.tsx` (`visible`, `onConfirm`, `onCancel`): the Figma frame is named "Confirm – Delete Medicine" but it is only a "Leave page?" confirmation for quitting Edit Medicine. Yes goes back to Scan Result, Cancel and tapping outside close it.
- `edit-medicine.tsx` shows it with `usePreventRemove(preventLeave, ({ repeat }) => ...)` from `expo-router` (header back arrow, Android back, swipe back). The blocked navigation's `repeat` is kept in the `repeatLeave` ref; Yes sets `preventLeave` to false, closes the modal and calls `repeat()`; Save to Vault also sets `preventLeave` to false (already saved). **History:** it used the `beforeRemove` event until SDK 58 removed it, which made the modal silently stop appearing (and caused 4 type errors); fixed in commit `d03503e`. Not yet confirmed on a device (header arrow, Android back, swipe back, and no prompt after Save).
- `components/CantReadModal.tsx` (Figma `1615:3972`, "We couldn't read the text"): Camera overlay for when no text is detected. **Built but NOT wired to Camera yet** (on purpose, for a future sprint). Props `visible`, `onClose`, `onUseDifferentPhoto`. Rescan and tapping outside only call `onClose`. Use a Different Photo closes it, then calls `onUseDifferentPhoto` (Camera should pass its gallery picker; on iOS it waits for the Modal's `onDismiss` so the picker doesn't clash with the closing animation). Enter Details Manually closes it and does `router.push('/manual-entry')`. `OverlayModal` got an optional `onDismiss` prop for this.
  - To wire it in `(tabs)/camera.tsx`: add `const [cantReadOpen, setCantReadOpen] = useState(false)`, render `<CantReadModal visible={cantReadOpen} onClose={() => setCantReadOpen(false)} onUseDifferentPhoto={<gallery pick function>} />`, and call `setCantReadOpen(true)` when the scan finds no text. Camera's gallery pick (`ImagePicker.launchImageLibraryAsync`, one photo, after the media-permission check) is what to pass as `onUseDifferentPhoto`.
- New assets in `assets/images/overlays/` (`check-added`, `warning-leave`, `unreadable-scan`, `scan-white`, `image`, `pencil`), registered in `Assets.icons` (`checkAdded`, `warningLeave`, `unreadableScan`, `scanWhiteSmall`, `image`, `pencil`). The soft red `#FDECEC` and grey text `#5B6B6C` are local constants, not tokens.

### Manual Entry: `src/app/manual-entry.tsx`
- Medicine Name search input, Expiration Date input (auto-formats `MM / DD / YYYY`), helper texts, "verified details" card with five read-only "Auto-filled" fields, Save to Vault and Cancel (`router.back()`).
- Header title in `app/_layout.tsx` is "Manual Entry" (`AppHeader back`).

### Assets
- `assets.ts` registers `meds.decolgen` (now unused, the verified state uses an icon) and `icons.*` for both screens. `meds.match1..4` were removed (their PNGs are still in `assets/images/meds/`). `icons.chevronDown` is unused since the Medicine Form dropdown was removed.
- SVGs in `assets/images/result/` and `assets/images/manual-entry/`, sample photos in `assets/images/meds/`.
- `src/constants/medicineIcons.ts` (`MEDICINE_ICONS`) requires `assets/medicines/{tablet,capsule,syrup,drops}.png`, which do not exist, and nothing imports it. Left alone on purpose; importing it would break the bundle. `MedicineIcon` (vector icons) is used instead.

## Git
- Committed so far on `frontend-results` (newest first): Add Another routing (`9549feb`), Heparin Leo verified mock (`a7ba416`), View Medicine Details wiring (`c243869`), Medicine Form / Dosage fields removed (`6a128c6`), `usePreventRemove` fix (`d03503e`), Save to Vault in Needs Verification (`b19ed83`), icons instead of mock photos (`9df18bb`), SDK 58 upgrade (`9f4c403`).
- `514d4af` committed the image files in `assets/images/manual-entry`, `meds`, `result` ("static images for simulation only. Delete them when necessary").

## Open items / TODO
- The built screens on `frontend-results` have been run in Expo Go and compared against the Figma frames: they match so far (checked by the user, ongoing).
- Wire the real flow: scan response to `fromSearchResponse()` to `/result` with the data; derive the verified state from a one-medicine response (`response_1_single.json` has no expiry/batch number, and its manufacturer/category fields look mis-mapped).
- Tapping a possible match (should open Manual Entry) and actually saving to the vault (AsyncStorage) are TODOs. View Medicine Details is wired, but only to the mock vault's Heparin Leo (see above). The overlays are not run/verified against Figma yet.
- Check on a device: Medicine Type row ("Solution For Injection (IV/SC)") may wrap in the info card; the 96px icons make Possible Match cards taller than Figma; the tinted Save icon colour; Add Another behaviour on each screen.
- Manual Entry: medicine search results and picking (read-only fields stay empty), a date picker (none installed), real save.
- The No Results frame reuses the hint "Tap the correct medicine above to edit or save it." from the design (probably a Figma leftover).
- The amber/red banners use a thin translucent border in place of Figma's inset shadow.
- Idea: a `__DEV__`-only state switcher on the Result screen, to flip between the three states in Expo Go.
- Consider promoting the off-token colors (amber `#E89C38`, red `#D93025`, banner greens, etc.) into `display.ts`.
