/**
 * Chaves naturais de upsert de cada coleção. Usadas pela ingestão local e pela promoção para o Atlas:
 * as coleções sem `_id` natural (autores, votos) têm `_id`s diferentes em cada banco, então a
 * identidade de um documento precisa vir destes campos, nunca do `_id`.
 */
export const chavePartido = (d: { id: string }) => ({ id: d.id });

export const chaveDeputado = (d: { _id: number }) => ({ _id: d._id });

export const chaveProposicao = (d: { _id: number }) => ({ _id: d._id });

/** `?? null`: autores que não são deputados não têm `idDeputadoAutor`, e `null` casa com campo ausente. */
export const chaveProposicaoAutor = (d: { idProposicao: number; idDeputadoAutor?: number | null; nomeAutor: string }) => ({
    idProposicao: d.idProposicao,
    idDeputadoAutor: d.idDeputadoAutor ?? null,
    nomeAutor: d.nomeAutor,
});

export const chaveVotacao = (d: { _id: string }) => ({ _id: d._id });

export const chaveVotoDeputado = (d: { idVotacao: string; deputado_: { id: string | number } }) => ({
    idVotacao: d.idVotacao,
    "deputado_.id": String(d.deputado_.id),
});
