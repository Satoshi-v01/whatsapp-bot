export function numeroALetras(numero) {
    const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE']
    const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
    const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE']
    const centenas = ['', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

    if (numero === 0) return 'CERO'
    if (numero >= 1000000) {
        const mill = Math.floor(numero / 1000000)
        const resto = numero % 1000000
        return (mill === 1 ? 'UN MILLON' : numeroALetras(mill) + ' MILLONES') + (resto > 0 ? ' ' + numeroALetras(resto) : '')
    }
    if (numero >= 1000) {
        const miles = Math.floor(numero / 1000)
        const resto = numero % 1000
        return (miles === 1 ? 'MIL' : numeroALetras(miles) + ' MIL') + (resto > 0 ? ' ' + numeroALetras(resto) : '')
    }
    if (numero >= 100) {
        const c = Math.floor(numero / 100)
        const resto = numero % 100
        const centena = c === 1 && resto > 0 ? 'CIENTO' : centenas[c]
        return centena + (resto > 0 ? ' ' + numeroALetras(resto) : '')
    }
    if (numero >= 10 && numero <= 19) return especiales[numero - 10]
    if (numero >= 20) {
        const d = Math.floor(numero / 10)
        const u = numero % 10
        return decenas[d] + (u > 0 ? ' Y ' + unidades[u] : '')
    }
    return unidades[numero]
}

export function imprimirFactura(datos) {
    const {
        numero_factura,
        es_prueba = false,
        cliente_nombre,
        cliente_ruc,
        tipo_venta = 'contado',
        metodo_pago,
        monto_efectivo,
        vuelto,
        items = [],
        total,
        cajero,
        config = {}
    } = datos

    const ancho = config.ancho_papel === '58' ? '58mm' : '80mm'
    const fecha = new Date().toLocaleString('es-PY', { timeZone: 'America/Asuncion', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

    // Calcular IVA
    const totalGrav10 = items.filter(i => i.iva === 10).reduce((s, i) => s + i.total, 0)
    const totalGrav5 = items.filter(i => i.iva === 5).reduce((s, i) => s + i.total, 0)
    const totalExenta = items.filter(i => !i.iva || i.iva === 0).reduce((s, i) => s + i.total, 0)
    const liquidacionIva10 = Math.floor(totalGrav10 / 11)
    const liquidacionIva5 = Math.floor(totalGrav5 / 21)
    const totalIva = liquidacionIva10 + liquidacionIva5

    const formatGs = n => parseInt(n || 0).toLocaleString('es-PY')

    const vigenciaInicio = config.timbrado_inicio
        ? new Date(config.timbrado_inicio).toLocaleDateString('es-PY')
        : '—'
    const vigenciaFin = config.timbrado_fin
        ? new Date(config.timbrado_fin).toLocaleDateString('es-PY')
        : '—'

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Factura ${numero_factura}</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: 'Courier New', monospace;
        font-size: 11px;
        width: ${ancho};
        margin: 0 auto;
        padding: 4px;
        color: #000;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .separador { border-top: 1px dashed #000; margin: 6px 0; }
    .separador-solido { border-top: 1px solid #000; margin: 6px 0; }
    .fila { display: flex; justify-content: space-between; margin: 2px 0; }
    .fila-3 { display: grid; grid-template-columns: 1fr 2fr 1fr; margin: 2px 0; gap: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { text-align: left; font-weight: bold; border-bottom: 1px solid #000; padding: 2px 0; }
    td { padding: 2px 0; vertical-align: top; }
    .th-right, .td-right { text-align: right; }
    .prueba { text-align: center; font-size: 14px; font-weight: bold; letter-spacing: 3px; border: 2px dashed #000; padding: 4px; margin: 6px 0; }
    @media print {
        body { width: ${ancho}; }
        @page { margin: 0; size: ${ancho} auto; }
    }
</style>
</head>
<body>

${es_prueba ? '<div class="prueba">*** FACTURA DE PRUEBA ***</div>' : ''}

<!-- ENCABEZADO -->
${config.nombre_fantasia ? `<div class="center bold" style="font-size:14px; margin-bottom:1px;">${config.nombre_fantasia}</div>` : ''}
<div class="center bold" style="font-size:${config.nombre_fantasia ? '11' : '13'}px; margin-bottom:2px;">${config.nombre_empresa || 'EMPRESA'}</div>
<div class="center" style="font-size:10px;">RUC: ${config.ruc_empresa || '—'}</div>
<div class="center" style="font-size:10px;">${config.actividad_economica || ''}</div>
${config.direccion_matriz ? `<div class="center" style="font-size:10px;">${config.direccion_matriz}</div>` : ''}
${config.direccion_sucursal ? `<div class="center" style="font-size:10px;">Suc: ${config.direccion_sucursal}</div>` : ''}
${config.telefonos ? `<div class="center" style="font-size:10px;">Tel: ${config.telefonos}</div>` : ''}


<div class="separador-solido"></div>

<div class="center bold">TIMBRADO N° ${config.timbrado || '—'}</div>
<div class="center" style="font-size:10px;">Vigente del ${vigenciaInicio} al ${vigenciaFin}</div>

<div class="separador"></div>

<div class="center bold" style="font-size:12px;">FACTURA N° ${numero_factura}</div>
<div class="fila">
    <span>Condición: <b>${tipo_venta === 'credito' ? 'CRÉDITO' : 'CONTADO'}</b></span>
    <span>${fecha}</span>
</div>

<div class="separador"></div>

<!-- CLIENTE -->
<div class="fila">
    <span>CLIENTE:</span>
    <span class="bold">${cliente_nombre || config.cliente_ocasional || 'CONSUMIDOR FINAL'}</span>
</div>
<div class="fila">
    <span>RUC/CI:</span>
    <span>${cliente_ruc || '—'}</span>
</div>

<div class="separador"></div>

<!-- DETALLE PRODUCTOS -->
<table>
    <thead>
        <tr>
            <th>Cant.</th>
            <th>Descripción</th>
            <th class="th-right">P.Unit</th>
            <th class="th-right">Total</th>
            <th class="th-right">IVA</th>
        </tr>
    </thead>
    <tbody>
        ${items.map(item => `
        <tr>
            <td>${item.cantidad}</td>
            <td>${item.descripcion}</td>
            <td class="td-right">${formatGs(item.precio_unitario)}</td>
            <td class="td-right">${formatGs(item.total)}</td>
            <td class="td-right">${item.iva ? item.iva + '%' : 'EX'}</td>
        </tr>
        `).join('')}
    </tbody>
</table>

<div class="separador-solido"></div>

<!-- TOTAL -->
<div class="fila bold" style="font-size:13px;">
    <span>TOTAL A PAGAR (Gs.)</span>
    <span>${formatGs(total)}</span>
</div>
<div class="center" style="font-size:10px; margin: 3px 0; font-style: italic;">
    ${numeroALetras(parseInt(total))} GUARANÍES
</div>

<div class="separador"></div>

<!-- GRAVÁMENES -->
<div class="fila"><span>Total gravado 10%:</span><span>${formatGs(totalGrav10)}</span></div>
<div class="fila"><span>Total gravado 5%:</span><span>${formatGs(totalGrav5)}</span></div>
<div class="fila"><span>Total exenta:</span><span>${formatGs(totalExenta)}</span></div>

<div class="separador"></div>

<!-- LIQUIDACIÓN IVA -->
<div class="bold" style="margin-bottom:2px;">Liquidación del IVA:</div>
<div class="fila"><span>IVA 10%:</span><span>${formatGs(liquidacionIva10)}</span></div>
<div class="fila"><span>IVA 5%:</span><span>${formatGs(liquidacionIva5)}</span></div>
<div class="fila"><span>TOTAL IVA:</span><span>${formatGs(totalIva)}</span></div>

<div class="separador"></div>

<!-- MÉTODO DE PAGO -->
<div class="bold">Método de pago:</div>
${metodo_pago === 'efectivo' ? `
<div class="fila"><span>Efectivo:</span><span>${formatGs(monto_efectivo)}</span></div>
${vuelto > 0 ? `<div class="fila"><span>Vuelto:</span><span>${formatGs(vuelto)}</span></div>` : ''}
` : `<div class="fila"><span>${metodo_pago === 'transferencia' ? 'Transferencia' : metodo_pago === 'tarjeta_debito' ? 'Tarjeta Débito' : metodo_pago === 'tarjeta_credito' ? 'Tarjeta Crédito' : metodo_pago}</span><span>${formatGs(total)}</span></div>`}

<div class="separador"></div>

<!-- CAJERO -->
<div class="fila"><span>Atendido por:</span><span>${cajero || '—'}</span></div>

${config.mensaje_pie ? `
<div class="separador"></div>
<div class="center" style="font-size:10px; font-style:italic;">${config.mensaje_pie}</div>
` : ''}

<div class="separador-solido"></div>
<div class="fila" style="font-size:10px;">
    <span>ORIGINAL: CLIENTE</span>
    <span>DUPLICADO: ARCHIVO</span>
</div>

${es_prueba ? '<div class="prueba">*** FACTURA DE PRUEBA ***</div>' : ''}

</body>
</html>`

    const ventana = window.open('', '_blank', 'width=400,height=600')
    ventana.document.write(html)
    ventana.document.close()
    setTimeout(() => ventana.print(), 500)
}

export function imprimirCierre({ cierreDatos, gastos, fechaCierre, cajero, config }) {
    const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0)
    const neto = (cierreDatos?.totalGeneral || 0) - totalGastos
    const formatGs = n => parseInt(n || 0).toLocaleString('es-PY')
    const fecha = new Date().toLocaleString('es-PY', { timeZone: 'America/Asuncion' })

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Cierre de Caja</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 11px; width: 80mm; margin: 0 auto; padding: 4px; color: #000; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .separador { border-top: 1px dashed #000; margin: 6px 0; }
    .separador-solido { border-top: 1px solid #000; margin: 6px 0; }
    .fila { display: flex; justify-content: space-between; margin: 3px 0; }
    .total { font-weight: bold; font-size: 13px; }
    @media print { body { width: 80mm; } @page { margin: 0; size: 80mm auto; } }
</style></head>
<body>
<div class="center bold" style="font-size:14px;">${config.nombre_fantasia || config.nombre_empresa || 'EMPRESA'}</div>
${config.nombre_fantasia ? `<div class="center" style="font-size:11px;">de ${config.nombre_empresa || ''}</div>` : ''}
<div class="center" style="font-size:10px;">RUC: ${config.ruc_empresa || '—'}</div>
<div class="separador-solido"></div>
<div class="center bold" style="font-size:13px;">CIERRE DE CAJA</div>
<div class="center" style="font-size:10px;">Fecha: ${fechaCierre}</div>
<div class="center" style="font-size:10px;">Impreso: ${fecha}</div>
${cajero ? `<div class="center" style="font-size:10px;">Cajero: ${cajero}</div>` : ''}
<div class="separador"></div>
<div class="bold" style="margin-bottom:4px;">VENTAS POR MÉTODO DE PAGO</div>
${Object.entries(cierreDatos?.resumen || {}).map(([k, v]) => {
    const label = v.metodo === 'tarjeta' ? `Tarjeta ${v.subtipo === 'debito' ? 'Débito' : 'Crédito'}` : v.metodo === 'transferencia' ? 'Transferencia' : 'Efectivo'
    return `<div class="fila"><span>${label} (${v.cantidad})</span><span>Gs. ${formatGs(v.total)}</span></div>`
}).join('')}
<div class="separador"></div>
<div class="fila total"><span>TOTAL VENTAS (${cierreDatos?.cantidadVentas || 0})</span><span>Gs. ${formatGs(cierreDatos?.totalGeneral)}</span></div>
<div class="separador"></div>
<div class="bold" style="margin-bottom:4px;">VENTAS POR CANAL</div>
${Object.entries(cierreDatos?.canales || {}).map(([canal, v]) =>
    `<div class="fila"><span>${canal} (${v.cantidad})</span><span>Gs. ${formatGs(v.total)}</span></div>`
).join('')}
${gastos.length > 0 ? `
<div class="separador"></div>
<div class="bold" style="margin-bottom:4px;">GASTOS Y EGRESOS</div>
${gastos.map(g => `<div class="fila"><span>${g.descripcion}</span><span>Gs. ${formatGs(g.monto)}</span></div>`).join('')}
<div class="separador"></div>
<div class="fila total"><span>TOTAL GASTOS</span><span>Gs. ${formatGs(totalGastos)}</span></div>
` : ''}
<div class="separador-solido"></div>
<div class="fila"><span>Total ventas</span><span>Gs. ${formatGs(cierreDatos?.totalGeneral)}</span></div>
${gastos.length > 0 ? `<div class="fila"><span>Total gastos</span><span>- Gs. ${formatGs(totalGastos)}</span></div>` : ''}
<div class="separador"></div>
<div class="fila total" style="font-size:13px;"><span>NETO DEL DÍA</span><span>Gs. ${formatGs(neto)}</span></div>
<div class="separador-solido"></div>
<div class="center" style="font-size:10px; margin-top:4px;">— Fin del cierre —</div>
</body></html>`

    const ventana = window.open('', '_blank', 'width=400,height=600')
    ventana.document.write(html)
    ventana.document.close()
    setTimeout(() => ventana.print(), 500)
}