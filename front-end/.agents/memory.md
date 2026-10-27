# Progress log

Branch: `frontend-results`. Work on the Scan Result and Manual Entry screens.

## Tech stack
- Expo SDK 57, React Native 0.86.3, React 19.2.3, TypeScript 6, Expo Router (routes in `src/app/`), `expo-image`, Reanimated.
- Typecheck with `npx tsc --noEmit`. One old error in `src/components/app-tabs.web.tsx` (`/explore`, Expo template leftover): ignore it. `expo lint` can't run (`eslint` not installed).

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
  - `PossibleMatches`: heading, tappable match cards, warning note. Photo crops copied from Figma.
  - `ScanActions`: bottom bar, buttons depend on state. Redo Scan calls `router.replace('/camera')`.
- Mock data in `src/data/`:
  - `mockScanResults.ts`: `ScanResult` type, `mockScanResults` per state, `fromSearchResponse()` (0 medicines gives no_results, otherwise needs_verification).
  - `response_1_single.json`, `response_2_multiple.json` (10 medicines), `response_3_empty.json`: copies of the mock API responses. `response_1_single.json` is not used yet.
  - Similarity (80/75/70/60) and confidence (80) are mock values, since the API has none.
  - The verified state still uses the hardcoded Paracetamol sample (photo `assets/images/meds/decolgen.heic`).
- `(tabs)/camera.tsx`: after the mock scan, `router.push("/result")` (temporary, for checking). Both the capture button and gallery picks go there.

### Needs Verification: select a medicine, edit, save (Figma `1922:3828` and `1922:3935`)
- `result.tsx` keeps `selectedId`: only one possible match is selected at a time; tapping the selected one again deselects it. Nothing is selected at first.
- `PossibleMatchCard` (new, extracted from `PossibleMatches`): selected look (green background, 2px border, check badge).
- `ScanActions` for needs_verification: no selection shows hint + filled amber Redo Scan; with a selection shows Edit + Save to Vault side by side and an outlined amber Redo Scan.
- Edit opens `src/app/edit-medicine.tsx` (`/edit-medicine?id=...`, registered in `app/_layout.tsx` with `AppHeader back`, so the back arrow returns to Scan Result). It has the selected-medicine card, Medicine Name, Expiration Date (typed, auto-formatted), Medicine Form dropdown and Dosage / Strength, all auto-filled from the match except the date, plus a sticky Save to Vault bar. The Time of Intake, Brand Name, Manufacturer, Assigned To and Notes fields from the Figma frame are left out on purpose.
- Save to Vault (Scan Result needs_verification and verified, Edit Medicine, Manual Entry) now only opens the Medicine Added overlay (see Overlays); nothing is actually saved yet.
- New shared pieces: `components/FormField.tsx` (`FormField`, `InputBox`, `FormColors`), `utils/date.ts` (`formatDateInput`), `findPossibleMatch(id)` in `mockScanResults.ts`; `PossibleMatch` now has `form` and `strength`. `manual-entry.tsx` still has its own copies of these.
- New assets: check-selected, edit, save-white, scan-amber (`assets/images/result/`), chevron-down (`assets/images/edit-medicine/`).

