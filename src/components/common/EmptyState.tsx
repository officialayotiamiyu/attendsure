import { Card } from './Card';

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
    </Card>
  );
}
