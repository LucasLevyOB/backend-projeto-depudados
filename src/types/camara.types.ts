/**
 * Formatos brutos das fontes da Câmara (API REST v2 e arquivos estáticos em dadosabertos.camara.leg.br/arquivos).
 * Conferidos contra as fontes reais em 2026-11.
 */

export interface ILinkApi {
    rel: string;
    href: string;
}

export interface IRespostaApi<T> {
    dados: T;
    links?: ILinkApi[];
}

export interface IPartidoApi {
    id: number;
    sigla: string;
    nome: string;
    uri: string;
}

/** Item de `GET /deputados?idLegislatura={leg}`. */
export interface IDeputadoListaApi {
    id: number;
    uri: string;
    nome: string;
    siglaPartido: string;
    uriPartido: string;
    siglaUf: string;
    idLegislatura: number;
    urlFoto: string;
    email: string | null;
}

/** Item de `arquivos/deputados/json/deputados.json` (não tem `id` nem `urlFoto`; o id sai da `uri`). */
export interface IDeputadoArquivo {
    uri: string;
    nome: string;
    idLegislaturaInicial: number;
    idLegislaturaFinal: number;
    nomeCivil: string;
    siglaSexo: string;
    urlRedeSocial: string[];
    urlWebsite: string[];
    dataNascimento: string;
    dataFalecimento: string;
    ufNascimento: string;
    municipioNascimento: string;
}

export interface IStatusApi {
    id: number;
    uri: string;
    nome: string;
    siglaPartido: string;
    uriPartido: string;
    siglaUf: string;
    idLegislatura: number;
    urlFoto: string;
    email: string | null;
    data: string;
    nomeEleitoral: string;
    gabinete?: {
        nome: string | null;
        predio: string | null;
        sala: string | null;
        andar: string | null;
        telefone: string | null;
        email: string | null;
    };
    situacao: string;
    condicaoEleitoral: string;
    descricaoStatus: string | null;
}

/** Resposta de `GET /deputados/{id}`. */
export interface IDeputadoDetalheApi {
    id: number;
    uri: string;
    nomeCivil: string;
    ultimoStatus: IStatusApi;
    cpf: string;
    sexo: string;
    urlWebsite: string | null;
    redeSocial: string[];
    dataNascimento: string;
    dataFalecimento: string | null;
    ufNascimento: string;
    municipioNascimento: string;
    escolaridade: string | null;
}

/** Linha do CSV da CEAP (`camara.leg.br/cotas/Ano-{ano}.csv.zip`); todos os valores chegam como texto. */
export interface IDespesaCsv {
    txNomeParlamentar: string;
    cpf: string;
    ideCadastro: string;
    nuCarteiraParlamentar: string;
    nuLegislatura: string;
    sgUF: string;
    sgPartido: string;
    codLegislatura: string;
    numSubCota: string;
    txtDescricao: string;
    numEspecificacaoSubCota: string;
    txtDescricaoEspecificacao: string;
    txtFornecedor: string;
    txtCNPJCPF: string;
    txtNumero: string;
    indTipoDocumento: string;
    datEmissao: string;
    vlrDocumento: string;
    vlrGlosa: string;
    vlrLiquido: string;
    numMes: string;
    numAno: string;
    numParcela: string;
    txtPassageiro: string;
    txtTrecho: string;
    numLote: string;
    numRessarcimento: string;
    datPagamentoRestituicao: string;
    vlrRestituicao: string;
    nuDeputadoId: string;
    ideDocumento: string;
    urlDocumento: string;
}

export interface IProposicaoArquivo {
    id: number;
    uri: string;
    siglaTipo: string;
    numero: number;
    ano: number;
    codTipo: number;
    descricaoTipo: string;
    ementa: string;
    ementaDetalhada: string;
    keywords: string;
    dataApresentacao: string;
    uriOrgaoNumerador: string;
    uriPropAnterior: string | null;
    uriPropPrincipal: string | null;
    uriPropPosterior: string | null;
    urlInteiroTeor: string;
    ultimoStatus: Record<string, unknown>;
}

export interface IProposicaoAutorArquivo {
    idProposicao: number;
    uriProposicao: string;
    idDeputadoAutor?: number;
    uriAutor: string;
    codTipoAutor: number;
    tipoAutor: string;
    nomeAutor: string;
    siglaPartidoAutor: string;
    uriPartidoAutor: string;
    siglaUFAutor: string;
    ordemAssinatura: string;
    proponente: string;
}

export interface IVotacaoArquivo {
    id: string;
    uri: string;
    data: string;
    dataHoraRegistro: string;
    idOrgao: number;
    uriOrgao: string;
    siglaOrgao: string;
    idEvento: number;
    uriEvento: string;
    aprovacao: number | null;
    votosSim: number;
    votosNao: number;
    votosOutros: number;
    descricao: string;
    ultimaAberturaVotacao: { dataHoraRegistro: string; descricao: string };
    ultimaApresentacaoProposicao: { dataHoraRegistro: string; descricao: string; idProposicao: number; uriProposicao: string };
}

export interface IVotoArquivo {
    idVotacao: string;
    uriVotacao: string;
    dataHoraVoto: string;
    voto: string;
    deputado_: {
        id: string | number;
        uri: string;
        nome: string;
        siglaPartido: string;
        uriPartido: string;
        siglaUf: string;
        idLegislatura: string | number;
        urlFoto: string;
    };
}
