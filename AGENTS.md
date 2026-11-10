# Diretrizes para Agentes de IA (`AGENTS.md`) - Backend Depudados

Este documento define o contexto, a arquitetura, as diretrizes de código e as regras operacionais para qualquer agente de IA ou desenvolvedor atuando no repositório `backend-projeto-depudados`.

---

## 1. Visão Geral do Projeto

- **Nome:** Backend Depudados (API REST & Pipeline de Dados)
- **Objetivo:** Coleta, consolidação, pré-agregação analítica e disponibilização de dados abertos da Câmara dos Deputados do Brasil, com enriquecimento temático via IA (Ollama/Gemma).
- **Contexto:** Projeto acadêmico para a disciplina de Programação para Internet e Web (PIW) - Engenharia de Software (UFC).
- **Ambiente em Produção:** API hospedada no Render, consumida pelo frontend em Firebase Hosting ([depudados.web.app](https://depudados.web.app/)).

---

## 2. Stack Tecnológica

| Componente | Tecnologia | Versão / Detalhes |
| :--- | :--- | :--- |
| **Runtime** | Node.js | v18+ |
| **Linguagem** | TypeScript | 6.x |
| **Framework Web** | Express | 5.x |
| **Banco de Dados** | MongoDB | Hospedado / Atlas |
| **ODM** | Mongoose | 9.x |
| **IA / LLM Local** | Ollama | Gemma (classificação de temas) |
| **Dev Tools** | ts-node-dev, tsc-alias | Hot reload e path mapping (`@/*`) |

---

## 3. Scripts e Comandos Essenciais

```bash
# Instalação de dependências
npm install

# Execução em ambiente de desenvolvimento (com hot-reload)
npm run dev

# Compilação para produção (TypeScript + resolução de alias @/*)
npm run build

# Execução em produção (código compilado em dist/)
npm start

# Jobs de Sincronização e Processamento em Background
npm run migrate:mandatos     # Migração e consolidação do schema de mandatos por legislatura
npm run sync:estatisticas    # Consolida gastos, produção, assiduidade e score de eficiência
npm run sync:temas           # Classificação semântica de proposições via Ollama/Gemma
npm run reset:temas          # Reseta dados de temas para nova classificação
npm run sync:proposicoes     # Sincronização de proposições legislativas
npm run sync:presencas       # Consolidação de presenças parlamentares
```

---

## 4. Estrutura do Projeto (`src/`)

```
src/
├── app.ts                 # Ponto de entrada, configuração do Express, CORS e rotas
├── config/                # Conexão com o banco de dados (database.ts)
├── controllers/           # Thin controllers: parsing de req, delegação e resposta HTTP
├── jobs/                  # Scripts autônomos para sincronização e pré-agregação
├── middlewares/           # Middlewares do Express
├── models/                # Schemas e interfaces do Mongoose
├── repositories/          # Isolamento e abstração de consultas no MongoDB (ODM)
├── routes/                # Definição de endpoints e injeção de dependências
├── services/              # 100% das regras de negócio, validações e joins lógicos
├── types/                 # Interfaces compartilhadas (ex.: PagedResponse)
└── utils/                 # Funções utilitárias puras (cálculo de score, datas, etc.)
```

---

## 5. Padrões de Arquitetura e Regras de Negócio

### 5.1. Arquitetura em Camadas (SOLID / Clean Architecture)
- **Thin Controllers:** Não contêm lógica de negócio nem consultas ao banco. Responsáveis apenas por receber `req`, validar parâmetros básicos, chamar o `Service` e serializar a `res`.
- **Domain Services:** Concentram regras de negócio, cálculos, composição de entidades e orquestração. Comunicação entre módulos deve ocorrer via injeção/composição de dependências nos Services.
- **Repositories:** **Única camada autorizada a importar modelos do Mongoose** e executar operações de banco (`find`, `aggregate`, `updateOne`, `countDocuments`). Nunca exponha o Mongoose diretamente para controllers ou rotas.
- **Injeção de Dependências Manual:** As instâncias de Repositories e Services são injetadas nas rotas (`src/routes/*`) ao instanciar os Controllers.

### 5.2. Padrão de Pré-Agregação (*Materialized Views*)
- **Nunca utilize `$lookup` ou pipelines analíticos pesados em tempo de requisição HTTP.**
- Consultas complexas que envolvem cruzamento de múltiplas coleções (deputados, despesas, proposições, votações) devem ser calculadas previamente em **Jobs** (`src/jobs/*`) e persistidas nos documentos principais (ex.: `estatisticas` e `mandatos` em `Deputado`).
- As rotas de leitura rápida devem executar apenas queries indexadas nativas `.find().sort()`.

### 5.3. Suporte a Múltiplas Legislaturas
- O modelo de parlamentares utiliza o conceito de `mandatos` por legislatura (duração de 4 anos: 57ª = 2023-2026, 58ª = 2027-2030).
- Os campos na raiz do documento `Deputado` espelham a legislatura mais recente para retrocompatibilidade com o frontend.
- Utilize as funções de apoio em `src/utils/legislatura.util.ts` para mapeamentos entre legislaturas e intervalos de anos.

### 5.4. Score de Eficiência Parlamentar
- Pondera a produção legislativa contra os recursos da cota parlamentar (CEAP):
  - **Projetos de Lei (`codTipo: 139`):** Peso 10.
  - **Outras Proposições:** Peso 1.
  - **Fórmula:** `(Produção Ponderada / Gastos Válidos) * 100.000`.
  - Tratamento contra divisão por zero: piso mínimo de R$ 1,00 para despesas nulas.

---

## 6. Diretrizes de Código e Estilo

Ao gerar ou editar código neste repositório, o agente deve seguir estritamente:

1. **Paradigma Funcional e Declarativo:**
   - Priorizar abordagem declarativa (métodos de array como `map`, `filter`, `reduce`) sobre loops imperativos (`for`, `while`), a menos que estritamente necessário para desempenho em batches massivos.
   - Sempre preferir `const` em vez de `let` ou `var`.
   - Preferir *arrow functions* (`const fn = () => { ... }`).
   - Criar funções puras sempre que possível, sem efeitos colaterais indesejados.
2. **TypeScript & Tipagem Rigorosa:**
   - Evitar o uso de `any`; sempre definir tipos, interfaces ou generics apropriados.
   - Utilizar o path alias configurado: `@/...` apontando para `src/...`.
3. **Contrato de Paginação:**
   - Endpoints paginados devem respeitar a interface padronizada `IPagedResponse<T>` (`data`, `total`, `page`, `limit`, `totalPages`) localizada em `src/types/PagedResponse.ts`.
4. **Tratamento de Exceções:**
   - Tratar erros de forma segura nos controllers via blocos `try/catch`.
   - Registrar erros no console (`console.error`) e responder com status HTTP condizente (`400`, `404`, `500`).
5. **Comunicação:**
   - Sempre responder em português nas conversas com o usuário.
   - Manter soluções simples, concisas e livres de *code smells*.
