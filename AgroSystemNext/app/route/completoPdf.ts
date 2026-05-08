export const generateCompletoHtml = (
  clients: any[],
  summary: { emDia: number; aVencer: number; inadimplentes: number; received: number; toReceive: number; overdue: number; total: number; defaultRate: number },
  routeName: string,
  routeMonth: string,
  reportDate: string,
  getClientStatsFn: (client: any) => { received: number; toReceive: number; overdue: number },
  getClientStatusFn: (client: any) => string
) => {
  const statusLabel: Record<string, string> = {
    em_dia: 'Em Dia',
    a_vencer: 'A Vencer',
    inadimplentes: 'Inadimplente',
  };

  const statusColor: Record<string, string> = {
    em_dia: '#059669',
    a_vencer: '#D97706',
    inadimplentes: '#DC2626',
  };

  const statusBg: Record<string, string> = {
    em_dia: '#ECFDF5',
    a_vencer: '#FFFBEB',
    inadimplentes: '#FEF2F2',
  };

  const statusBorder: Record<string, string> = {
    em_dia: '#A7F3D0',
    a_vencer: '#FDE68A',
    inadimplentes: '#FECACA',
  };

  const clientsHtml = clients.map((client: any) => {
    const stats = getClientStatsFn(client);
    const status = getClientStatusFn(client);
    const label = statusLabel[status] || 'Indefinido';
    const color = statusColor[status] || '#6B7280';
    const bg = statusBg[status] || '#F9FAFB';
    const border = statusBorder[status] || '#E5E7EB';

    const renderPaymentRow = (p: any, type: string) => {
      const dueDate = new Date(p.dueDate).toLocaleDateString('pt-BR');
      const value = (p.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const isPaid = p.status === 'RECEIVED' || p.status === 'CONFIRMED' || p.status === 'RECEIVED_IN_CASH';
      const isOverdue = p.status === 'OVERDUE';
      const valueColor = isPaid ? '#059669' : isOverdue ? '#DC2626' : '#374151';
      const statusBadge = isPaid ? 'Pago' : isOverdue ? 'Vencido' : 'Pendente';
      const badgeBg = isPaid ? '#D1FAE5' : isOverdue ? '#FEE2E2' : '#FEF3C7';
      const badgeColor = isPaid ? '#065F46' : isOverdue ? '#991B1B' : '#92400E';
      const typeLabel = type === 'installment' && p.installmentNumber ? `${p.installmentNumber}ª` : type === 'unique' ? 'Única' : '-';

      return `
        <tr>
          <td style="padding: 4px 8px; font-size: 8.5px; color: #374151; border-bottom: 1px solid #F3F4F6;">${dueDate}</td>
          <td style="padding: 4px 8px; font-size: 8.5px; color: #6B7280; text-align: center; border-bottom: 1px solid #F3F4F6;">${typeLabel}</td>
          <td style="padding: 4px 8px; font-size: 8.5px; color: ${valueColor}; text-align: right; font-weight: 600; border-bottom: 1px solid #F3F4F6;">${value}</td>
          <td style="padding: 4px 8px; text-align: center; border-bottom: 1px solid #F3F4F6;">
            <span style="display: inline-block; padding: 1px 6px; border-radius: 8px; font-size: 7px; font-weight: 600; background: ${badgeBg}; color: ${badgeColor};">${statusBadge}</span>
          </td>
        </tr>
      `;
    };

    const groupsHtml = client.installmentGroups?.map((g: any) => {
      if (!g.payments?.length) return '';
      const valParc = g.valuePerInstallment || g.payments[0]?.value || 0;
      const total = g.totalValue || valParc * g.installmentCount;
      const allPaid = g.payments.every((p: any) => p.status === 'RECEIVED' || p.status === 'CONFIRMED' || p.status === 'RECEIVED_IN_CASH');
      const anyOverdue = g.payments.some((p: any) => p.status === 'OVERDUE');
      const groupStatus = allPaid ? 'Pago' : anyOverdue ? 'Vencido' : 'Pendente';
      const groupColor = allPaid ? '#059669' : anyOverdue ? '#DC2626' : '#D97706';
      const groupBg = allPaid ? '#D1FAE5' : anyOverdue ? '#FEE2E2' : '#FEF3C7';
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 5px 10px; margin-top: 4px; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px;">
          <div>
            <span style="font-size: 8px; font-weight: 600; color: #374151;">Parcelamento ${g.installmentCount}x</span>
            <span style="font-size: 8px; color: #6B7280; margin-left: 4px;">${valParc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            <span style="font-size: 8px; color: #9CA3AF; margin: 0 3px;">=</span>
            <span style="font-size: 8px; font-weight: 700; color: #111827;">${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
          <span style="display: inline-block; padding: 1px 8px; border-radius: 8px; font-size: 7px; font-weight: 600; background: ${groupBg}; color: ${groupColor};">${groupStatus}</span>
        </div>
      `;
    }).join('');

    const uniqueHtml = (() => {
      const rows = client.uniquePayments?.map((p: any) => renderPaymentRow(p, 'unique')).join('');
      if (!rows) return '';
      return `
        <div style="margin-top: 6px;">
          <div style="font-size: 7.5px; color: #6B7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">Pagamento Único</div>
          <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #F9FAFB;">
                <th style="padding: 4px 8px; font-size: 7px; color: #6B7280; text-align: left; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Vencimento</th>
                <th style="padding: 4px 8px; font-size: 7px; color: #6B7280; text-align: center; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Tipo</th>
                <th style="padding: 4px 8px; font-size: 7px; color: #6B7280; text-align: right; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Valor</th>
                <th style="padding: 4px 8px; font-size: 7px; color: #6B7280; text-align: center; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    })();

    return `
      <div style="page-break-inside: avoid; margin-bottom: 10px; background: #FFFFFF; border: 1px solid ${border}; border-radius: 6px; overflow: hidden;">
        <div style="padding: 10px 14px; background: linear-gradient(135deg, ${bg} 0%, #FFFFFF 100%); border-bottom: 1px solid ${border};">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 12px; flex-shrink: 0;">
              ${(client.name || 'C')[0].toUpperCase()}
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 12px; font-weight: 600; color: #111827;">${client.name || 'Cliente nao identificado'}</span>
                <span style="display: inline-block; padding: 1px 8px; border-radius: 8px; font-size: 7px; font-weight: 600; background: ${bg}; color: ${color}; border: 1px solid ${border};">${label}</span>
              </div>
              <div style="font-size: 8px; color: #6B7280; margin-top: 1px;">
                ${client.phone || 'Telefone nao informado'}${client.fichaNumber ? ` — Ficha: ${client.fichaNumber}` : ''}
              </div>
            </div>
            <div style="text-align: right; flex-shrink: 0;">
              <div style="font-size: 7px; color: #6B7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1px;">Total</div>
              <div style="font-size: 13px; font-weight: 700; color: #111827;">${(stats.received + stats.toReceive + stats.overdue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </div>
          </div>
          <div style="display: flex; gap: 12px; margin-top: 6px; padding-top: 6px; border-top: 1px solid ${border};">
            <div style="flex: 1; text-align: center;">
              <div style="font-size: 6.5px; color: #059669; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Recebido</div>
              <div style="font-size: 10px; font-weight: 700; color: #059669;">${stats.received.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </div>
            <div style="flex: 1; text-align: center;">
              <div style="font-size: 6.5px; color: #D97706; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">A Receber</div>
              <div style="font-size: 10px; font-weight: 700; color: #D97706;">${stats.toReceive.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </div>
            <div style="flex: 1; text-align: center;">
              <div style="font-size: 6.5px; color: #DC2626; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Vencido</div>
              <div style="font-size: 10px; font-weight: 700; color: #DC2626;">${stats.overdue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </div>
          </div>
        </div>
        <div style="padding: 8px 14px; background: #FAFAFA;">
          ${groupsHtml}
          ${uniqueHtml}
          ${!groupsHtml && !uniqueHtml ? '<div style="text-align: center; padding: 8px; color: #9CA3AF; font-size: 8px;">Nenhum pagamento registrado</div>' : ''}
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
      margin: 8mm 6mm; 
    }
    
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
      background: #FFFFFF; 
      color: #111827; 
      padding: 0; 
      font-size: 10px; 
      margin: 0;
      line-height: 1.4;
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
  <!-- Header -->
  <div style="margin-bottom: 14px;">
    <div style="display: flex; align-items: flex-end; justify-content: space-between; padding-bottom: 8px; border-bottom: 3px solid #059669; margin-bottom: 12px;">
      <div>
        <div style="font-size: 16px; font-weight: 700; color: #059669; letter-spacing: -0.5px;">AgroSystem</div>
        <div style="font-size: 7.5px; color: #9CA3AF; margin-top: 1px;">Gestao Financeira</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 10px; font-weight: 700; color: #059669; letter-spacing: 0.3px;">Relatorio Completo</div>
        <div style="font-size: 8.5px; color: #374151; font-weight: 500; margin-top: 2px;">${routeName}</div>
        <div style="font-size: 7.5px; color: #6B7280;">${routeMonth}</div>
      </div>
    </div>
  </div>

  <!-- Summary Cards: count + value combined per card -->
  <div style="display: flex; gap: 8px; margin-bottom: 14px;">
    <div style="flex: 1; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 5px; padding: 10px;">
      <div style="font-size: 7px; color: #6B7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Total Clientes</div>
      <div style="font-size: 20px; font-weight: 700; color: #111827;">${clients.length}</div>
      <div style="margin-top: 6px; padding-top: 5px; border-top: 1px solid #E5E7EB;">
        <div style="font-size: 6.5px; color: #6B7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Valor Total</div>
        <div style="font-size: 11px; font-weight: 700; color: #111827;">${summary.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
      </div>
    </div>
    <div style="flex: 1; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 5px; padding: 10px;">
      <div style="font-size: 7px; color: #065F46; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Em Dia</div>
      <div style="font-size: 20px; font-weight: 700; color: #059669;">${summary.emDia}</div>
      <div style="margin-top: 6px; padding-top: 5px; border-top: 1px solid #A7F3D0;">
        <div style="font-size: 6.5px; color: #065F46; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Total Recebido</div>
        <div style="font-size: 11px; font-weight: 700; color: #059669;">${summary.received.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
      </div>
    </div>
    <div style="flex: 1; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 5px; padding: 10px;">
      <div style="font-size: 7px; color: #92400E; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">A Vencer</div>
      <div style="font-size: 20px; font-weight: 700; color: #D97706;">${summary.aVencer}</div>
      <div style="margin-top: 6px; padding-top: 5px; border-top: 1px solid #FDE68A;">
        <div style="font-size: 6.5px; color: #92400E; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Total a Receber</div>
        <div style="font-size: 11px; font-weight: 700; color: #D97706;">${summary.toReceive.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
      </div>
    </div>
    <div style="flex: 1; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 5px; padding: 10px;">
      <div style="font-size: 7px; color: #991B1B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Inadimplentes</div>
      <div style="font-size: 20px; font-weight: 700; color: #DC2626;">${summary.inadimplentes}</div>
      <div style="margin-top: 6px; padding-top: 5px; border-top: 1px solid #FECACA;">
        <div style="font-size: 6.5px; color: #991B1B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Total Vencido</div>
        <div style="font-size: 11px; font-weight: 700; color: #DC2626;">${summary.overdue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
      </div>
    </div>
  </div>

  <!-- Section Title -->
  <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px; padding: 7px 12px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
    <div style="font-size: 9px; font-weight: 600; color: #374151;">
      Clientes
    </div>
    <div style="font-size: 7.5px; color: #9CA3AF;">
      ${clients.length} cliente${clients.length !== 1 ? 's' : ''}
    </div>
  </div>

  <!-- Clients List -->
  <div>${clientsHtml}</div>

  <!-- Footer -->
  <div style="margin-top: 14px; padding-top: 8px; border-top: 1px solid #E5E7EB; text-align: center;">
    <div style="font-size: 7px; color: #9CA3AF;">Relatorio gerado em ${reportDate}</div>
    <div style="font-size: 7.5px; color: #6B7280; font-weight: 500; margin-top: 1px;">AgroSystem</div>
  </div>
</body>
</html>
  `;
};
