export function LoadingScreen({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="center-screen">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  );
}