### Overlays (Figma `1615:3933` Medicine Added, `1945:4040` Leave page?)
- `components/OverlayModal.tsx`: shared RN `Modal` with dim backdrop (`rgba(5,31,32,0.45)`), white 20px-radius card; tapping outside or Android back calls `onRequestClose`.
- `components/MedicineAddedModal.tsx` (`visible`, `medicineName`, `onViewVault`, `onClose`): shown by Save to Vault on Scan Result, Manual Entry and Edit Medicine. View in Vault closes it and does `router.navigate('/vault')`; Add Another and tapping outside only close it (user's choice, new vs. the Figma frame). Name shown: verified medicine, selected match, or the typed Medicine Name.
- `components/QuitEditingModal.tsx` (`visible`, `onConfirm`, `onCancel`): the Figma frame is named "Confirm – Delete Medicine" but it is only a "Leave page?" confirmation for quitting Edit Medicine. Yes goes back to Scan Result, Cancel and tapping outside close it.
- `edit-medicine.tsx` shows it by intercepting the navigation `beforeRemove` event (header back arrow, Android back, swipe back), keeps the blocked action in `pendingLeave` and re-dispatches it on Yes. `allowLeave` ref skips the prompt after Yes and after Save to Vault (already saved). `Parameters<typeof navigation.dispatch>[0]` types the action because `@react-navigation/native` is not directly importable.
- `components/CantReadModal.tsx` (Figma `1615:3972`, "We couldn't read the text"): Camera overlay for when no text is detected. **Built but NOT wired to Camera yet** (on purpose, for a future sprint). Props `visible`, `onClose`, `onUseDifferentPhoto`. Rescan and tapping outside only call `onClose`. Use a Different Photo closes it, then calls `onUseDifferentPhoto` (Camera should pass its gallery picker; on iOS it waits for the Modal's `onDismiss` so the picker doesn't clash with the closing animation). Enter Details Manually closes it and does `router.push('/manual-entry')`. `OverlayModal` got an optional `onDismiss` prop for this.
  - To wire it in `(tabs)/camera.tsx`: add `const [cantReadOpen, setCantReadOpen] = useState(false)`, render `<CantReadModal visible={cantReadOpen} onClose={() => setCantReadOpen(false)} onUseDifferentPhoto={<gallery pick function>} />`, and call `setCantReadOpen(true)` when the scan finds no text. Camera's gallery pick (`ImagePicker.launchImageLibraryAsync`, one photo, after the media-permission check) is what to pass as `onUseDifferentPhoto`.
- New assets in `assets/images/overlays/` (`check-added`, `warning-leave`, `unreadable-scan`, `scan-white`, `image`, `pencil`), registered in `Assets.icons` (`checkAdded`, `warningLeave`, `unreadableScan`, `scanWhiteSmall`, `image`, `pencil`). The soft red `#FDECEC` and grey text `#5B6B6C` are local constants, not tokens.

### Manual Entry: `src/app/manual-entry.tsx`
- Medicine Name search input, Expiration Date input (auto-formats `MM / DD / YYYY`), helper texts, "verified details" card with five read-only "Auto-filled" fields, Save to Vault and Cancel (`router.back()`).
- Header title in `app/_layout.tsx` is "Manual Entry" (`AppHeader back`).

### Assets
- `assets.ts` registers `meds.*` (decolgen, match1 to 4) and `icons.*` for both screens.
- SVGs in `assets/images/result/` and `assets/images/manual-entry/`, sample photos in `assets/images/meds/`.

## Git
- Committed (`514d4af`): the image files in `assets/images/manual-entry`, `meds`, `result` ("static images for simulation only. Delete them when necessary").
- Not committed yet: `camera.tsx`, `app/_layout.tsx`, `manual-entry.tsx`, `assets.ts`, `app/result.tsx`, the four components, `src/data/`.

## Open items / TODO
- Neither screen has been run and compared against the Figma frames yet.
- Wire the real flow: scan response to `fromSearchResponse()` to `/result` with the data; derive the verified state from a one-medicine response (`response_1_single.json` has no expiry/batch number, and its manufacturer/category fields look mis-mapped).
- Tapping a possible match (should open Manual Entry), View Medicine Details and actually saving to the vault (AsyncStorage) are TODOs. The overlays are not run/verified against Figma yet.
- Manual Entry: medicine search results and picking (read-only fields stay empty), a date picker (none installed), real save.
- The No Results frame reuses the hint "Tap the correct medicine above to edit or save it." from the design (probably a Figma leftover).
- The amber/red banners use a thin translucent border in place of Figma's inset shadow.
- Idea: a `__DEV__`-only state switcher on the Result screen, to flip between the three states in Expo Go.
- Consider promoting the off-token colors (amber `#E89C38`, red `#D93025`, banner greens, etc.) into `display.ts`.
