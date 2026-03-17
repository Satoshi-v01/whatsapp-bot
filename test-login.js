const bcrypt = require('bcrypt')

async function main() {
    const hash = '$2b$10$kgYD2s9CDKyZs4LGhkxJiOdQE77j28orCzwX3AE6CAp8hKelPL/NK'
    const resultado = await bcrypt.compare('admin123', hash)
    console.log('Resultado:', resultado)
}

main()