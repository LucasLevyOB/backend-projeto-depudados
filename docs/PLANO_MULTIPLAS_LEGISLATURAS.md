# Plano de Suporte a Múltiplas Legislaturas (`backend-projeto-depudados`)

## 1. Contexto e Objetivo

Atualmente, o backend possui a legislatura `57` (2023–2026) fixa no código ([`DeputadoRepository`](./src/repositories/deputado.repository.ts)) e armazena os dados consolidados (`estatisticas`, `resumoPresencas`, `ultimoStatus`) diretamente na raiz do documento [`Deputado`](./src/models/deputado.model.ts).

Como um deputado reeleito mantém o mesmo `_id` na Câmara dos Deputados em diferentes legislaturas (ex.: 57ª e 58ª), o objetivo deste plano é **permitir que múltiplas legislaturas coexistam no banco de dados**, mantendo **100% de retrocompatibilidade** com o contrato atual consumido pelo Frontend.

---

## 2. Regra de Negócio: Mapeamento Legislatura ↔ Anos

Cada legislatura na Câmara tem duração fixa de 4 anos. Criaremos um utilitário puro (`src/utils/legislatura.util.ts`) para centralizar essa regra de forma declarativa:

```ts
export const LEGISLATURA_PADRAO = Number(process.env.LEGISLATURA_ATUAL ?? 57);

// A 57ª Legislatura iniciou em 2023 (2023..2026), a 58ª inicia em 2027 (2027..2030)
export const getAnosByLegislatura = (idLegislatura: number): number[] => {
    const anoInicial = 2023 + (idLegislatura - 57) * 4;
    return [anoInicial, anoInicial + 1, anoInicial + 2, anoInicial + 3];
};

export const getPeriodoDatasByLegislatura = (idLegislatura: number): { inicio: Date; fim: Date } => {
    const anos = getAnosByLegislatura(idLegislatura);
    return {
        inicio: new Date(`${anos[0]}-02-01T00:00:00.000Z`),
        fim: new Date(`${anos[3] + 1}-01-31T23:59:59.999Z`),
    };
};
```

---

## 3. Evolução do Schema ([`deputado.model.ts`](./src/models/deputado.model.ts))

### O que já suporta múltiplas legislaturas sem alteração:
- `resumoGastos` e `resumoProposicoes` já são arrays agrupados por `{ ano }`. Basta filtrá-los pelos 4 anos da legislatura consultada.
- As collections [`Despesa`](./src/models/despesa.model.ts), [`Proposicao`](./src/models/proposicao.model.ts), [`Votacao`](./src/models/votacao.model.ts) e [`VotoDeputado`](./src/models/votoDeputado.model.ts) já possuem `ano`, `codigoLegislatura` ou `data`.

### O que será adicionado em [`Deputado`](./src/models/deputado.model.ts):
Adicionaremos o subdocumento `mandatos` (indexado por `idLegislatura`) para guardar a fotografia exata do deputado em cada legislatura, preservando os campos na raiz como espelho da legislatura mais recente:

```ts
export interface IMandatoLegislatura {
    idLegislatura: number;
    ultimoStatus: IStatus;
    estatisticas: {
        gastosDespesas: number;
        projetosDeLei: number;
        totalProposicoes: number;
        scoreEficiencia: number;
        custoPorProjetoLei: number | null;
        custoPorProposicao: number | null;
        temasProposicoes?: Array<{ tema: string; quantidade: number }>;
    };
    resumoPresencas: IResumoPresencas;
}
```

- **Índices no MongoDB:**
  - `{ "mandatos.idLegislatura": 1, "mandatos.ultimoStatus.situacao": 1, "mandatos.estatisticas.scoreEficiencia": -1 }`
- **Script de Migração Inicial (`src/jobs/migrateMandatos57.ts`):**
  - Copia os campos atuais da raiz (`ultimoStatus`, `estatisticas`, `resumoPresencas`) dos deputados existentes no banco para `mandatos: [{ idLegislatura: 57, ... }]` de forma instantânea via `updateMany`/`bulkWrite`.

---

## 4. Ajustes por Camada no Backend

### 4.1. Repositories

