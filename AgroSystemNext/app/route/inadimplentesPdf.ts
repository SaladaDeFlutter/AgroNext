export const generateInadimplentesHtml = (
  inadimplentClients: any[],
  totalOverdue: number,
  inadimplenceRate: number,
  routeName: string,
  routeMonth: string,
  reportDate: string,
  getClientStatsFn: (client: any) => { received: number; toReceive: number; overdue: number }
) => {
  const clientsHtml = inadimplentClients.map((client: any) => {
    const stats = getClientStatsFn(client);

    const groupsHtml = client.installmentGroups?.map((g: any) => {
      const overdueInGroup = g.payments?.filter((p: any) => p.status === 'OVERDUE') || [];
      if (overdueInGroup.length === 0) return '';

      const rows = overdueInGroup.map((p: any) => {
        const dueDate = new Date(p.dueDate).toLocaleDateString('pt-BR');
        const value = (p.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const installmentLabel = p.installmentNumber ? `${p.installmentNumber}ª` : '-';
        const daysOverdue = Math.floor((Date.now() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24));

        return `
          <tr>
            <td style="padding: 5px 10px; font-size: 9px; color: #374151; border-bottom: 1px solid #E5E7EB;">${dueDate}</td>
            <td style="padding: 5px 10px; font-size: 9px; color: #6B7280; text-align: center; border-bottom: 1px solid #E5E7EB;">${installmentLabel}</td>
            <td style="padding: 5px 10px; font-size: 9px; color: #DC2626; text-align: right; font-weight: 600; border-bottom: 1px solid #E5E7EB;">${value}</td>
            <td style="padding: 5px 10px; font-size: 9px; color: #DC2626; text-align: center; border-bottom: 1px solid #E5E7EB;">${daysOverdue} dias</td>
          </tr>
        `;
      }).join('');

      return `
        <div style="margin-top: 10px;">
          <div style="font-size: 8px; color: #6B7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Parcelamento ${g.installmentCount}x</div>
          <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #F3F4F6;">
                <th style="padding: 5px 10px; font-size: 7.5px; color: #6B7280; text-align: left; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Vencimento</th>
                <th style="padding: 5px 10px; font-size: 7.5px; color: #6B7280; text-align: center; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Parc.</th>
                <th style="padding: 5px 10px; font-size: 7.5px; color: #6B7280; text-align: right; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Valor</th>
                <th style="padding: 5px 10px; font-size: 7.5px; color: #6B7280; text-align: center; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Atraso</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    }).join('');

    const uniqueHtml = (() => {
      const overdueUnique = client.uniquePayments?.filter((p: any) => p.status === 'OVERDUE') || [];
      if (overdueUnique.length === 0) return '';

      const rows = overdueUnique.map((p: any) => {
        const dueDate = new Date(p.dueDate).toLocaleDateString('pt-BR');
        const value = (p.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const daysOverdue = Math.floor((Date.now() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24));

        return `
          <tr>
            <td style="padding: 5px 10px; font-size: 9px; color: #374151; border-bottom: 1px solid #E5E7EB;">${dueDate}</td>
            <td style="padding: 5px 10px; font-size: 9px; color: #6B7280; text-align: center; border-bottom: 1px solid #E5E7EB;">Unica</td>
            <td style="padding: 5px 10px; font-size: 9px; color: #DC2626; text-align: right; font-weight: 600; border-bottom: 1px solid #E5E7EB;">${value}</td>
            <td style="padding: 5px 10px; font-size: 9px; color: #DC2626; text-align: center; border-bottom: 1px solid #E5E7EB;">${daysOverdue} dias</td>
          </tr>
        `;
      }).join('');

      return `
        <div style="margin-top: 10px;">
          <div style="font-size: 8px; color: #6B7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Pagamento Unico</div>
          <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #F3F4F6;">
                <th style="padding: 5px 10px; font-size: 7.5px; color: #6B7280; text-align: left; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Vencimento</th>
                <th style="padding: 5px 10px; font-size: 7.5px; color: #6B7280; text-align: center; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Tipo</th>
                <th style="padding: 5px 10px; font-size: 7.5px; color: #6B7280; text-align: right; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Valor</th>
                <th style="padding: 5px 10px; font-size: 7.5px; color: #6B7280; text-align: center; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Atraso</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    })();

    const totalOverdueForClient = stats.overdue;

    return `
      <div style="page-break-inside: avoid; margin-bottom: 12px; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
        <div style="padding: 12px 16px; background: linear-gradient(135deg, #FEF2F2 0%, #FFFFFF 100%); border-bottom: 1px solid #FECACA;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: #DC2626; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 14px; flex-shrink: 0;">
              ${(client.name || 'C')[0].toUpperCase()}
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 13px; font-weight: 600; color: #111827;">
                ${client.name || 'Cliente nao identificado'}${client.fichaNumber ? ` — ${client.fichaNumber}` : ''}
              </div>
              <div style="font-size: 9px; color: #6B7280; margin-top: 2px;">
                ${client.phone || 'Telefone nao informado'}
              </div>
            </div>
            <div style="text-align: right; flex-shrink: 0;">
              <div style="font-size: 7.5px; color: #991B1B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Total Vencido</div>
              <div style="font-size: 15px; font-weight: 700; color: #DC2626;">
                ${totalOverdueForClient.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
          </div>
        </div>

        <div style="padding: 10px 16px; background: #FAFAFA;">
          ${groupsHtml}
          ${uniqueHtml}
          ${!groupsHtml && !uniqueHtml ? '<div style="text-align: center; padding: 12px; color: #9CA3AF; font-size: 9px;">Nenhum pagamento em atraso</div>' : ''}
        </div>
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${routeName} - ${routeMonth}</title>
  <style>
    @page { 
      size: A4; 
      margin: 10mm 8mm; 
    }
    
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
      background: #FFFFFF; 
      color: #111827; 
      padding: 0; 
      font-size: 10px; 
      margin: 0;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    
    @media print {
      body {
        background: #FFFFFF;
      }
    }
  </style>
</head>
<body>
  <!-- Report Header -->
  <div style="margin-bottom: 16px;">
    <div style="display: flex; align-items: flex-end; justify-content: space-between; padding-bottom: 10px; border-bottom: 3px solid #059669; margin-bottom: 14px;">
      <div>
        <div style="font-size: 18px; font-weight: 700; color: #059669; letter-spacing: -0.5px;">AgroSystem</div>
        <div style="font-size: 8px; color: #9CA3AF; margin-top: 1px;">Gestao Financeira</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 11px; font-weight: 700; color: #DC2626; letter-spacing: 0.3px;">Relatorio de Inadimplentes</div>
        <div style="font-size: 9px; color: #374151; font-weight: 500; margin-top: 3px;">${routeName}</div>
        <div style="font-size: 8px; color: #6B7280;">${routeMonth}</div>
      </div>
    </div>
  </div>

  <!-- Summary Cards -->
  <div style="display: flex; gap: 10px; margin-bottom: 18px;">
    <div style="flex: 1; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; padding: 10px 14px;">
      <div style="font-size: 7.5px; color: #991B1B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">Clientes</div>
      <div style="font-size: 22px; font-weight: 700; color: #DC2626;">${inadimplentClients.length}</div>
    </div>
    <div style="flex: 1; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; padding: 10px 14px;">
      <div style="font-size: 7.5px; color: #991B1B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">Total Vencido</div>
      <div style="font-size: 16px; font-weight: 700; color: #DC2626;">${totalOverdue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
    </div>
    <div style="flex: 1; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; padding: 10px 14px;">
      <div style="font-size: 7.5px; color: #991B1B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">Taxa</div>
      <div style="font-size: 22px; font-weight: 700; color: #DC2626;">${inadimplenceRate.toFixed(1)}%</div>
    </div>
  </div>

  <!-- Section Title -->
  <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px; padding: 8px 14px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
    <div style="font-size: 10px; font-weight: 600; color: #374151;">
      Clientes Inadimplentes
    </div>
    <div style="font-size: 8px; color: #9CA3AF;">
      ${inadimplentClients.length} cliente${inadimplentClients.length !== 1 ? 's' : ''}
    </div>
  </div>

  <!-- Clients List -->
  <div>
    ${clientsHtml}
  </div>

  <!-- Footer -->
  <div style="margin-top: 18px; padding-top: 10px; border-top: 1px solid #E5E7EB; text-align: center;">
    <div style="font-size: 7.5px; color: #9CA3AF;">Relatorio gerado em ${reportDate}</div>
    <div style="font-size: 8px; color: #6B7280; font-weight: 500; margin-top: 2px;">AgroSystem</div>
  </div>
</body>
</html>
  `;
};
