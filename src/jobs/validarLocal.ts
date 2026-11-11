import { conectarBanco } from "@/config/database";
import { executarJob } from "@/jobs/runner";
import { ValidacaoRepository } from "@/repositories/validacao.repository";
import { parseArgs, resolverLegislatura } from "@/utils/cliArgs.util";
import { getAnosByLegislatura } from "@/utils/legislatura.util";

export type Nivel = "OK" | "AVISO" | "ERRO";

export interface IVerificacao {
    nivel: Nivel;
    mensagem: string;
}

const DEPUTADOS_EM_EXERCICIO_ESPERADOS = 513;
const MIN_PERCENTUAL_DESPESAS_COM_DEPUTADO = 98;
const MIN_PERCENTUAL_PLS_COM_TEMA = 95;
/** Limite de armazenamento do Atlas M0 (gratuito). */
const LIMITE_ATLAS_M0_BYTES = 512 * 1024 * 1024;

const pct = (parte: number, total: number): number => (total > 0 ? (parte / total) * 100 : 0);
const mb = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(0)} MB`;
const v = (nivel: Nivel, mensagem: string): IVerificacao => ({ nivel, mensagem });

/**
 * Checagens de sanidade do banco local antes de promover para o Atlas.
 * `ERRO` bloqueia a promoção: indica dado faltando que deixaria as estatísticas da legislatura erradas.
 */
export const validarLocal = async (idLegislatura: number): Promise<IVerificacao[]> => {
    const repo = new ValidacaoRepository();
    const anoAtual = new Date().getFullYear();
    const anos = getAnosByLegislatura(idLegislatura).filter(ano => ano <= anoAtual);

    const [despesas, proposicoes, votacoes, votos, deputados, tamanho] = await Promise.all([
        repo.despesasPorAno(anos),
        repo.proposicoesPorAno(anos),
        repo.votacoesPorAno(anos),
        repo.votosPorAno(anos),
        repo.resumoDeputados(idLegislatura),
        repo.tamanhoBanco(),
    ]);

    const porAno = anos.flatMap(ano => {
        const d = despesas.find(x => x.ano === ano);
        const p = proposicoes.find(x => x.ano === ano);
        const vt = votacoes.find(x => x.ano === ano)?.total ?? 0;
        const vo = votos.find(x => x.ano === ano)?.total ?? 0;
        const faltando = [!d && "despesas", !p && "proposições", !vt && "votações", !vo && "votos"].filter(Boolean);

        if (faltando.length > 0) {
            return [v("ERRO", `${ano}: sem ${faltando.join(", ")} no banco local. Rode: npm run sync:anual -- --ano=${ano}`)];
        }

        const pctDeputado = pct(d!.comDeputado, d!.total);
        const pctTema = pct(p!.plsComTema, p!.pls);
        return [
            v("OK", `${ano}: ${d!.total} despesas, ${p!.total} proposições (${p!.pls} PLs), ${vt} votações, ${vo} votos.`),
            v(pctDeputado >= MIN_PERCENTUAL_DESPESAS_COM_DEPUTADO ? "OK" : "AVISO",
                `${ano}: ${pctDeputado.toFixed(2)}% das despesas com idDeputado (o restante deve ser de lideranças).`),
            v(pctTema >= MIN_PERCENTUAL_PLS_COM_TEMA ? "OK" : "AVISO",
                `${ano}: ${pctTema.toFixed(1)}% dos PLs com tema (${p!.pls - p!.plsComTema} sem tema; rode o sync:temas).`),
        ];
    });

    const sobreDeputados = [
        deputados.emExercicio === 0
            ? v("ERRO", `Nenhum deputado em exercício na legislatura ${idLegislatura}. Rode: npm run sync:cadastros -- --legislatura=${idLegislatura}`)
            : v(deputados.emExercicio === DEPUTADOS_EM_EXERCICIO_ESPERADOS ? "OK" : "AVISO",
                `${deputados.emExercicio} deputados em exercício (esperado ${DEPUTADOS_EM_EXERCICIO_ESPERADOS}), ${deputados.comMandato} com mandato na ${idLegislatura}ª.`),
        v(deputados.emExercicioSemCpf === 0 ? "OK" : "AVISO", `${deputados.emExercicioSemCpf} em exercício sem CPF.`),
        v(deputados.emExercicioSemPresencas === 0 ? "OK" : "AVISO",
            `${deputados.emExercicioSemPresencas} em exercício sem presenças calculadas.`),
        v("OK", `${deputados.emExercicioSemGastos} em exercício sem gastos na cota (pode ser legítimo; confira se forem muitos).`),
    ];

    const total = tamanho.dados + tamanho.indices;
    const sobreTamanho = v(total < LIMITE_ATLAS_M0_BYTES * 0.8 ? "OK" : "AVISO",
        `Tamanho do banco local: ${mb(total)} (dados ${mb(tamanho.dados)} + índices ${mb(tamanho.indices)}); o Atlas M0 permite 512 MB.`);

    return [...porAno, ...sobreDeputados, sobreTamanho];
};

export const imprimirVerificacoes = (verificacoes: IVerificacao[]): void => {
    verificacoes.forEach(({ nivel, mensagem }) => console.log(`${nivel.padEnd(5)} ${mensagem}`));
    const erros = verificacoes.filter(x => x.nivel === "ERRO").length;
    const avisos = verificacoes.filter(x => x.nivel === "AVISO").length;
    console.log(`\n${erros} erro(s), ${avisos} aviso(s).`);
};

/** Compara a contagem de documentos de cada coleção entre o banco local e o Atlas. */
const compararComAtlas = async (uriAtlas: string): Promise<void> => {
    const repo = new ValidacaoRepository();
    const atlas = await conectarBanco(uriAtlas);
    try {
        const [local, remoto] = await Promise.all([repo.contarColecoes(), repo.contarColecoes(atlas)]);
        console.log("\nColeção                  Local      Atlas");
        [...new Set([...local.keys(), ...remoto.keys()])].sort().forEach(nome =>
            console.log(`${nome.padEnd(22)} ${String(local.get(nome) ?? "-").padStart(8)} ${String(remoto.get(nome) ?? "-").padStart(10)}`)
        );
    } finally {
        await atlas.close();
    }
};

if (require.main === module) {
    const idLegislatura = resolverLegislatura(parseArgs());
    executarJob("validarLocal", async () => {
        console.log(`[validarLocal] Legislatura ${idLegislatura}\n`);
        const verificacoes = await validarLocal(idLegislatura);
        imprimirVerificacoes(verificacoes);

        if (process.env.DATABASE_URL_ATLAS) {
            await compararComAtlas(process.env.DATABASE_URL_ATLAS);
        }

        if (verificacoes.some(x => x.nivel === "ERRO")) {
            throw new Error("Há erros: corrija antes de promover para o Atlas.");
        }
    });
}
