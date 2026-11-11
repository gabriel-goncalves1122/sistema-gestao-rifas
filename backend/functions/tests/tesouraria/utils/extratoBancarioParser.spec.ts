import {
  normalizarValorMonetario,
  normalizarIdentificadorPix,
  extrairEndToEndId,
  extrairTxidDeTexto,
  parsearExtratoCsv,
  parsearExtratoOfx,
  parsearExtratoBancario,
} from "../../../src/modules/tesouraria/utils/extratoBancarioParser";

describe("extratoBancarioParser", () => {
  describe("normalizarValorMonetario", () => {
    it("deve converter formatos em reais comuns para número", () => {
      expect(normalizarValorMonetario("20,00")).toBe(20);
      expect(normalizarValorMonetario("R$ 20,50")).toBe(20.5);
      expect(normalizarValorMonetario("1.250,75")).toBe(1250.75);
      expect(normalizarValorMonetario(50)).toBe(50);
      expect(normalizarValorMonetario("invalid")).toBe(0);
      expect(normalizarValorMonetario("")).toBe(0);
    });
  });

  describe("normalizarIdentificadorPix", () => {
    it("deve limpar espaços e caracteres especiais mantendo em caixa alta", () => {
      expect(normalizarIdentificadorPix("  rifa_12345  ")).toBe("RIFA12345");
      expect(normalizarIdentificadorPix(null)).toBeUndefined();
    });
  });

  describe("extrairEndToEndId", () => {
    it("deve encontrar e extrair E2E válido de 32 caracteres", () => {
      const e2e = "E1823612020261110123456789012345";
      const texto = `Pagamento recebido ${e2e} no Pix`;
      expect(extrairEndToEndId(texto)).toBe(e2e);
    });

    it("deve retornar undefined se não houver E2E", () => {
      expect(extrairEndToEndId("Texto sem identificador bancario")).toBeUndefined();
    });
  });

  describe("extrairTxidDeTexto", () => {
    it("deve extrair txid iniciado por RIFA", () => {
      const texto = "Transferencia referente a rifas - RIFAC8F2A1B9E3D4 efetuada";
      expect(extrairTxidDeTexto(texto)).toBe("RIFAC8F2A1B9E3D4");
    });
  });

  describe("parsearExtratoCsv", () => {
    it("deve fazer parse do CSV da InfinitePay com cabeçalhos padrão", () => {
      const csv = `Data,Origem - Nome,Origem - CPF/CNPJ,Valor,Identificador,ID Transação (E2E)
10/11/2026 14:30,PEDRO HENRIQUE,***.123.456-**,20.00,RIFAC8F2A1B9E3D4,E1823612020261110123456789012345
10/11/2026 15:00,FABIANA MENEGATTI,***.999.888-**,40.00,RIFA77A88B99C001,E1823612020261110999999999012345
10/11/2026 16:00,SAIDA DESCONHECIDA,***.000.000-**,-15.00,RIFA000000000000,
`;
      const transacoes = parsearExtratoCsv(csv);
      expect(transacoes).toHaveLength(2); // O valor negativo (-15.00) deve ser ignorado
      expect(transacoes[0].valor).toBe(20);
      expect(transacoes[0].txid).toBe("RIFAC8F2A1B9E3D4");
      expect(transacoes[0].nomePagador).toBe("PEDRO HENRIQUE");
      expect(transacoes[0].endToEndId).toBe("E1823612020261110123456789012345");
      expect(transacoes[1].valor).toBe(40);
      expect(transacoes[1].txid).toBe("RIFA77A88B99C001");
      expect(transacoes[1].nomePagador).toBe("FABIANA MENEGATTI");
    });

    it("deve lidar com CSV formatado em moeda brasileira e ponto-e-vírgula", () => {
      const csv = `Data;Nome;Valor;Identificador
10/11/2026;JOAO DA SILVA;R$ 30,00;RIFA1234567890AB
`;
      const transacoes = parsearExtratoCsv(csv);
      expect(transacoes).toHaveLength(1);
      expect(transacoes[0].valor).toBe(30);
      expect(transacoes[0].nomePagador).toBe("JOAO DA SILVA");
      expect(transacoes[0].txid).toBe("RIFA1234567890AB");
    });
  });

  describe("parsearExtratoOfx", () => {
    it("deve fazer parse de transações de crédito em arquivo OFX", () => {
      const ofx = `OFXHEADER:100
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>CREDIT</TRNTYPE>
            <DTPOSTED>20261110120000[-03:EST]</DTPOSTED>
            <TRNAMT>50.00</TRNAMT>
            <FITID>E1823612020261110123456789012345</FITID>
            <CHECKNUM>RIFAB8D9E0F1A2</CHECKNUM>
            <MEMO>PIX RECEBIDO - RIFAB8D9E0F1A2</MEMO>
            <NAME>LUCAS GOMES</NAME>
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>`;

      const transacoes = parsearExtratoOfx(ofx);
      expect(transacoes).toHaveLength(1);
      expect(transacoes[0].valor).toBe(50);
      expect(transacoes[0].txid).toBe("RIFAB8D9E0F1A2");
      expect(transacoes[0].endToEndId).toBe("E1823612020261110123456789012345");
      expect(transacoes[0].nomePagador).toBe("LUCAS GOMES");
    });
  });

  describe("parsearExtratoBancario", () => {
    it("deve direcionar para o parser correto com base no nome do arquivo ou conteúdo", () => {
      const csv = `Data,Nome,Valor,Identificador\n10/11/2026,MARIA,10.00,RIFA001`;
      const resCsv = parsearExtratoBancario(csv, "extrato.csv");
      expect(resCsv).toHaveLength(1);
      expect(resCsv[0].txid).toBe("RIFA001");
    });
  });
});
