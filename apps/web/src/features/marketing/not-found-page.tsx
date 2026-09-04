import { useNavigate } from 'react-router-dom';
import { EmptyState, Button } from '@ptg/ui';
import { FileQuestion } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <EmptyState
      icon={FileQuestion}
      title="Page not found"
      description="The page you're looking for doesn't exist."
      action={<Button onClick={() => navigate('/')}>Go home</Button>}
      className="mt-12"
    />
  );
}
