import FlowPlaceholder from '@/components/FlowPlaceholder';

// Dito yung paggawa ng "Code Verification" screen. It shows a placeholder for the code verification flow, 
// with links to go to the "Choose Profile" screen or back to the "Sign Up" screen to change email.
export default function VerifyCodeScreen() {
  return (
    <FlowPlaceholder
      name="Code Verification"
      links={[
        { label: 'Verify (go to Choose Profile)', route: '/choose-profile' },
        { label: 'Change email', route: '/signup' },
      ]}
    />
  );
}