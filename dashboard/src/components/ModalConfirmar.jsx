function ModalConfirmar({ titulo, mensaje, onConfirmar, onCancelar, colorBoton = '#ef4444', textoBoton = 'Confirmar' }) {
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '380px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>{titulo}</h3>
                <p style={{ fontSize: '13px', color: '#555', marginBottom: '20px', lineHeight: '1.6' }}>{mensaje}</p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onCancelar}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '13px' }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirmar}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: colorBoton, color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                    >
                        {textoBoton}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ModalConfirmar