import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ID = "rifasaderidos2026";
const API_BASE_URL = `http://127.0.0.1:5001/${PROJECT_ID}/southamerica-east1/api`;
const AUTH_EMULATOR_URL = "http://127.0.0.1:9099";
const COMPRADOR_NOME = "Cliente E2E Pix";
const COMPRADOR_EMAIL = "comprador.e2e.pix@example.com";
const COMPRADOR_TELEFONE_DIGITOS = "35999990000";
const COMPRADOR_TELEFONE_FORMATADO = "(35) 99999-0000";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const comprovantePath = path.resolve(
  __dirname,
  "../fixtures/comprovante-pix-e2e.pdf",
);

function obterCredenciaisGlobais() {
  const email = process.env.E2E_GLOBAL_EMAIL?.trim().toLowerCase();
  const password = process.env.E2E_GLOBAL_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Defina E2E_GLOBAL_EMAIL e E2E_GLOBAL_PASSWORD para rodar o E2E de tesouraria.",
    );
  }

  return { email, password };
}

async function obterToken(
  request: APIRequestContext,
  email: string,
  password: string,
) {
  const response = await request.post(
    `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-api-key`,
    {
      data: {
        email,
        password,
        returnSecureToken: true,
      },
    },
  );

  expect(response.ok()).toBeTruthy();

  const body = (await response.json()) as { idToken?: string };

  expect(body.idToken).toBeTruthy();

  return body.idToken as string;
}

