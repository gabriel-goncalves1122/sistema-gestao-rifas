const fs = require('fs');
const env = fs.readFileSync(__dirname + '/../.env', 'utf8');
env.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) {
    process.env[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '');
  }
});
process.env.API_PUBLIC_BASE_URL = "https://rifasaderidos2026.web.app/api";

const { MercadoPagoPixClient } = require('../lib/shared/services/mercadoPagoPixClient');

async function testar() {
  try {
    const res = await MercadoPagoPixClient.criarPedidoPix({
      referenceId: "test-ref",
      nome: "Teste",
      telefone: "11999999999",
      email: "teste@teste.com",
      documento: "14025086683", // CPF invalido matematicamente
      numerosRifas: ["001"],
      valorCentavos: 1000,
      expirationDate: new Date(Date.now() + 30 * 60000).toISOString(),
    });
    console.log("Sucesso:", res.id);
  } catch (err) {
    console.log("Erro lançado:", err.message);
  }
}

testar();
