export const generatePrintHTML = (orderData: any, productsData: any[], paymentsData: any[]) => {
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('es-MX', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	};

	const getStatusText = (status: string) => {
		switch (status.toLowerCase()) {
			case 'pendiente': return 'Pendiente';
			case 'completado': return 'Completada';
			case 'cancelado': return 'Cancelada';
			case 'en proceso': return 'En Proceso';
			default: return status;
		}
	};

	const calculateSubtotal = () => {
		return productsData.reduce((sum, product) => sum + product.total_price, 0);
	};

	const totalPagos = paymentsData.reduce((sum, payment) => sum + payment.amount, 0);
	const saldoPendiente = orderData.total - totalPagos;

	return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orden #${orderData.id}</title>
    <style>
        @page {
            size: 5.5in 8.5in;
            margin: 0.4in;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 10px;
            line-height: 1.2;
            color: #000;
        }
        
        .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
        }
        
        .header h1 {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 4px;
        }
        
        .header p {
            font-size: 12px;
        }
        
        .section {
            margin-bottom: 12px;
        }
        
        .section-title {
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 6px;
            border-bottom: 1px solid #000;
            padding-bottom: 2px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 8px;
        }
        
        .info-item {
            margin-bottom: 4px;
        }
        
        .info-label {
            font-weight: bold;
            display: inline-block;
            width: 80px;
        }
        
        .client-info {
            background-color: #f5f5f5;
            padding: 6px;
            border: 1px solid #000;
            margin-bottom: 8px;
        }
        
        .products-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
            font-size: 9px;
        }
        
        .products-table th,
        .products-table td {
            border: 1px solid #000;
            padding: 3px;
            text-align: left;
        }
        
        .products-table th {
            background-color: #f0f0f0;
            font-weight: bold;
            font-size: 9px;
        }
        
        .products-table .text-right {
            text-align: right;
        }
        
        .products-table .text-center {
            text-align: center;
        }
        
        .totals {
            margin-top: 8px;
            border-top: 2px solid #000;
            padding-top: 6px;
        }
        
        .total-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
        }
        
        .total-line.final {
            font-weight: bold;
            font-size: 11px;
            border-top: 1px solid #000;
            padding-top: 3px;
        }
        
        .payments-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
        }
        
        .payments-table th,
        .payments-table td {
            border: 1px solid #000;
            padding: 3px;
            text-align: left;
        }
        
        .payments-table th {
            background-color: #f0f0f0;
            font-weight: bold;
        }
        
        .status {
            display: inline-block;
            padding: 2px 6px;
            border: 1px solid #000;
            border-radius: 3px;
            font-size: 9px;
            font-weight: bold;
        }
        
        .notes {
            background-color: #f9f9f9;
            padding: 6px;
            border: 1px solid #000;
            font-size: 9px;
            min-height: 30px;
        }
        
        .footer {
            margin-top: 15px;
            border-top: 1px solid #000;
            padding-top: 6px;
            font-size: 8px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Orden #${orderData.id}</h1>
    </div>

    <!-- Información General -->
    <div class="section">
        <div class="section-title">INFORMACIÓN GENERAL</div>
        <div class="info-grid">
            <div>
                <div class="info-item">
                    <span class="info-label">Estado:</span>
                    <span class="status">${getStatusText(orderData.status)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Fecha:</span>
                    ${formatDate(orderData.date)}
                </div>
            </div>
            <div>
                <div class="info-item">
                    <span class="info-label">Fecha de Entrega:</span>
                    ${orderData.estimated_delivery_date ? formatDate(orderData.estimated_delivery_date) : 'No definida'}
                </div>
                <div class="info-item">
                    <span class="info-label">Total:</span>
                    <strong>$${orderData.total.toFixed(2)} MXN</strong>
                </div>
            </div>
        </div>
    </div>

    <!-- Información del Cliente -->
    ${orderData.client ? `
    <div class="section">
        <div class="section-title">CLIENTE</div>
        <div class="client-info">
            <div class="info-item">
                <span class="info-label">Nombre:</span>
                ${orderData.client.name}
            </div>
            <div class="info-item">
                <span class="info-label">Teléfono:</span>
                ${orderData.client.phone}
            </div>
        </div>
    </div>
    ` : ''}

    <!-- Productos y Servicios -->
    <div class="section">
        <div class="section-title">PRODUCTOS Y SERVICIOS</div>
        <table class="products-table">
            <thead>
                <tr>
                    <th style="width: 5%">#</th>
                    <th style="width: 45%">Descripción</th>
                    <th style="width: 10%" class="text-center">Cant.</th>
                    <th style="width: 15%" class="text-right">Precio Unit.</th>
                    <th style="width: 15%" class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${productsData.map((product, index) => `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>
                        <strong>${product.product_name || product.template_name || 'Producto'}</strong>
                        ${product.serial_number ? `<br><small>SN: ${product.serial_number}</small>` : ''}
                        ${product.product_description ? `<br><small>${product.product_description}</small>` : ''}
                        ${product.template_description ? `<br><small>${product.template_description}</small>` : ''}
                        ${product.template_texts ? `<br><small>Textos: ${product.template_texts}</small>` : ''}
                        ${product.template_colors ? `<br><small>Colores: ${product.template_colors}</small>` : ''}
                        ${product.template_width && product.template_height ? `<br><small>Dimensiones: ${product.template_width} × ${product.template_height} cm</small>` : ''}
                    </td>
                    <td class="text-center">${product.quantity}</td>
                    <td class="text-right">$${product.unit_price.toFixed(2)}</td>
                    <td class="text-right">$${product.total_price.toFixed(2)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="totals">
            <div class="total-line">
                <span>Subtotal:</span>
                <span>$${calculateSubtotal().toFixed(2)} MXN</span>
            </div>
            <div class="total-line final">
                <span>TOTAL:</span>
                <span>$${orderData.total.toFixed(2)} MXN</span>
            </div>
        </div>
    </div>

    <!-- Pagos -->
    ${paymentsData.length > 0 ? `
    <div class="section">
        <div class="section-title">PAGOS REALIZADOS</div>
        <table class="payments-table">
            <thead>
                <tr>
                    <th style="width: 25%">Fecha</th>
                    <th style="width: 35%">Método</th>
                    <th style="width: 40%" class="text-right">Monto</th>
                </tr>
            </thead>
            <tbody>
                ${paymentsData.map(payment => `
                <tr>
                    <td>${formatDate(payment.date)}</td>
                    <td>${payment.method}</td>
                    <td class="text-right">$${payment.amount.toFixed(2)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="totals">
            <div class="total-line">
                <span>Total Pagado:</span>
                <span>$${totalPagos.toFixed(2)} MXN</span>
            </div>
            <div class="total-line ${saldoPendiente > 0 ? 'final' : ''}">
                <span>Saldo Pendiente:</span>
                <span>$${saldoPendiente.toFixed(2)} MXN</span>
            </div>
        </div>
    </div>
    ` : ''}

    <!-- Notas -->
    ${orderData.notes ? `
    <div class="section">
        <div class="section-title">NOTAS</div>
        <div class="notes">
            ${orderData.notes}
        </div>
    </div>
    ` : ''}

    <!-- Historial -->
    <div class="section">
        <div class="section-title">HISTORIAL</div>
        <div style="font-size: 8px;">
            ${orderData.user ? `<div>Creado por: ${orderData.user.username}</div>` : ''}
            ${orderData.editedByUser ? `<div>Última edición: ${orderData.editedByUser.username}</div>` : ''}
        </div>
    </div>

    <div class="footer">
        Documento generado el ${new Date().toLocaleDateString('es-MX')} a las ${new Date().toLocaleTimeString('es-MX')}
    </div>
</body>
</html>
  `;
};
