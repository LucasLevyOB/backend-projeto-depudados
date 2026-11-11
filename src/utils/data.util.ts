const TEM_FUSO = /(Z|[+-]\d{2}:?\d{2})$/;

/**
 * Converte data/hora da Câmara para `Date`. Os arquivos trazem horários de Brasília sem fuso
 * (ex.: `2026-06-10T14:46:15`); sem isso, o resultado dependeria do fuso da máquina que roda o job.
 * Datas sem hora (`2026-02-02`) seguem a regra do JavaScript (meia-noite UTC).
 */
export const dataBrasilia = (valor: string | null | undefined): Date | undefined => {
    if (!valor) return undefined;
    const texto = valor.includes("T") && !TEM_FUSO.test(valor) ? `${valor}-03:00` : valor;
    const data = new Date(texto);
    return Number.isNaN(data.getTime()) ? undefined : data;
};
