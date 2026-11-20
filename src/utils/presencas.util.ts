import { IResumoPresencas, IStatus } from "@/models/deputado.model";

/**
 * Calcula o resumo de presenças de um deputado.
 * Sessões aptas: em exercício, as sessões a partir da data do status; fora de exercício, as sessões até essa data.
 * Sem status conhecido, todas as sessões da legislatura contam.
 */
export const calcularResumoPresencas = (
    status: Pick<IStatus, "situacao" | "data"> | undefined,
    datasSessoes: readonly Date[],
    totalPresencas: number
): IResumoPresencas => {
    const dataStatus = status?.situacao && status.data ? new Date(status.data) : undefined;

    const sessoesAptas = dataStatus
        ? datasSessoes.filter(data => (status!.situacao === "Exercício" ? data >= dataStatus : data <= dataStatus)).length
        : datasSessoes.length;

    // Nunca menos sessões do que presenças, para não passar de 100%.
    const totalSessoes = Math.max(sessoesAptas, totalPresencas);
    const percentual = totalSessoes > 0 ? Math.min(100, (totalPresencas / totalSessoes) * 100) : 0;

    return {
        totalSessoes,
        presencas: totalPresencas,
        ausencias: totalSessoes - totalPresencas,
        percentualPresenca: parseFloat(percentual.toFixed(2)),
    };
};