1. **[`DeputadoRepository`](./src/repositories/deputado.repository.ts)**
   - **Substituir o `57` fixo** em [`formatQuery`](./src/repositories/deputado.repository.ts#L6-L18) e [`findAllSync`](./src/repositories/deputado.repository.ts#L74-L76) pelo parâmetro `idLegislatura: number = LEGISLATURA_PADRAO`.
   - Em `findAll`, `search` e `findById`: buscar o elemento correspondente dentro de `mandatos` (`$elemMatch: { idLegislatura }`) e mapeá-lo para o formato plano atual (`estatisticas`, `siglaPartido`, `siglaUf`, `resumoPresencas`, e filtrar `resumoGastos`/`resumoProposicoes` pelos anos daquela legislatura).
   - **Vantagem:** O Frontend continua recebendo **exatamente o mesmo JSON** que já consome hoje!
   - Em `updateEstatisticas` e `updateTemasProposicoes`: receber `idLegislatura` e atualizar o elemento correspondente em `mandatos` (e na raiz se for a legislatura atual).

2. **[`DespesaRepository`](./src/repositories/despesa.repository.ts)**
   - Em [`getGastosDespesasByDeputado`](./src/repositories/despesa.repository.ts#L53-L62): receber `anos?: number[]` (ou `idLegislatura?: number`) para somar apenas as despesas dos anos daquela legislatura (`{ idDeputado, ano: { $in: anos } }`).
   - Em [`findByDeputado`](./src/repositories/despesa.repository.ts#L9-L51): caso `ano` não seja informado, mas `idLegislatura` seja passado, filtrar por `{ ano: { $in: getAnosByLegislatura(idLegislatura) } }`.

3. **[`ProposicaoRepository`](./src/repositories/proposicao.repository.ts)**
   - Em [`findByIds`](./src/repositories/proposicao.repository.ts#L92-L94) e [`findByDeputado`](./src/repositories/proposicao.repository.ts#L111-L155): aceitar filtro opcional `anos?: number[]` para restringir as proposições aos anos da legislatura avaliada.

4. **[`VotoDeputadoRepository`](./src/repositories/votoDeputado.repository.ts)**
   - Em [`findByDeputadoId`](./src/repositories/votoDeputado.repository.ts#L9-L39) e [`findVotacoesIdsByDeputados`](./src/repositories/votoDeputado.repository.ts#L48-L104): aceitar filtro opcional `idLegislatura` filtrando por `dataHoraVoto` dentro do período da legislatura (ou `"deputado_.idLegislatura": String(idLegislatura)`).

---

### 4.2. Services e Jobs

1. **[`DeputadoService`](./src/services/deputado.service.ts)**
   - Propaga o parâmetro opcional `idLegislatura: number = LEGISLATURA_PADRAO` nos métodos `findAll`, `search`, `findById`, `findProposicoes` e `findVotacoes`.
   - Em [`syncAllEstatisticas(idLegislatura = LEGISLATURA_PADRAO)`](./src/services/deputado.service.ts#L47-L78):
     - Obtém `const anos = getAnosByLegislatura(idLegislatura)`.
     - Calcula `gastosDespesas`, `totalProjetos`, `totalProposicoes`, `scoreEficiencia` e `temasProposicoes` filtrando apenas pelos `anos` daquela legislatura.
     - Salva no mandato correspondente (`idLegislatura`) sem apagar os cálculos das legislaturas anteriores.

2. **[`syncPresencas.ts`](./src/jobs/syncPresencas.ts)**
   - Recebe `--legislatura=57` (ou `58`), lê apenas os arquivos de eventos/presenças dos 4 anos correspondentes (`getAnosByLegislatura(idLegislatura)`) e atualiza o `resumoPresencas` daquele mandato específico.

---

### 4.3. Controllers e Rotas (Contrato da API)

Todos os endpoints passam a aceitar `?legislatura=57` (opcional, usando `LEGISLATURA_PADRAO` caso omitido):

| Endpoint | Parâmetro Adicionado | Comportamento |
| :--- | :--- | :--- |
| `GET /deputados` | `?legislatura=57` | Lista o ranking e cards da legislatura escolhida. |
| `GET /deputados/search` | `?legislatura=57` | Busca deputados em exercício naquela legislatura. |
| `GET /deputados/:id` | `?legislatura=57` | Retorna detalhes, estatísticas, presenças e resumos dos 4 anos daquela legislatura (além da lista `legislaturasDisponiveis: [57, 58]` do deputado). |
| `GET /deputados/:id/proposicoes` | `?legislatura=57` | Filtra proposições apresentadas nos anos da legislatura. |
| `GET /deputados/:id/votacoes` | `?legislatura=57` | Filtra votações ocorridas na legislatura. |
| `GET /despesas/deputado/:id` | `?legislatura=57` | Filtra despesas dos anos da legislatura (se `ano` específico não for informado). |
| `GET /votacoes/comparar` | `?legislatura=57` | Compara votos de 2 deputados na legislatura selecionada. |

---

## 5. Checklist de Implementação

- [x] **Etapa 1 (Utilitário):** Criar `src/utils/legislatura.util.ts` com `LEGISLATURA_PADRAO`, `getAnosByLegislatura` e `getPeriodoDatasByLegislatura`.
- [x] **Etapa 2 (Model & Migração):** Atualizar [`deputado.model.ts`](./src/models/deputado.model.ts) adicionando `mandatos` e criar `src/jobs/migrateMandatos.ts` para popular `mandatos` da 57ª legislatura com os dados já existentes no banco.
- [x] **Etapa 3 (Repositories):** Parametrizar `idLegislatura` em [`DeputadoRepository`](./src/repositories/deputado.repository.ts), [`DespesaRepository`](./src/repositories/despesa.repository.ts), [`ProposicaoRepository`](./src/repositories/proposicao.repository.ts) e [`VotoDeputadoRepository`](./src/repositories/votoDeputado.repository.ts).
- [x] **Etapa 4 (Services & Controllers):** Propagar `req.query.legislatura` nos controllers e services.
- [x] **Etapa 5 (Jobs de Sincronização):** Atualizar [`syncEstatisticas.ts`](./src/jobs/syncEstatisticas.ts), [`syncTemas.ts`](./src/jobs/syncTemas.ts) e [`syncPresencas.ts`](./src/jobs/syncPresencas.ts) para receberem `--legislatura` e isolarem os cálculos por mandato.

