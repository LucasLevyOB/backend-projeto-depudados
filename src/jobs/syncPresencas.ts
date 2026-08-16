import * as fs from 'fs';
import * as path from 'path';
import connectDB from '@/config/database';
import { Deputado } from '@/models/deputado.model';

const EVENTOS_DIR = path.resolve(__dirname, '../../../dados/eventos');
const PRESENCAS_DIR = path.resolve(__dirname, '../../../dados/presencas');

async function run() {
    console.log("Iniciando sincronização de presenças dos deputados...");

    // 1. Coletar IDs de eventos válidos
    console.log("Lendo arquivos de eventos...");
    const eventosValidos = new Set<number>();
    
    if (!fs.existsSync(EVENTOS_DIR)) {
        console.error(`Diretório de eventos não encontrado: ${EVENTOS_DIR}`);
        process.exit(1);
    }

    const arquivosEventos = fs.readdirSync(EVENTOS_DIR).filter(f => f.endsWith('.json'));
    
    for (const arquivo of arquivosEventos) {
        const caminho = path.join(EVENTOS_DIR, arquivo);
        const conteudo = fs.readFileSync(caminho, 'utf-8');
        const eventos = JSON.parse(conteudo);

        for (const evento of eventos) {
            if (evento.situacao !== 'Cancelada' && evento.descricaoTipo === 'Sessão Deliberativa') {
                // A API pode usar 'id' ou '_id'
                const idEvento = evento.id || evento._id;
                if (idEvento) {
                    eventosValidos.add(idEvento);
                }
            }
        }
    }

    const totalSessoes = eventosValidos.size;
    console.log(`Encontrados ${totalSessoes} eventos válidos (Sessão Deliberativa não cancelada).`);

    // 2. Contabilizar presenças por deputado
    console.log("Lendo arquivos de presenças...");
    const presencasPorDeputado = new Map<number, number>();

    if (!fs.existsSync(PRESENCAS_DIR)) {
        console.error(`Diretório de presenças não encontrado: ${PRESENCAS_DIR}`);
        process.exit(1);
    }

    const arquivosPresencas = fs.readdirSync(PRESENCAS_DIR).filter(f => f.endsWith('.json'));

    for (const arquivo of arquivosPresencas) {
        const caminho = path.join(PRESENCAS_DIR, arquivo);
        const conteudo = fs.readFileSync(caminho, 'utf-8');
        const presencas = JSON.parse(conteudo);

        for (const presenca of presencas) {
            if (eventosValidos.has(presenca.idEvento)) {
                const idDeputado = presenca.idDeputado;
                const totalAtual = presencasPorDeputado.get(idDeputado) || 0;
                presencasPorDeputado.set(idDeputado, totalAtual + 1);
            }
        }
    }

    console.log(`Contabilizadas presenças para ${presencasPorDeputado.size} deputados diferentes.`);

    // 3. Atualizar no banco de dados
    console.log("Conectando ao MongoDB...");
    await connectDB();
    console.log("Conectado com sucesso.");

    console.log("Atualizando dados no banco...");
    
    // Buscar todos os deputados do banco para poder atualizar também os que têm 0 presenças (caso necessário)
    const todosDeputados = await Deputado.find({}, { _id: 1 });
    
    const bulkOps = todosDeputados.map(deputado => {
        const idDeputado = deputado._id;
        const totalPresencas = presencasPorDeputado.get(idDeputado) || 0;
        const totalAusencias = totalSessoes - totalPresencas;
        
        // Evitar percentual negativo caso haja alguma anomalia de dados
        const ausencias = Math.max(0, totalAusencias);
        const percentual = totalSessoes > 0 
            ? Math.min(100, (totalPresencas / totalSessoes) * 100) 
            : 0;

        return {
            updateOne: {
                filter: { _id: idDeputado },
                update: {
                    $set: {
                        "resumoPresencas.totalSessoes": totalSessoes,
                        "resumoPresencas.presencas": totalPresencas,
                        "resumoPresencas.ausencias": ausencias,
                        "resumoPresencas.percentualPresenca": parseFloat(percentual.toFixed(2))
                    }
                }
            }
        };
    });

    if (bulkOps.length > 0) {
        const result = await Deputado.bulkWrite(bulkOps);
        console.log(`Atualização concluída: ${result.modifiedCount} deputados modificados.`);
    } else {
        console.log("Nenhum deputado encontrado no banco para atualizar.");
    }

    console.log("Sincronização de presenças finalizada com sucesso!");
    process.exit(0);
}

run().catch(err => {
    console.error("Erro durante a sincronização de presenças:", err);
    process.exit(1);
});
