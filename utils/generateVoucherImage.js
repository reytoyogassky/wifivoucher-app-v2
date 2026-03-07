/**
 * Generate voucher card image using html2canvas
 * This runs client-side only
 */
export async function generateVoucherImage(sale, vouchers) {
  // Dynamic import to avoid SSR issues
  const html2canvas = (await import('html2canvas')).default

  // Create offscreen container
  const container = document.createElement('div')
  container.style.cssText = `
    position: fixed;
    top: -9999px;
    left: -9999px;
    width: 400px;
    background: white;
    font-family: 'Plus Jakarta Sans', sans-serif;
  `

  container.innerHTML = generateVoucherHTML(sale, vouchers)
  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    })

    const dataUrl = canvas.toDataURL('image/png')
    return dataUrl
  } finally {
    document.body.removeChild(container)
  }
}

/**
 * Auto download voucher as PNG
 */
export async function downloadVoucherImage(sale, vouchers) {
  const dataUrl = await generateVoucherImage(sale, vouchers)

  const link = document.createElement('a')
  link.download = `voucher-${sale.transaction_code || sale.id}.png`
  link.href = dataUrl
  link.click()

  return dataUrl
}

function generateVoucherHTML(sale, vouchers) {
  const voucherCards = vouchers.map(v => `
    <div style="
      border: 2px dashed #8B5CF6;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
    ">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">Kode Voucher</div>
          <div style="font-size: 22px; font-weight: 700; color: #8B5CF6; letter-spacing: 2px; font-family: monospace;">${v.code}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 11px; color: #6b7280;">Paket</div>
          <div style="font-size: 13px; font-weight: 600; color: #374151;">${v.package_name}</div>
          <div style="font-size: 11px; color: #8B5CF6;">${v.duration} · ${v.speed || '-'}</div>
        </div>
      </div>
    </div>
  `).join('')

  return `
    <div style="padding: 24px; background: white;">
      <!-- Header -->
      <div style="
        background: linear-gradient(135deg, #8B5CF6 0%, #7c3aed 100%);
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 20px;
        color: white;
        text-align: center;
      ">
        <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.8; margin-bottom: 4px;">WiFi Voucher</div>
        <div style="font-size: 22px; font-weight: 700;">Kartu Voucher</div>
        <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">${sale.transaction_code || ''}</div>
      </div>

      <!-- Customer Info -->
      <div style="
        background: #f9fafb;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
      ">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">Pelanggan</div>
            <div style="font-size: 14px; font-weight: 600; color: #111827;">${sale.customer_name}</div>
          </div>
          <div>
            <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">Telepon</div>
            <div style="font-size: 14px; font-weight: 600; color: #111827;">${sale.customer_phone || '-'}</div>
          </div>
          <div>
            <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">Pembayaran</div>
            <div style="font-size: 14px; font-weight: 600; color: ${sale.payment_method === 'cash' ? '#10B981' : '#F59E0B'};">
              ${sale.payment_method === 'cash' ? '✓ Cash' : '⏳ Hutang'}
            </div>
          </div>
          <div>
            <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">Total</div>
            <div style="font-size: 14px; font-weight: 700; color: #8B5CF6;">
              Rp ${Number(sale.total_amount).toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      </div>

      <!-- Vouchers -->
      <div style="font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 10px;">
        Voucher (${vouchers.length})
      </div>
      ${voucherCards}

      <!-- Footer -->
      <div style="text-align: center; margin-top: 16px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
        <div style="font-size: 10px; color: #9ca3af;">
          ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
        <div style="font-size: 9px; color: #d1d5db; margin-top: 2px;">Terima kasih telah berbelanja</div>
      </div>
    </div>
  `
}
