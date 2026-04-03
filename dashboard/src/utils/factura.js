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

    const anchoPapel = config.ancho_papel === '58' ? '58' : config.ancho_papel === '76' ? '76' : '80'
    const W = anchoPapel === '58' ? 32 : anchoPapel === '76' ? 40 : 42
    const anchoCss = anchoPapel + 'mm'

    const fecha = new Date().toLocaleString('es-PY', { timeZone: 'America/Asuncion', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

    const totalGrav10      = items.filter(i => i.iva === 10).reduce((s, i) => s + i.total, 0)
    const totalGrav5       = items.filter(i => i.iva === 5).reduce((s, i) => s + i.total, 0)
    const totalExenta      = items.filter(i => !i.iva || i.iva === 0).reduce((s, i) => s + i.total, 0)
    const liquidacionIva10 = Math.floor(totalGrav10 / 11)
    const liquidacionIva5  = Math.floor(totalGrav5 / 21)
    const totalIva         = liquidacionIva10 + liquidacionIva5

    const formatGs = n => parseInt(n || 0).toLocaleString('es-PY')

    const vigenciaInicio = config.timbrado_inicio ? new Date(config.timbrado_inicio).toLocaleDateString('es-PY') : '--'
    const vigenciaFin    = config.timbrado_fin    ? new Date(config.timbrado_fin).toLocaleDateString('es-PY')    : '--'

    const SEP  = '-'.repeat(W)
    const SEP2 = '='.repeat(W)

    const c = str => {
        str = String(str).substring(0, W)
        const pad = Math.max(0, Math.floor((W - str.length) / 2))
        return ' '.repeat(pad) + str
    }
    const lr = (izq, der) => {
        izq = String(izq); der = String(der)
        const sp = W - izq.length - der.length
        if (sp <= 0) return (izq + ' ' + der).substring(0, W)
        return izq + ' '.repeat(sp) + der
    }
    const wrap = (str, width) => {
        str = String(str)
        const lines = []
        while (str.length > width) { lines.push(str.substring(0, width)); str = str.substring(width) }
        if (str) lines.push(str)
        return lines
    }

    const CANT_W  = 4
    const IVA_W   = 4
    const TOTAL_W = 9
    const DESC_W  = W - CANT_W - 1 - 1 - TOTAL_W - 1 - IVA_W

    const itemLinea = item => {
        const cant  = String(item.cantidad).padStart(CANT_W)
        const ivaS  = (item.iva ? item.iva + '%' : 'EX').padStart(IVA_W)
        const totS  = formatGs(item.total).padStart(TOTAL_W)
        const lines = wrap(String(item.descripcion), DESC_W)
        const primera = `${cant} ${lines[0].padEnd(DESC_W)} ${totS} ${ivaS}`
        const resto   = lines.slice(1).map(l => ' '.repeat(CANT_W + 1) + l)
        return [primera, ...resto].join('\n')
    }

    const lineas = []
    const add = (...ls) => ls.forEach(l => lineas.push(l))

    if (es_prueba) { add(SEP2, c('*** FACTURA DE PRUEBA ***'), SEP2) }

    if (config.nombre_fantasia) add(c(config.nombre_fantasia))
    add(c(config.nombre_empresa || 'EMPRESA'))
    add(c('RUC: ' + (config.ruc_empresa || '--')))
    if (config.actividad_economica) add(c(config.actividad_economica))
    if (config.direccion_matriz)    add(c(config.direccion_matriz))
    if (config.direccion_sucursal)  add(c('Suc: ' + config.direccion_sucursal))
    if (config.telefonos)           add(c('Tel: ' + config.telefonos))
    if (config.correo)              add(c(config.correo))

    add(SEP2)
    add(c('TIMBRADO Nro ' + (config.timbrado || '--')))
    add(c('Vigente: ' + vigenciaInicio + ' al ' + vigenciaFin))
    add(SEP)
    add(c('FACTURA Nro ' + numero_factura))
    add(lr('Condicion: ' + (tipo_venta === 'credito' ? 'CREDITO' : 'CONTADO'), fecha))
    add(SEP)

    const clienteStr  = String(cliente_nombre || config.cliente_ocasional || 'CONSUMIDOR FINAL')
    const clienteLines = wrap(clienteStr, W - 9)
    add('CLIENTE: ' + clienteLines[0])
    clienteLines.slice(1).forEach(l => add('         ' + l))
    add('RUC/CI:  ' + (cliente_ruc || '--'))
    add(SEP)

    add(lr('CANT DESCRIPCION' + ' '.repeat(Math.max(0, DESC_W - 11)), 'TOTAL     IVA'))
    add(SEP)
    items.forEach(item => add(itemLinea(item)))
    add(SEP2)

    add(lr('TOTAL A PAGAR (Gs.):', formatGs(total)))
    add(c(numeroALetras(parseInt(total)) + ' Gs.'))
    add(SEP)
    add(lr('Total gravado 10%:', formatGs(totalGrav10)))
    add(lr('Total gravado 5%:', formatGs(totalGrav5)))
    add(lr('Total exenta:', formatGs(totalExenta)))
    add(SEP)
    add('Liquidacion del IVA:')
    add(lr('IVA 10%:', formatGs(liquidacionIva10)))
    add(lr('IVA 5%:', formatGs(liquidacionIva5)))
    add(lr('TOTAL IVA:', formatGs(totalIva)))
    add(SEP)

    add('Metodo de pago:')
    if (metodo_pago === 'efectivo') {
        add(lr('Efectivo:', formatGs(monto_efectivo)))
        if (vuelto > 0) add(lr('Vuelto:', formatGs(vuelto)))
    } else {
        const label = metodo_pago === 'transferencia' ? 'Transferencia'
            : metodo_pago === 'tarjeta_debito'  ? 'Tarjeta Debito'
            : metodo_pago === 'tarjeta_credito' ? 'Tarjeta Credito'
            : metodo_pago
        add(lr(label + ':', formatGs(total)))
    }

    add(SEP)
    add(lr('Atendido por:', cajero || '--'))

    if (config.mensaje_pie) {
        add(SEP)
        wrap(config.mensaje_pie, W).forEach(l => add(c(l)))
    }

    add(SEP2)
    add(lr('ORIGINAL: CLIENTE', 'DUPLIC: ARCHIVO'))

    if (es_prueba) { add(SEP2, c('*** FACTURA DE PRUEBA ***'), SEP2) }

    const ticket = lineas.join('\n').normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Factura ${numero_factura}</title>
<style>
  * { margin: 0; padding: 0; }
  body { background: #fff; }
  pre {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    line-height: 1.25;
    white-space: pre;
    color: #000;
    padding: 2mm;
  }
  @media print {
    @page { size: ${anchoCss} auto; margin: 0; }
    pre { padding: 1mm; }
  }
</style>
</head>
<body><pre>${ticket}</pre></body>
</html>`

    const blob = new Blob([html], { type: 'text/html; charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const ventana = window.open(url, '_blank', 'width=420,height=700')
    ventana.onload = () => { ventana.print(); URL.revokeObjectURL(url) }
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
    hr { border: none; margin: 6px 0; }
    hr.sep  { border-top: 1px dashed #000; }
    hr.seps { border-top: 1px solid  #000; }
    .fila { display: table; width: 100%; margin: 3px 0; }
    .fila span:first-child { display: table-cell; }
    .fila span:last-child  { display: table-cell; text-align: right; }
    .total { font-weight: bold; font-size: 13px; }
    @media print { body { width: 80mm; } @page { margin: 0; size: 80mm auto; } }
</style></head>
<body>
<div class="center bold" style="font-size:14px;">${config.nombre_fantasia || config.nombre_empresa || 'EMPRESA'}</div>
${config.nombre_fantasia ? `<div class="center" style="font-size:11px;">de ${config.nombre_empresa || ''}</div>` : ''}
<div class="center" style="font-size:10px;">RUC: ${config.ruc_empresa || '—'}</div>
<hr class="seps">
<div class="center bold" style="font-size:13px;">CIERRE DE CAJA</div>
<div class="center" style="font-size:10px;">Fecha: ${fechaCierre}</div>
<div class="center" style="font-size:10px;">Impreso: ${fecha}</div>
${cajero ? `<div class="center" style="font-size:10px;">Cajero: ${cajero}</div>` : ''}
<hr class="sep">
<div class="bold" style="margin-bottom:4px;">VENTAS POR MÉTODO DE PAGO</div>
${Object.entries(cierreDatos?.resumen || {}).map(([k, v]) => {
    const label = v.metodo === 'tarjeta' ? `Tarjeta ${v.subtipo === 'debito' ? 'Débito' : 'Crédito'}` : v.metodo === 'transferencia' ? 'Transferencia' : 'Efectivo'
    return `<div class="fila"><span>${label} (${v.cantidad})</span><span>Gs. ${formatGs(v.total)}</span></div>`
}).join('')}
<hr class="sep">
<div class="fila total"><span>TOTAL VENTAS (${cierreDatos?.cantidadVentas || 0})</span><span>Gs. ${formatGs(cierreDatos?.totalGeneral)}</span></div>
<hr class="sep">
<div class="bold" style="margin-bottom:4px;">VENTAS POR CANAL</div>
${Object.entries(cierreDatos?.canales || {}).map(([canal, v]) =>
    `<div class="fila"><span>${canal} (${v.cantidad})</span><span>Gs. ${formatGs(v.total)}</span></div>`
).join('')}
${gastos.length > 0 ? `
<hr class="sep">
<div class="bold" style="margin-bottom:4px;">GASTOS Y EGRESOS</div>
${gastos.map(g => `<div class="fila"><span>${g.descripcion}</span><span>Gs. ${formatGs(g.monto)}</span></div>`).join('')}
<hr class="sep">
<div class="fila total"><span>TOTAL GASTOS</span><span>Gs. ${formatGs(totalGastos)}</span></div>
` : ''}
<hr class="seps">
<div class="fila"><span>Total ventas</span><span>Gs. ${formatGs(cierreDatos?.totalGeneral)}</span></div>
${gastos.length > 0 ? `<div class="fila"><span>Total gastos</span><span>- Gs. ${formatGs(totalGastos)}</span></div>` : ''}
<hr class="sep">
<div class="fila total" style="font-size:13px;"><span>NETO DEL DÍA</span><span>Gs. ${formatGs(neto)}</span></div>
<hr class="seps">
<div class="center" style="font-size:10px; margin-top:4px;">— Fin del cierre —</div>
</body></html>`

    const blob = new Blob([html], { type: 'text/html; charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const ventana = window.open(url, '_blank', 'width=420,height=700')
    ventana.onload = () => { ventana.print(); URL.revokeObjectURL(url) }
}