async function getApi(
  request: APIRequestContext,
  endpoint: string,
  token: string,
) {
  const response = await request.get(`${API_BASE_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(response.ok()).toBeTruthy();

  return response.json();
}

async function selecionarTresRifasDisponiveis(page: Page) {
  const rifasDisponiveis = page.getByRole("button", {
    name: /Rifa .* - Disponível/,
  });

  await expect(rifasDisponiveis.first()).toBeVisible({
    timeout: 20_000,
  });

  const quantidadeDisponivel = await rifasDisponiveis.count();

  expect(
    quantidadeDisponivel,
    `O E2E precisa de pelo menos 3 rifas disponíveis visíveis para a conta logada. Encontradas: ${quantidadeDisponivel}.`,
  ).toBeGreaterThanOrEqual(3);

  const numerosSelecionados: string[] = [];

  for (let index = 0; index < 3; index += 1) {
    const rifa = rifasDisponiveis.nth(index);
    const numero = (await rifa.textContent())?.trim();

    expect(numero, `Nao foi possivel ler o numero da rifa no indice ${index}.`).toBeTruthy();

    numerosSelecionados.push(numero as string);
    await rifa.click();
  }

  return numerosSelecionados;
}

test("vende 3 rifas com comprovante e exibe a compra pendente na tesouraria nova", async ({
  page,
  request,
}) => {
  const { email, password } = obterCredenciaisGlobais();
  const chamadasLegacy: string[] = [];

  page.on("request", (requestInfo) => {
    if (requestInfo.url().includes("/auditorias")) {
      chamadasLegacy.push(requestInfo.url());
    }
  });

  await page.goto("/");

  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();

  await expect(page).toHaveURL(/\/dashboard/);
  const numerosRifas = await selecionarTresRifasDisponiveis(page);

  await page.locator('[data-testid="carrinho-pagar"], [data-testid="carrinho-vender"]').click();
  await expect(
    page.getByRole("heading", { name: "Finalizar venda" }),
  ).toBeVisible();

  await page.getByTestId("checkout-nome").fill(COMPRADOR_NOME);
  await page
    .getByTestId("checkout-telefone")
    .fill(COMPRADOR_TELEFONE_DIGITOS);
  await page.getByTestId("checkout-email").fill(COMPRADOR_EMAIL);
  await page
    .getByTestId("checkout-comprovante-input")
    .setInputFiles(comprovantePath);
  await expect(page.getByText("comprovante-pix-e2e.pdf")).toBeVisible();

  await page.getByTestId("checkout-enviar-venda").click();
  await expect(
    page.getByRole("heading", { name: "Finalizar venda" }),
  ).toBeHidden({ timeout: 45_000 });

  const token = await obterToken(request, email, password);
  const transacoesPayload = (await getApi(
    request,
    "/tesouraria/transacoes-bancarias",
    token,
  )) as { transacoes: any[] };

  const transacaoPix = transacoesPayload.transacoes.find((transacao) =>
    numerosRifas.every((numero) =>
      transacao.rifas?.some((rifa: { numero: string }) => rifa.numero === numero),
    ),
  );

  expect(transacaoPix).toBeTruthy();
  expect(transacaoPix.statusPagamento).toBe("WAITING");
  expect(transacaoPix.statusConciliacao).toBe("pendente");
  expect(transacaoPix.valorBruto).toBe(30);
  expect(transacaoPix.valorPago).toBe(0);
  expect(transacaoPix.compradorNome).toBe(COMPRADOR_NOME);
  expect(transacaoPix.compradorEmail).toBe(COMPRADOR_EMAIL);
  expect(transacaoPix.compradorTelefone).toBe(COMPRADOR_TELEFONE_FORMATADO);
  expect(transacaoPix.aderido?.id).toBeTruthy();

  const resumoPayload = (await getApi(
    request,
    "/tesouraria/transacoes-bancarias/resumo",
    token,
  )) as { resumo: { totalPendente: number; quantidadeAguardando: number } };

  expect(resumoPayload.resumo.totalPendente).toBeGreaterThanOrEqual(
    numerosRifas.length * 10,
  );
  expect(resumoPayload.resumo.quantidadeAguardando).toBeGreaterThanOrEqual(1);

  const historicoPayload = (await getApi(request, "/rifas/historico", token)) as {
    historico: any[];
  };
  const historicoE2E = historicoPayload.historico.filter((item) =>
    numerosRifas.includes(item.numero_rifa),
  );

  expect(historicoE2E).toHaveLength(numerosRifas.length);
  expect(historicoE2E.every((item) => item.status === "pendente")).toBe(true);
  expect(historicoE2E.every((item) => item.comprador_nome === COMPRADOR_NOME)).toBe(
    true,
  );
  expect(historicoE2E.every((item) => Boolean(item.comprovante_url))).toBe(true);
  expect(historicoE2E.every((item) => item.vendedor_nome !== "Desconhecido")).toBe(
    true,
  );

  await page.getByTestId("dashboard-menu-button").click();
  await page.getByTestId("dashboard-contexto-tesouraria").click();
  await expect(page.getByRole("heading", { name: /Gestão financeira/ })).toBeVisible();

  await page.getByTestId("pix-tab-transacoes").click();

  let transacaoRow = page
    .getByTestId(/pix-transacao-/)
    .filter({ hasText: COMPRADOR_NOME });

  for (const numero of numerosRifas) {
    transacaoRow = transacaoRow.filter({ hasText: numero });
  }

  await expect(transacaoRow.first()).toBeVisible();
  transacaoRow = transacaoRow.first();
  await expect(transacaoRow).toContainText(COMPRADOR_NOME);
  for (const numero of numerosRifas) {
    await expect(transacaoRow).toContainText(numero);
  }
  await expect(transacaoRow).toContainText(/R\$\s*30,00/);

  await page.getByTestId("dashboard-tab-tesouraria-historico").click();
  await expect(page.getByText("Auditoria de compras")).toBeVisible();

  const compraAuditavel = page
    .getByTestId(/auditoria-compra-/)
    .filter({ hasText: COMPRADOR_NOME })
    .first();

  await expect(compraAuditavel).toBeVisible();
  for (const numero of numerosRifas) {
    await expect(compraAuditavel).toContainText(numero);
  }
  await expect(compraAuditavel).toContainText(/R\$\s*30,00/);
  await expect(compraAuditavel).toContainText("Pendente");

  expect(chamadasLegacy).toEqual([]);
});
