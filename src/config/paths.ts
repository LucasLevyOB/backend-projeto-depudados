import path from "path";
import dotenv from "dotenv";

dotenv.config();

/**
 * Pasta raiz do cache local de dados da Câmara.
 * Padrão: `../dados` (irmã da pasta do backend). Pode ser sobrescrita via `DADOS_DIR`.
 */
export const DADOS_DIR = path.resolve(process.env.DADOS_DIR ?? path.resolve(__dirname, "../../../dados"));

export const caminhoLegislatura = (idLegislatura: number, arquivo: string): string =>
    path.join(DADOS_DIR, "legislaturas", String(idLegislatura), arquivo);

export const caminhoAno = (ano: number, arquivo: string): string =>
    path.join(DADOS_DIR, "anos", String(ano), arquivo);
