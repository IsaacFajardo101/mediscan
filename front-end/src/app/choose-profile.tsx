import FlowPlaceholder from '@/components/FlowPlaceholder';

// Dito yung paggawa ng "Choose Profile" screen. It shows a placeholder for the choose profile flow, 
// with a link to go to the Home screen after choosing a profile.
export default function ChooseProfileScreen() {
  return <FlowPlaceholder name="Choose Profile" links={[{ label: 'Continue to Home', route: '/' }]} />;
}