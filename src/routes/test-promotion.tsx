import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { testPromotionLookup } from '@/lib/promotion-test.functions';

export const Route = createFileRoute('/test-promotion')({
  component: TestPromotion,
});

function TestPromotion() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['test-promotion'],
    queryFn: () => testPromotionLookup(),
  });

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {String(error)}</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Teste de Promoções</h1>
      <pre className="bg-gray-100 p-4 rounded">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
