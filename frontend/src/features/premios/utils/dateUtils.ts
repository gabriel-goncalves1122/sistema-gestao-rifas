/**
 * Formata uma data no formato ISO "AAAA-MM-DD" por extenso em português (ex: "11 de Junho de 2026").
 *
 * @param {string} dataIso - Data no formato ISO (ex: "2026-06-11").
 * @returns {string} String formatada por extenso ou a própria entrada caso formato não case.
 */
export const formatarDataExtenso = (dataIso: string) => {
  if (!dataIso || !dataIso.includes("-")) return dataIso;
  const [ano, mes, dia] = dataIso.split("-");
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return `${dia} de ${meses[parseInt(mes) - 1]} de ${ano}`;
};

/**
 * Calcula a quantidade de dias restantes a partir de hoje até a data do sorteio especificada.
 *
 * @param {string} dataIso - Data limite no formato "AAAA-MM-DD".
 * @returns {number | null} Quantidade de dias restantes (positivo para datas futuras, negativo para passadas) ou null se inválida.
 */
export const calcularDiasRestantes = (dataIso: string): number | null => {
  if (!dataIso || !dataIso.includes("-")) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataSorteio = new Date(dataIso + "T00:00:00");
  const diff = dataSorteio.getTime() - hoje.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};
