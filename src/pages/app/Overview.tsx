export default function AppOverviewPage() {
  return (
    <div className="space-y-6">
      <div className="card p-4">
        <h1>Resumo</h1>
        <p className="text-mutedForeground">Status da assinatura, plano e próximo vencimento.</p>
        <div className="mt-4 flex gap-2">
          <button className="btn btn-primary">Ação primária</button>
          <button className="btn btn-secondary">Ação secundária</button>
          <button className="btn btn-accent">CTA</button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <div className="badge">Hoje</div>
          <h3 className="mt-2">Consultas</h3>
          <p>0 agendadas</p>
        </div>
        <div className="card p-4">
          <div className="badge">Assinatura</div>
          <h3 className="mt-2">Plano atual</h3>
          <p>Starter</p>
        </div>
        <div className="card p-4">
          <div className="badge">Financeiro</div>
          <h3 className="mt-2">Receitas Mês</h3>
          <p>R$ 0,00</p>
        </div>
      </div>
    </div>
  )
}
