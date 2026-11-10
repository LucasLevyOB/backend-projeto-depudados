# Padrões e Decisões de Arquitetura - Backend

Este documento serve como um guia das decisões de arquitetura e regras de negócio tomadas para o backend do Projeto Deputados.

## 1. Padrão de Camadas (Service e Repository)
- **Controllers**: Mantidos extremamente "limpos" (thin controllers). São responsáveis apenas por capturar a requisição, chamar os Services e retornar o JSON/Erros.
- **Repositories**: Isolam o banco de dados. Qualquer operação do Mongoose (`find`, `updateOne`, `countDocuments`, etc.) fica aqui.
- **Services**: Contêm as regras de negócio. Se for necessário cruzar dados de entidades diferentes, o "Join" Lógico é feito nos Services. Exemplo: `DeputadoService` tem injeção de dependência do `DespesaService` e `ProposicaoService` para compor os dados.

## 2. Padrão de Pré-Agregação (Materialized Views no MongoDB)
No ecossistema NoSQL (MongoDB), para habilitarmos a **ordenação global rápida** de campos que exigem cálculos complexos ou *joins* de várias coleções (ex: Deputado x Despesas x Proposições), optamos pelo padrão de Pré-Agregação:
- **NÃO fazemos** `$lookup` e agregações complexas via view ou pipeline em tempo de resposta (on the fly).
- **Em vez disso**: Os cálculos pesados rodam em scripts agendados / "Jobs" (ex: `src/jobs/syncEstatisticas.ts`). 
- Esses scripts pegam o resultado final e salvam ("cacheiam") como chaves normais nos documentos principais (ex: objeto `estatisticas` em `Deputado`).
- **Vantagem**: A listagem de deputados ordenados por eficiência roda nativamente num simples `.find().sort()`, entregando velocidade instantânea.

## 3. Regra de Negócio: Cálculo do Score de Eficiência
O score de eficiência dos deputados tenta ponderar "Relevância do que foi produzido" versus "Gasto em dinheiro".

**A. Pesos de Produção (Produção Ponderada)**
Nem todas as proposições exigem o mesmo esforço legislativo.
- **Projetos de Lei (codTipo: 139)**: Possuem grande relevância e ganham peso 10.
- **Outras Proposições** (requerimentos, homenagens): Possuem peso 1.

**B. A Fórmula**
- `Producao Ponderada = (ProjetosDeLei * 10) + (Restante * 1)`
- `Fator Escala = 100.000` (Para converter números flutuantes muito pequenos em pontuações inteiras legíveis).
- `Score de Eficiencia = (Producao Ponderada / Gastos Validos) * Fator Escala`.

**C. Divisão por Zero**
- Protegemos o cálculo contra divisão por zero atribuindo o mínimo de R$ 1,00 caso o gasto seja nulo: `gastos > 0 ? gastos : 1`. E atribuímos `null` aos custos por projeto quando a produção é zero.
