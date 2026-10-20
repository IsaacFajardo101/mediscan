import SheetPlaceholder from '@/components/SheetPlaceholder';

// "Filters" sheet for the Medicine Vault.
// Open it from the filter icon next to the search bar with:  router.push('/vault-filters')
// ang kulang/need ilagay pa here is yung actual filter options, like the medicine type chips (Tablet, Capsule, Syrup, Drops, Inhaler), 
// date range / urgency (7 days, 30 days, Expired, Custom range From/To), and Reset + Apply Filters buttons.
// TODO: implement the actual filter options and logic. The rest of the UI is already implemented.
export default function VaultFiltersScreen() {
  return <SheetPlaceholder title="Filters" />;
}