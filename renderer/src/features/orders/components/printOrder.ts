import { toast } from 'sonner';

// Función para generar HTML de previsualización (con imagen de fondo)
export const generatePreviewHTML = (orderData: any, productsData: any[], paymentsData: any[], scale: number = 1) => {
	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		const day = date.getDate().toString().padStart(2, '0');
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const year = date.getFullYear().toString();

		return `${day} &nbsp;&nbsp; ${month} &nbsp;&nbsp; ${year}`;
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
    <title>Vista Previa - Orden #${orderData.id}</title>
    <style>
        @page {
            size: 4.25in 5.5in;
            margin: 0.3in;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            color: #000;
            background-image: url('file:///C:/Users/corre/OneDrive/Documents/PROYECTOS/BACE-ELECTRON/renderer/src/assets/NOTA.jpg');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            width: 1600px;
            height: 1324px;
            margin: 0;
            padding: 0;
            overflow: hidden;
        }
        .print-button {
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            padding: 8px 16px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            z-index: 1000;
        }
        .print-button:hover {
            background: #2563eb;
        }
        .content {
            width: 1600px;
            height: 1324px;
            position: relative;
            padding: 0;
            margin: 0;
        }
        .fecha {
            position: absolute;
            top: 320px;
            right: 200px;
            font-size: 44px;
            font-weight: bold;
        }
        .cliente {
            position: absolute;
            top: 480px;
            left: 200px;
            font-size: 44px;
            font-weight: bold;
        }
        .productos {
            position: absolute;
            top: 720px;
            left: 80px;
            right: 80px;
        }
        .producto-item {
            margin-bottom: 32px;
            font-size: 40px;
        }
        .totales {
            position: absolute;
            bottom: 480px;
            right: 200px;
            text-align: right;
            font-size: 44px;
        }
        .pagos {
            position: absolute;
            bottom: 320px;
            left: 200px;
            font-size: 40px;
        }
        .saldo {
            position: absolute;
            bottom: 160px;
            right: 200px;
            font-size: 44px;
            font-weight: bold;
            color: red;
        }
    </style>
</head>
<body>
    <button class="print-button" onclick="imprimirSinFondo()">
        🖨️ Imprimir Orden
    </button>
    
    <div class="content" style="margin: 40px auto 0; position: relative; transform: scale(${scale}); transform-origin: top center;">
        <div class="fecha">
            ${formatDate(orderData.date)}
        </div>
        
        <div class="cliente">
            ${orderData.client?.name || 'Cliente no especificado'}
        </div>
        
        <div class="productos">
            ${productsData.map((product, index) => `
                <div class="producto-item">
                    ${index + 1}. ${product.product_name || product.template_name || 'Producto'} 
                    - Cant: ${product.quantity} 
                    - $${product.total_price.toFixed(2)}
                </div>
            `).join('')}
        </div>
        
        <div class="totales">
            <div>Subtotal: $${calculateSubtotal().toFixed(2)}</div>
            <div style="font-weight: bold; margin-top: 5px;">
                Total: $${orderData.total.toFixed(2)}
            </div>
        </div>
        
        ${paymentsData.length > 0 ? `
        <div class="pagos">
            <strong>Pagos realizados:</strong><br>
            ${paymentsData.map(payment => `
                $${payment.amount.toFixed(2)} - ${new Date(payment.date).toLocaleDateString()}
            `).join('<br>')}
            <br><strong>Total pagado: $${totalPagos.toFixed(2)}</strong>
        </div>
        ` : ''}
        
        ${saldoPendiente > 0 ? `
        <div class="saldo">
            Saldo pendiente: $${saldoPendiente.toFixed(2)}
        </div>
        ` : ''}
    </div>

    <script>
        function imprimirSinFondo() {
            // Crear nuevo HTML sin la imagen de fondo para impresión
            const htmlSinFondo = \`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orden #${orderData.id}</title>
    <style>
        @page {
        size: 1600px 1324px;
        margin: 0;
        }
        * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        }
        body {
        color: #000;
        font-family: Arial, sans-serif;
        font-size: 12px;
        line-height: 1.4;
        width: 1600px;
            height: 1324px;
        }
        .content {
            width: 1600px;
            height: 1324px;
        position: relative;
        padding: 0;
        margin: 0;
        }
        .fecha {
            position: absolute;
            top: 320px;
        right: 200px;
        font-size: 44px;
        font-weight: bold;
        }
        .cliente {
            position: absolute;
            top: 480px;
        left: 200px;
        font-size: 44px;
        font-weight: bold;
        }
        .productos {
            position: absolute;
        top: 720px;
        left: 80px;
            right: 80px;
        }
        .producto-item {
        margin-bottom: 32px;
        font-size: 40px;
        }
        .totales {
            position: absolute;
            bottom: 480px;
        right: 200px;
        text-align: right;
        font-size: 44px;
        }
        .pagos {
            position: absolute;
        bottom: 320px;
        left: 200px;
        font-size: 40px;
        }
        .saldo {
        position: absolute;
            bottom: 160px;
                            right: 200px;
                            font-size: 44px;
                            font-weight: bold;
                            color: red;
                        }
    </style>
</head>
<body>
    <div class="content">
        <div class="fecha">
            ${formatDate(orderData.date)}
        </div>
        
        <div class="cliente">
            ${orderData.client?.name || 'Cliente no especificado'}
        </div>
        
        <div class="productos">
            ${productsData.map((product, index) => `
                <div class="producto-item">
                    ${index + 1}. ${product.product_name || product.template_name || 'Producto'} 
                    - Cant: ${product.quantity} 
                    - $${product.total_price.toFixed(2)}
                </div>
            `).join('')}
        </div>
        
        <div class="totales">
            <div>Subtotal: $${calculateSubtotal().toFixed(2)}</div>
            <div style="font-weight: bold; margin-top: 5px;">
                Total: $${orderData.total.toFixed(2)}
            </div>
        </div>
        
        ${paymentsData.length > 0 ? `
        <div class="pagos">
            <strong>Pagos realizados:</strong><br>
            ${paymentsData.map(payment => `
                $${payment.amount.toFixed(2)} - ${new Date(payment.date).toLocaleDateString()}
            `).join('<br>')}
            <br><strong>Total pagado: $${totalPagos.toFixed(2)}</strong>
        </div>
        ` : ''}
        
        ${saldoPendiente > 0 ? `
        <div class="saldo">
            Saldo pendiente: $${saldoPendiente.toFixed(2)}
        </div>
        ` : ''}
    </div>
</body>
</html>
            \`;

            // Crear ventana de impresión
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            
            if (!printWindow) {
                alert('No se pudo abrir la ventana de impresión. Verifica que no esté bloqueada por el navegador.');
                return;
            }
            
            printWindow.document.write(htmlSinFondo);
            printWindow.document.close();
            
            // Configurar impresión automática
            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    printWindow.onafterprint = () => {
                        printWindow.close();
                    };
                }, 500);
            };
        }
    </script>
</body>
</html>`;
};

// Función para generar HTML sin fondo (solo para impresión directa)
export const generatePrintOnlyHTML = (orderData: any, productsData: any[], paymentsData: any[]) => {
	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		const day = date.getDate().toString().padStart(2, '0');
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const year = date.getFullYear().toString();

		return `${day} &nbsp;&nbsp; ${month} &nbsp;&nbsp; ${year}`;
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
            size: 1600px 1324px;
            margin: 0;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            color: #000;
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            width: 1600px;
            height: 1324px;
        }
        .content {
            width: 1600px;
            height: 1324px;
            position: relative;
            padding: 0;
            margin: 0;
        }
        .fecha {
            position: absolute;
            top: 320px;
            right: 200px;
            font-size: 44px;
            font-weight: bold;
        }
        .cliente {
            position: absolute;
            top: 480px;
            left: 200px;
            font-size: 44px;
            font-weight: bold;
        }
        .productos {
            position: absolute;
            top: 720px;
            left: 80px;
            right: 80px;
        }
        .producto-item {
            margin-bottom: 32px;
            font-size: 40px;
        }
        .totales {
            position: absolute;
            bottom: 480px;
            right: 200px;
            text-align: right;
            font-size: 44px;
        }
        .pagos {
            position: absolute;
            bottom: 320px;
            left: 200px;
            font-size: 40px;
        }
        .saldo {
            position: absolute;
            bottom: 160px;
            right: 200px;
            font-size: 44px;
            font-weight: bold;
            color: red;
        }
    </style>
</head>
<body>
    <div class="content">
        <div class="fecha">
            ${formatDate(orderData.date)}
        </div>
        
        <div class="cliente">
            ${orderData.client?.name || 'Cliente no especificado'}
        </div>
        
        <div class="productos">
            ${productsData.map((product, index) => `
                <div class="producto-item">
                    ${index + 1}. ${product.product_name || product.template_name || 'Producto'} 
                    - Cant: ${product.quantity} 
                    - $${product.total_price.toFixed(2)}
                </div>
            `).join('')}
        </div>
        
        <div class="totales">
            <div>Subtotal: $${calculateSubtotal().toFixed(2)}</div>
            <div style="font-weight: bold; margin-top: 5px;">
                Total: $${orderData.total.toFixed(2)}
            </div>
        </div>
        
        ${paymentsData.length > 0 ? `
        <div class="pagos">
            <strong>Pagos realizados:</strong><br>
            ${paymentsData.map(payment => `
                $${payment.amount.toFixed(2)} - ${new Date(payment.date).toLocaleDateString()}
            `).join('<br>')}
            <br><strong>Total pagado: $${totalPagos.toFixed(2)}</strong>
        </div>
        ` : ''}
        
        ${saldoPendiente > 0 ? `
        <div class="saldo">
            Saldo pendiente: $${saldoPendiente.toFixed(2)}
        </div>
        ` : ''}
    </div>
</body>
</html>`;
};

// Función principal para manejar la impresión con previsualización
export const handlePrintWithPreview = (orderData: any, productsData: any[], paymentsData: any[]) => {
if (!orderData || !productsData) {
toast.error('No hay datos para imprimir');
return;
}

try {
// Calcular el tamaño de la ventana basado en el tamaño real de la nota
// Nota: 1600px x 1324px
// Pero limitamos el tamaño de la ventana para que sea manejable en pantalla
const noteWidth = 1600;
const noteHeight = 1324;

// Calculamos un factor de escala para que quepa en pantalla
    const maxScreenWidth = window.screen.width * 0.9; // 90% del ancho de pantalla
    const maxScreenHeight = window.screen.height * 0.9; // 90% del alto de pantalla
    
    const scaleX = maxScreenWidth / noteWidth;
    const scaleY = maxScreenHeight / noteHeight;
    const scale = Math.min(scaleX, scaleY, 1); // No agrandar, solo reducir si es necesario
    
    const windowWidth = Math.round(noteWidth * scale) + 40; // margen para bordes
    const windowHeight = Math.round(noteHeight * scale) + 80; // margen para botón y barra

// Generar el HTML de previsualización con imagen de fondo
const previewHTML = generatePreviewHTML(orderData, productsData, paymentsData, scale);

// Centrar la ventana en la pantalla
const screenWidth = window.screen.width;
const screenHeight = window.screen.height;
const left = Math.round((screenWidth - windowWidth) / 2);
const top = Math.round((screenHeight - windowHeight) / 2);

// Crear ventana de previsualización con tamaño exacto de la nota
  const previewWindow = window.open(
  '', 
  '_blank', 
    `width=${windowWidth},height=${windowHeight},left=${left},top=${top},scrollbars=no,resizable=yes,menubar=no,toolbar=no,location=no,status=no`
    );
    
    if (!previewWindow) {
      toast.error('No se pudo abrir la ventana de previsualización. Verifica que no esté bloqueada por el navegador.');
      return;
    }
    
    // Escribir el HTML en la ventana de previsualización
    previewWindow.document.write(previewHTML);
    previewWindow.document.close();
    
    // Enfocar la ventana de previsualización
    previewWindow.focus();
    
  } catch (error) {
    console.error('Error al generar previsualización:', error);
    toast.error('Error al generar la previsualización de impresión');
  }
};

// Función para impresión directa sin previsualización (para casos especiales)
export const handleDirectPrint = (orderData: any, productsData: any[], paymentsData: any[]) => {
	if (!orderData || !productsData) {
		toast.error('No hay datos para imprimir');
		return;
	}

	try {
		// Generar el HTML sin fondo para impresión directa
		const printHTML = generatePrintOnlyHTML(orderData, productsData, paymentsData);

		// Crear ventana de impresión oculta
		const printWindow = window.open('', '_blank', 'width=1,height=1,left=-1000,top=-1000');

		if (!printWindow) {
			toast.error('No se pudo abrir la ventana de impresión. Verifica que no esté bloqueada por el navegador.');
			return;
		}

		// Escribir el HTML en la ventana
		printWindow.document.write(printHTML);
		printWindow.document.close();

		// Configurar impresión automática
		printWindow.onload = () => {
			setTimeout(() => {
				printWindow.focus();
				printWindow.print();
				printWindow.onafterprint = () => {
					printWindow.close();
				};
			}, 100);
		};

	} catch (error) {
		console.error('Error al generar impresión:', error);
		toast.error('Error al generar el documento de impresión');
	}
};