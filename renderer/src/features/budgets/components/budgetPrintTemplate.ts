export const generateBudgetPrintHTML = (budgetData: any) => {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const calculateSubtotal = () => {
        return budgetData.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);
    };

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Presupuesto - ${budgetData.client_name}</title>
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
        
        .validity {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 6px;
            margin-top: 8px;
            font-size: 9px;
            text-align: center;
        }
        
        .type-badge {
            display: inline-block;
            padding: 1px 4px;
            border-radius: 2px;
            font-size: 8px;
            font-weight: bold;
        }
        
        .type-product {
            background-color: #e3f2fd;
            color: #1976d2;
        }
        
        .type-template {
            background-color: #f3e5f5;
            color: #7b1fa2;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>PRESUPUESTO</h1>
        <p>Fecha: ${formatDate(budgetData.date)}</p>
    </div>

    <!-- Información del Cliente -->
    <div class="section">
        <div class="section-title">INFORMACIÓN DEL CLIENTE</div>
        <div class="client-info">
            <div class="info-item">
                <span class="info-label">Nombre:</span>
                ${budgetData.client_name}
            </div>
            <div class="info-item">
                <span class="info-label">Teléfono:</span>
                ${budgetData.client_phone}
            </div>
            <div class="info-item">
                <span class="info-label">Fecha:</span>
                ${formatDate(budgetData.date)}
            </div>
        </div>
    </div>

    <!-- Productos y Servicios -->
    <div class="section">
        <div class="section-title">PRODUCTOS Y SERVICIOS COTIZADOS</div>
        <table class="products-table">
            <thead>
                <tr>
                    <th style="width: 5%">#</th>
                    <th style="width: 40%">Descripción</th>
                    <th style="width: 8%">Tipo</th>
                    <th style="width: 10%" class="text-center">Cant.</th>
                    <th style="width: 15%" class="text-right">Precio Unit.</th>
                    <th style="width: 15%" class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${budgetData.items.map((item: any, index: number) => `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>
                        <strong>${item.name}</strong>
                        ${item.serial_number ? `<br><small>SN: ${item.serial_number}</small>` : ''}
                        ${item.description ? `<br><small>${item.description}</small>` : ''}
                        ${item.width && item.height ? `<br><small>Dimensiones: ${item.width} × ${item.height} cm</small>` : ''}
                        ${item.colors ? `<br><small>Colores: ${item.colors}</small>` : ''}
                        ${item.position ? `<br><small>Posición: ${item.position}</small>` : ''}
                        ${item.texts ? `<br><small>Textos: ${item.texts}</small>` : ''}
                    </td>
                    <td class="text-center">
                        <span class="type-badge ${item.type === 'product' ? 'type-product' : 'type-template'}">
                            ${item.type === 'product' ? 'PROD' : 'TEMP'}
                        </span>
                    </td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-right">$${item.unit_price.toFixed(2)}</td>
                    <td class="text-right">$${(item.quantity * item.unit_price).toFixed(2)}</td>
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
                <span>TOTAL PRESUPUESTADO:</span>
                <span>$${budgetData.total.toFixed(2)} MXN</span>
            </div>
        </div>
    </div>

    <!-- Validez del presupuesto -->
    <div class="validity">
        <strong>Validez del presupuesto: 30 días a partir de la fecha de emisión</strong>
    </div>

    <!-- Notas -->
    ${budgetData.notes ? `
    <div class="section">
        <div class="section-title">NOTAS Y OBSERVACIONES</div>
        <div class="notes">
            ${budgetData.notes}
        </div>
    </div>
    ` : ''}

    <!-- Términos y condiciones -->
    <div class="section">
        <div class="section-title">TÉRMINOS Y CONDICIONES</div>
        <div style="font-size: 8px; line-height: 1.3;">
            <p>• Los precios incluyen IVA</p>
            <p>• Tiempo de entrega: Según acordado con el cliente</p>
            <p>• Condiciones de pago: 50% anticipo, 50% contra entrega</p>
            <p>• Los productos personalizados no tienen devolución</p>
        </div>
    </div>

    <div class="footer">
        Presupuesto generado el ${new Date().toLocaleDateString('es-MX')} a las ${new Date().toLocaleTimeString('es-MX')}
        <br>
        <strong>Este presupuesto no constituye una orden de trabajo hasta su confirmación</strong>
    </div>
</body>
</html>
  `;
};
