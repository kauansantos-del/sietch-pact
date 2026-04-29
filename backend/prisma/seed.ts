import { PrismaClient, Recommendation } from '@prisma/client';
import { calculateScores } from '../src/utils/classification';

const prisma = new PrismaClient();

// ─── Criterion templates (5 técnicos + 5 comportamentais = 10 por avaliação) ─

const TECH_CRITERIA = [
  { criterionKey: 'qualidade_tecnica',        block: 'TECNICO' as const, weight: 3 },
  { criterionKey: 'resolucao_problemas',      block: 'TECNICO' as const, weight: 3 },
  { criterionKey: 'conhecimento_ferramentas', block: 'TECNICO' as const, weight: 2 },
  { criterionKey: 'documentacao',             block: 'TECNICO' as const, weight: 1 },
  { criterionKey: 'boas_praticas',            block: 'TECNICO' as const, weight: 2 },
];

const BEHAV_CRITERIA = [
  { criterionKey: 'comunicacao',     block: 'COMPORTAMENTAL' as const, weight: 2 },
  { criterionKey: 'trabalho_equipe', block: 'COMPORTAMENTAL' as const, weight: 3 },
  { criterionKey: 'proatividade',    block: 'COMPORTAMENTAL' as const, weight: 2 },
  { criterionKey: 'comprometimento', block: 'COMPORTAMENTAL' as const, weight: 3 },
  { criterionKey: 'adaptabilidade',  block: 'COMPORTAMENTAL' as const, weight: 1 },
];

type ScoreArr = [number, number, number, number, number];

function buildScores(tech: ScoreArr, behav: ScoreArr) {
  return [
    ...TECH_CRITERIA.map((c, i) => ({ ...c, score: tech[i] })),
    ...BEHAV_CRITERIA.map((c, i) => ({ ...c, score: behav[i] })),
  ];
}

// ─── Score profiles (classificação verificada pela fórmula do servidor) ───────
// finalScore = techScore * 0.6 + behavScore * 0.4
// OTIMO >= 4.2 | BOM >= 3.2 | REGULAR >= 2.0 | CRITICO < 2.0

const PROFILES = {
  OTIMO_MAX:     buildScores([5,5,5,5,5], [5,5,5,5,5]),  // 5.00
  OTIMO_ALTO:    buildScores([5,5,4,4,5], [5,5,4,5,4]),  // 4.73
  OTIMO_MEDIO:   buildScores([5,4,4,4,4], [4,5,4,4,4]),  // 4.27
  OTIMO_BAIXO:   buildScores([4,5,4,4,4], [4,4,5,4,4]),  // 4.24
  BOM_ALTO:      buildScores([4,4,4,4,4], [4,4,4,4,4]),  // 4.00
  BOM_MEDIO:     buildScores([4,4,3,3,4], [4,4,3,4,3]),  // 3.73
  BOM_BAIXO:     buildScores([3,4,3,3,4], [3,4,3,3,3]),  // 3.38
  REGULAR_ALTO:  buildScores([3,3,3,3,3], [3,3,3,3,3]),  // 3.00
  REGULAR_MEDIO: buildScores([3,3,2,3,3], [3,2,3,2,3]),  // 2.67
  REGULAR_BAIXO: buildScores([2,3,2,3,2], [2,3,2,2,3]),  // 2.36
  CRITICO_ALTO:  buildScores([2,2,1,2,2], [2,1,2,2,1]),  // 1.75
  CRITICO_BAIXO: buildScores([2,1,2,1,2], [2,2,1,1,2]),  // 1.60
};

type ProfileKey = keyof typeof PROFILES;

// ─── Dados base ───────────────────────────────────────────────────────────────

const USERS_DATA = [
  { name: 'Ana Lima',         email: 'ana.lima@sietch.tech',         googleId: 'seed_gid_001', role: 'SUPER_ADMIN' as const },
  { name: 'Carlos Mendes',    email: 'carlos.mendes@sietch.tech',    googleId: 'seed_gid_002', role: 'ADMIN'       as const },
  { name: 'Juliana Ferreira', email: 'juliana.ferreira@sietch.tech', googleId: 'seed_gid_003', role: 'ADMIN'       as const },
  { name: 'Roberto Nunes',    email: 'roberto.nunes@sietch.tech',    googleId: 'seed_gid_004', role: 'ADMIN'       as const },
];

const TECHNICIANS_DATA = [
  // Dev
  { name: 'Lucas Andrade',     email: 'l.andrade@sietch.tech',     team: 'Dev'       },
  { name: 'Pedro Henrique',    email: 'p.henrique@sietch.tech',    team: 'Dev'       },
  { name: 'Mateus Costa',      email: 'm.costa@sietch.tech',       team: 'Dev'       },
  { name: 'Felipe Rezende',    email: 'f.rezende@sietch.tech',     team: 'Dev'       },
  { name: 'Gabriel Morais',    email: 'g.morais@sietch.tech',      team: 'Dev'       },
  // Design
  { name: 'Isabela Martins',   email: 'i.martins@sietch.tech',     team: 'Design'    },
  { name: 'Amanda Souza',      email: 'a.souza@sietch.tech',       team: 'Design'    },
  { name: 'Rafael Pereira',    email: 'r.pereira@sietch.tech',     team: 'Design'    },
  { name: 'Camila Torres',     email: 'c.torres@sietch.tech',      team: 'Design'    },
  // Front-end
  { name: 'Thiago Alves',      email: 't.alves@sietch.tech',       team: 'Front-end' },
  { name: 'Marina Gomes',      email: 'm.gomes@sietch.tech',       team: 'Front-end' },
  { name: 'Rodrigo Fernandes', email: 'r.fernandes@sietch.tech',   team: 'Front-end' },
  { name: 'Larissa Dias',      email: 'l.dias@sietch.tech',        team: 'Front-end' },
  // Back-end
  { name: 'João Pinto',        email: 'j.pinto@sietch.tech',       team: 'Back-end'  },
  { name: 'Beatriz Lima',      email: 'b.lima@sietch.tech',        team: 'Back-end'  },
  { name: 'Diego Costa',       email: 'd.costa@sietch.tech',       team: 'Back-end'  },
  { name: 'Sofia Barbosa',     email: 's.barbosa@sietch.tech',     team: 'Back-end'  },
  // Outros
  { name: 'Alexandre Nunes',   email: 'a.nunes@sietch.tech',       team: 'Outros'    },
  { name: 'Patricia Rocha',    email: 'p.rocha@sietch.tech',       team: 'Outros'    },
  { name: 'Daniel Ferreira',   email: 'd.ferreira@sietch.tech',    team: 'Outros'    },
];

type EvalSpec = {
  technician: string;
  evaluator:  string;
  cycle:      string;
  createdAt:  Date;
  profile:    ProfileKey;
  recommendation?: Recommendation;
  observations?:   string;
};

// ─── Avaliações — 78 registros com arcos narrativos reais ─────────────────────

const EVAL_SPECS: EvalSpec[] = [

  // ── LUCAS ANDRADE (Dev) — arco crescente: REGULAR → BOM → BOM → OTIMO ────
  { technician: 'Lucas Andrade', evaluator: 'Ana Lima', cycle: '2025-Q3',
    createdAt: new Date('2025-08-20'), profile: 'REGULAR_ALTO',
    recommendation: 'PLANO_DESENVOLVIMENTO',
    observations: 'Lucas demonstra boa vontade mas ainda tem dificuldades com qualidade de entrega. PDI iniciado com foco em boas práticas e documentação.' },
  { technician: 'Lucas Andrade', evaluator: 'Ana Lima', cycle: '2025-Q4',
    createdAt: new Date('2025-11-25'), profile: 'BOM_BAIXO',
    observations: 'Evolução perceptível após o PDI. Entregas mais consistentes. Atenção à comunicação com o time.' },
  { technician: 'Lucas Andrade', evaluator: 'Ana Lima', cycle: '2026-Q1',
    createdAt: new Date('2026-03-10'), profile: 'BOM_MEDIO',
    recommendation: 'ELEGIVEL_BONUS',
    observations: 'Crescimento expressivo. Passou a contribuir ativamente nas code reviews. Recomendado para bônus de performance.' },
  { technician: 'Lucas Andrade', evaluator: 'Ana Lima', cycle: '2026-Q2',
    createdAt: new Date('2026-04-20'), profile: 'OTIMO_BAIXO',
    recommendation: 'INDICADO_PROMOCAO',
    observations: 'Transformação notável ao longo do ano. Tornou-se referência técnica no squad. Fortemente recomendado para promoção.' },

  // ── PEDRO HENRIQUE (Dev) — consistentemente BOM ───────────────────────────
  { technician: 'Pedro Henrique', evaluator: 'Ana Lima', cycle: '2025-Q3',
    createdAt: new Date('2025-08-20'), profile: 'BOM_MEDIO',
    observations: 'Profissional sólido. Cumpre prazos e tem boa relação com o time.' },
  { technician: 'Pedro Henrique', evaluator: 'Ana Lima', cycle: '2025-Q4',
    createdAt: new Date('2025-11-25'), profile: 'BOM_ALTO',
    recommendation: 'ELEGIVEL_BONUS',
    observations: 'Melhorou documentação e passou a atuar como mentor para os juniores. Elegível para bônus.' },
  { technician: 'Pedro Henrique', evaluator: 'Ana Lima', cycle: '2026-Q1',
    createdAt: new Date('2026-03-10'), profile: 'BOM_ALTO',
    recommendation: 'ELEGIVEL_BONUS',
    observations: 'Mantém bom desempenho. Liderou entrega de feature crítica no Q1.' },
  { technician: 'Pedro Henrique', evaluator: 'Ana Lima', cycle: '2026-Q2',
    createdAt: new Date('2026-04-20'), profile: 'BOM_ALTO',
    recommendation: 'ELEGIVEL_BONUS',
    observations: 'Quarto ciclo consecutivo no nível BOM. Referência em confiabilidade para o time.' },

  // ── MATEUS COSTA (Dev) — top performer absoluto ───────────────────────────
  { technician: 'Mateus Costa', evaluator: 'Ana Lima', cycle: '2025-Q3',
    createdAt: new Date('2025-08-20'), profile: 'OTIMO_MEDIO',
    recommendation: 'ELEGIVEL_BONUS',
    observations: 'Excelente desenvolvedor. Entrega com qualidade superior à média. Referência técnica no time.' },
  { technician: 'Mateus Costa', evaluator: 'Ana Lima', cycle: '2025-Q4',
    createdAt: new Date('2025-11-25'), profile: 'OTIMO_ALTO',
    recommendation: 'INDICADO_PROMOCAO',
    observations: 'Desempenho excepcional. Liderou arquitetura do novo módulo de autenticação. Indicado para Tech Lead.' },
  { technician: 'Mateus Costa', evaluator: 'Ana Lima', cycle: '2026-Q1',
    createdAt: new Date('2026-03-10'), profile: 'OTIMO_ALTO',
    recommendation: 'ELEGIVEL_BONUS',
    observations: 'Continua como principal referência técnica do squad. Mentoria ativa de 3 juniores.' },
  { technician: 'Mateus Costa', evaluator: 'Ana Lima', cycle: '2026-Q2',
    createdAt: new Date('2026-04-20'), profile: 'OTIMO_MAX',
    recommendation: 'INDICADO_PROMOCAO',
    observations: 'Nota máxima em todos os critérios. Promoção encaminhada para aprovação final da diretoria.' },

  // ── FELIPE REZENDE (Dev) — em declínio preocupante ────────────────────────
  { technician: 'Felipe Rezende', evaluator: 'Carlos Mendes', cycle: '2025-Q3',
    createdAt: new Date('2025-08-20'), profile: 'BOM_ALTO',
    observations: 'Bom desempenho técnico. Pontual nas entregas.' },
  { technician: 'Felipe Rezende', evaluator: 'Carlos Mendes', cycle: '2025-Q4',
    createdAt: new Date('2025-11-25'), profile: 'BOM_MEDIO',
    observations: 'Leve queda na qualidade das entregas. Conversamos sobre foco e priorização. Atenção à proatividade.' },
  { technician: 'Felipe Rezende', evaluator: 'Carlos Mendes', cycle: '2026-Q1',
    createdAt: new Date('2026-03-10'), profile: 'REGULAR_ALTO',
    recommendation: 'PLANO_DESENVOLVIMENTO',
    observations: 'Queda contínua no desempenho. PDI iniciado com acompanhamento quinzenal. Foco em comprometimento e qualidade técnica.' },
  { technician: 'Felipe Rezende', evaluator: 'Carlos Mendes', cycle: '2026-Q2',
    createdAt: new Date('2026-04-20'), profile: 'REGULAR_MEDIO',
    recommendation: 'PLANO_DESENVOLVIMENTO',
    observations: 'Pequena melhora pontual, ainda abaixo do esperado. Continua em PDI. Próxima avaliação será determinante.' },

  // ── GABRIEL MORAIS (Dev) — novo e promissor ───────────────────────────────
  { technician: 'Gabriel Morais', evaluator: 'Carlos Mendes', cycle: '2025-Q4',
    createdAt: new Date('2025-11-25'), profile: 'BOM_BAIXO',
    observations: 'Primeiro ciclo. Gabriel integrou bem o time e demonstra ótima capacidade de aprendizado.' },
  { technician: 'Gabriel Morais', evaluator: 'Carlos Mendes', cycle: '2026-Q1',
    createdAt: new Date('2026-03-10'), profile: 'BOM_MEDIO',
    observations: 'Evolução rápida. Já contribui com soluções próprias e questiona o status quo de forma construtiva.' },
  { technician: 'Gabriel Morais', evaluator: 'Carlos Mendes', cycle: '2026-Q2',
    createdAt: new Date('2026-04-20'), profile: 'BOM_ALTO',
    recommendation: 'ELEGIVEL_BONUS',
    observations: 'Surpreendeu positivamente. Em apenas 6 meses atingiu BOM_ALTO. Elegível para bônus.' },

  // ── ISABELA MARTINS (Design) — estrela absoluta ───────────────────────────
  { technician: 'Isabela Martins', evaluator: 'Carlos Mendes', cycle: '2025-Q3',
    createdAt: new Date('2025-08-20'), profile: 'OTIMO_MEDIO',
    recommendation: 'ELEGIVEL_BONUS',
    observations: 'Profissional excepcional. Designs elegantes, system consistente e excelente comunicação com stakeholders.' },
  { technician: 'Isabela Martins', evaluator: 'Carlos Mendes', cycle: '2025-Q4',
    createdAt: new Date('2025-11-25'), profile: 'OTIMO_ALTO',
    recommendation: 'INDICADO_PROMOCAO',
    observations: 'Entregou redesign completo do produto no prazo, acima das expectativas. Liderança natural. Indicada para Design Lead.' },
  { technician: 'Isabela Martins', evaluator: 'Carlos Mendes', cycle: '2026-Q1',
    createdAt: new Date('2026-03-10'), profile: 'OTIMO_MAX',
    recommendation: 'INDICADO_PROMOCAO',
    observations: 'Nota máxima em todos os critérios. Assumiu mentoria informal do time de design. Promoção recomendada com urgência.' },
  { technician: 'Isabela Martins', evaluator: 'Carlos Mendes', cycle: '2026-Q2',
    createdAt: new Date('2026-04-20'), profile: 'OTIMO_ALTO',
    recommendation: 'ELEGIVEL_BONUS',
    observations: 'Mantém excelência. Conduziu workshop de Design System para toda a empresa. Elegível para bônus máximo.' },

  // ── AMANDA SOUZA (Design) — ascensão consistente ──────────────────────────
  { technician: 'Amanda Souza', evaluator: 'Juliana Ferreira', cycle: '2025-Q3',
    createdAt: new Date('2025-08-20'), profile: 'BOM_MEDIO',
    observations: 'Boa profissional. Entregas consistentes mas com espaço para ganho de velocidade.' },
  { technician: 'Amanda Souza', evaluator: 'Juliana Ferreira', cycle: '2025-Q4',
    createdAt: new Date('2025-11-25'), profile: 'BOM_ALTO',
    recommendation: 'ELEGIVEL_BONUS',
    observations: 'Melhora significativa na velocidade de entrega. Proatividade em propor soluções antes de ser solicitada.' },
  { technician: 'Amanda Souza', evaluator: 'Juliana Ferreira', cycle: '2026-Q1',
    createdAt: new Date('2026-03-10'), profile: 'OTIMO_BAIXO',
    recommendation: 'ELEGIVEL_BONUS',
    observations: 'Cruzou para o Ótimo pela primeira vez. Criação do componente de onboarding foi destaque do trimestre.' },
  { technician: 'Amanda Souza', evaluator: 'Juliana Ferreira', cycle: '2026-Q2',
    createdAt: new Date('2026-04-20'), profile: 'OTIMO_MEDIO',
    recommendation: 'INDICADO_PROMOCAO',
    observations: 'Consolidou-se como referência em UX. Indicada para promoção para Sênior.' },

  // ── RAFAEL PEREIRA (Design) — mediano, estabilizando ─────────────────────
  { technician: 'Rafael Pereira', evaluator: 'Juliana Ferreira', cycle: '2025-Q3',
    createdAt: new Date('2025-08-20'), profile: 'REGULAR_ALTO',
    observations: 'Entregas abaixo do esperado. Dificuldades na interpretação de briefings e aderência ao Design System.' },
  { technician: 'Rafael Pereira', evaluator: 'Juliana Ferreira', cycle: '2025-Q4',
    createdAt: new Date('2025-11-25'), profile: 'BOM_BAIXO',
    observations: 'Melhora perceptível. Maior aderência ao Design System. Atenção ao tempo de revisão.' },
  { technician: 'Rafael Pereira', evaluator: 'Juliana Ferreira', cycle: '2026-Q1',
    createdAt: new Date('2026-03-10'), profile: 'BOM_BAIXO',
    observations: 'Manteve nível BOM. Pode evoluir mais investindo em documentação das decisões de design.' },
  { technician: 'Rafael Pereira', evaluator: 'Juliana Ferreira', cycle: '2026-Q2',
    createdAt: new Date('2026-04-20'), profile: 'BOM_MEDIO',
    observations: 'Boa evolução no trimestre. Reconhecido pela entrega do redesign mobile.' },

  // ── CAMILA TORRES (Design) — trajetória crítica ───────────────────────────
  { technician: 'Camila Torres', evaluator: 'Juliana Ferreira', cycle: '2025-Q3',
    createdAt: new Date('2025-08-20'), profile: 'REGULAR_MEDIO',
    recommendation: 'PLANO_DESENVOLVIMENTO',
    observations: 'Dificuldades recorrentes na execução e comunicação. PDI iniciado com foco em autonomia e qualidade técnica.' },
  { technician: 'Camila Torres', evaluator: 'Juliana Ferreira', cycle: '2025-Q4',
    createdAt: new Date('2025-11-25'), profile: 'REGULAR_BAIXO',
    recommendation: 'PLANO_DESENVOLVIMENTO',
    observations: 'Queda no desempenho a despeito do PDI. Reunião de alinhamento com RH agendada para início do Q1.' },
  { technician: 'Camila Torres', evaluator: 'Juliana Ferreira', cycle: '2026-Q1',
    createdAt: new Date('2026-03-10'), profile: 'CRITICO_ALTO',
    recommendation: 'ATENCAO_URGENTE',
    observations: 'Situação crítica. Reunião trilateral (colaboradora, gestor, RH) realizada. Prazo de 30 dias para reversão.' },
  { technician: 'Camila Torres', evaluator: 'Juliana Ferreira', cycle: '2026-Q2',
    createdAt: new Date('2026-04-20'), profile: 'REGULAR_BAIXO',
    recommendation: 'PLANO_DESENVOLVIMENTO',
    observations: 'Melhora pontual após intervenção. Ainda em acompanhamento intensivo. Próxima avaliação decide continuidade do PDI.' },

  // ── THIAGO ALVES (Front-end) — top performer consistente ─────────────────
  { technician: 'Thiago Alves', evaluator: 'Roberto Nunes', cycle: '2025-Q3',
    createdAt: new Date('2025-08-20'), profile: 'OTIMO_ALTO',
    recommendation: 'INDICADO_PROMOCAO',
    observations: 'Profissional excepcional. Domínio técnico completo, comunicação clara, proatividade exemplar. Candidato natural à liderança.' },
  { technician: 'Thiago Alves', evaluator: 'Roberto Nunes', cycle: '2025-Q4',
    createdAt: new Date('2025-11-25'), profile: 'OTIMO_MAX',
    recommendation: 'ELEGIVEL_BONUS',
    observations: 'Nota máxima. Entregou PWA completo antes do prazo. Referência para todo o capítulo front-end.' },
  { technician: 'Thiago Alves', evaluator: 'Roberto Nunes', cycle: '2026-Q1',
    createdAt: new Date('2026-03-10'), profile: 'OTIMO_ALTO',
    recommendation: 'ELEGIVEL_BONUS',
    observations: 'Mantém alto padrão. Conduziu migração de CSS legado para Tailwind com zero regressões.' },
  { technician: 'Thiago Alves', evaluator: 'Roberto Nunes', cycle: '2026-Q2',
    createdAt: new Date('2026-04-20'), profile: 'OTIMO_MAX',
    recommendation: 'INDICADO_PROMOCAO',
    observations: 'Candidato à promoção para Tech Lead Front-end. Impacto positivo mensurável em toda a frota de produtos.' },

  // ── MARINA GOMES (Front-end) — ascendendo rapidamente ────────────────────
  { technician: 'Marina Gomes', evaluator: 'Roberto Nunes', cycle: '2025-Q3',
    createdAt: new Date('2025-08-20'), profile: 'BOM_ALTO',
    observations: 'Boa desenvolvedora. Entregas de qualidade e boa interação com o time de design.' },
  { technician: 'Marina Gomes', evaluator: 'Roberto Nunes', cycle: '2025-Q4',
    createdAt: new Date('2025-11-25'), profile: 'OTIMO_BAIXO',
    recommendation: 'ELEGIVEL_BONUS',
    observations: 'Saltou para o Ótimo. Criação da lib de componentes foi destaque do trimestre. Elegível para bônus.' },
  { technician: 'Marina Gomes', evaluator: 'Roberto Nunes', cycle: '2026-Q1',
    createdAt: new Date('2026-03-10'), profile: 'OTIMO_MEDIO',
    recommendation: 'ELEGIVEL_BONUS',
    observations: 'Consolidou-se no nível Ótimo. Passou a auxiliar reviews de PR dos juniores.' },
  { technician: 'Marina Gomes', evaluator: 'Roberto Nunes', cycle: '2026-Q2',
    createdAt: new Date('2026-04-20'), profile: 'OTIMO_ALTO',
    recommendation: 'INDICADO_PROMOCAO',
    observations: 'Evolução surpreendente. Já age como sênior informal do time. Promoção recomendada.' },

  // ── RODRIGO FERNANDES (Front-end) — declínio preocupante ─────────────────
  { technician: 'Rodrigo Fernandes', evaluator: 'Ana Lima', cycle: '2025-Q3',
    createdAt: new Date('2025-08-20'), profile: 'BOM_ALTO',
    observations: 'Bom trimestre. Entregas no prazo com boa qualidade.' },
  { technician: 'Rodrigo Fernandes', evaluator: 'Ana Lima', cycle: '2025-Q4',
    createdAt: new Date('2025-11-25'), profile: 'BOM_MEDIO',
    observations: 'Leve queda de rendimento. Ajuste de carga feito para Q1 devido a sobrecarga identificada.' },
  { technician: 'Rodrigo Fernandes', evaluator: 'Ana Lima', cycle: '2026-Q1',
    createdAt: new Date('2026-03-10'), profile: 'BOM_BAIXO',
    observations: 'Tendência de queda continua apesar do ajuste de carga. Monitoramento próximo no Q2.' },
  { technician: 'Rodrigo Fernandes', evaluator: 'Ana Lima', cycle: '2026-Q2',
    createdAt: new Date('2026-04-20'), profile: 'REGULAR_ALTO',
    recommendation: 'PLANO_DESENVOLVIMENTO',
    observations: 'Entrou para o Regular pela primeira vez. PDI iniciado com foco em qualidade e comprometimento. Acompanhamento mensal.' },

  // ── LARISSA DIAS (Front-end) — recuperação exemplar ──────────────────────
  { technician: 'Larissa Dias', evaluator: 'Carlos Mendes', cycle: '2025-Q3',
    createdAt: new Date('2025-08-20'), profile: 'REGULAR_MEDIO',
    recommendation: 'PLANO_DESENVOLVIMENTO',
    observations: 'Dificuldades em boas práticas e comunicação técnica. PDI iniciado com mentoria semanal.' },
  { technician: 'Larissa Dias', evaluator: 'Carlos Mendes', cycle: '2025-Q4',
    createdAt: new Date('2025-11-25'), profile: 'REGULAR_ALTO',
    observations: 'Evolução perceptível. Passou a cumprir checkpoints do PDI. Melhora em documentação.' },
  { technician: 'Larissa Dias', evaluator: 'Carlos Mendes', cycle: '2026-Q1',
    createdAt: new Date('2026-03-10'), profile: 'BOM_BAIXO',
    observations: 'Entrou para o BOM pela primeira vez. Conquista expressiva considerando o ponto de partida.' },
  { technician: 'Larissa Dias', evaluator: 'Carlos Mendes', cycle: '2026-Q2',
    createdAt: new Date('2026-04-20'), profile: 'BOM_MEDIO',
    recommendation: 'ELEGIVEL_BONUS',
    observations: 'Consolidou BOM e demonstra tendência positiva. Elegível para bônus como reconhecimento da jornada de recuperação.' },

  // ── JOÃO PINTO (Back-end) — trajetória exemplar, promoção aprovada ────────
  { technician: 'João Pinto', evaluator: 'Juliana Ferreira', cycle: '2025-Q3',
    createdAt: new Date('2025-08-20'), profile: 'OTIMO_MEDIO',
    recommendation: 'ELEGIVEL_BONUS',
    observations: 'Arquitetura impecável nas APIs entregues. Documentação Swagger completa sem necessidade de revisão.' },
  { technician: 'João Pinto', evaluator: 'Juliana Ferreira', cycle: '2025-Q4',
    createdAt: new Date('2025-11-25'), profile: 'OTIMO_ALTO',
    recommendation: 'ELEGIVEL_BONUS',
    observations: 'Liderou integração com sistema legado, maior desafio técnico do semestre. Resultado: zero incidentes pós-deploy.' },
  { technician: 'João Pinto', evaluator: 'Juliana Ferreira', cycle: '2026-Q1',
    createdAt: new Date('2026-03-10'), profile: 'OTIMO_ALTO',
    recommendation: 'INDICADO_PROMOCAO',
    observations: 'Candidato natural a Tech Lead Back-end. Mentorou 2 plenos e 1 sênior. Indicado para promoção.' },
  { technician: 'João Pinto', evaluator: 'Juliana Ferreira', cycle: '2026-Q2',
    createdAt: new Date('2026-04-20'), profile: 'OTIMO_MAX',
    recommendation: 'INDICADO_PROMOCAO',
    observations: 'Nota máxima. Promoção aprovada para Tech Lead. Assumirá liderança formal do capítulo back-end no Q3.' },

  // ── BEATRIZ LIMA (Back-end) — excelência em ascensão ─────────────────────
  { technician: 'Beatriz Lima', evaluator: 'Juliana Ferreira', cycle: '2025-Q3',
    createdAt: new Date('2025-08-20'), profile: 'BOM_ALTO',
    observations: 'Profissional de alto nível. Sólida em Node.js e sistemas distribuídos. Entregas confiáveis.' },
  { technician: 'Beatriz Lima', evaluator: 'Juliana Ferreira', cycle: '2025-Q4',
    createdAt: new Date('2025-11-25'), profile: 'OTIMO_BAIXO',
    recommendation: 'ELEGIVEL_BONUS',
    observations: 'Cruzou para o Ótimo. Redesenho da camada de cache reduziu latência em 40%. Elegível para bônus.' },
  { technician: 'Beatriz Lima', evaluator: 'Juliana Ferreira', cycle: '2026-Q1',
    createdAt: new Date('2026-03-10'), profile: 'OTIMO_MEDIO',
    recommendation: 'ELEGIVEL_BONUS',
    observations: 'Mantém excelência. Conduziu spike de migração para microserviços com resultados promissores.' },
  { technician: 'Beatriz Lima', evaluator: 'Juliana Ferreira', cycle: '2026-Q2',
    createdAt: new Date('2026-04-20'), profile: 'OTIMO_ALTO',
    recommendation: 'INDICADO_PROMOCAO',
    observations: 'Trajetória exemplar de evolução contínua. Indicada para promoção para Sênior Back-end.' },

  // ── DIEGO COSTA (Back-end) — melhorando gradualmente ─────────────────────
  { technician: 'Diego Costa', evaluator: 'Roberto Nunes', cycle: '2025-Q3',
    createdAt: new Date('2025-08-20'), profile: 'REGULAR_ALTO',
    observations: 'Habilidades técnicas na média, mas falta de proatividade é um limitador. Acompanhamento iniciado.' },
  { technician: 'Diego Costa', evaluator: 'Roberto Nunes', cycle: '2025-Q4',
    createdAt: new Date('2025-11-25'), profile: 'REGULAR_ALTO',
    observations: 'Sem avanço expressivo no trimestre. Comprometimento ainda é ponto de atenção. Feedback direto dado.' },
  { technician: 'Diego Costa', evaluator: 'Roberto Nunes', cycle: '2026-Q1',
    createdAt: new Date('2026-03-10'), profile: 'BOM_BAIXO',
    observations: 'Entrou para o BOM! Mudança de postura perceptível após feedback do Q4. Progresso sendo acompanhado.' },
  { technician: 'Diego Costa', evaluator: 'Roberto Nunes', cycle: '2026-Q2',
    createdAt: new Date('2026-04-20'), profile: 'BOM_MEDIO',
    observations: 'Evolução consistente mantida. Demonstra agora iniciativa própria. Tendência positiva para Q3.' },

  // ── SOFIA BARBOSA (Back-end) — caso crítico em recuperação ───────────────
  { technician: 'Sofia Barbosa', evaluator: 'Roberto Nunes', cycle: '2025-Q3',
    createdAt: new Date('2025-08-20'), profile: 'CRITICO_BAIXO',
    recommendation: 'ATENCAO_URGENTE',
    observations: 'Situação crítica. Múltiplos bugs em produção, ausências e baixíssima interação com o time. Intervenção urgente iniciada.' },
  { technician: 'Sofia Barbosa', evaluator: 'Roberto Nunes', cycle: '2025-Q4',
    createdAt: new Date('2025-11-25'), profile: 'CRITICO_ALTO',
    recommendation: 'ATENCAO_URGENTE',
    observations: 'Pequena melhora pontual, ainda em estado crítico. Reunião com RH realizada. Prazo final para reversão no Q1.' },
  { technician: 'Sofia Barbosa', evaluator: 'Roberto Nunes', cycle: '2026-Q1',
    createdAt: new Date('2026-03-10'), profile: 'REGULAR_BAIXO',
    recommendation: 'PLANO_DESENVOLVIMENTO',
    observations: 'Saiu do Crítico! Evolução real. Frequência normalizada. PDI em andamento. Confiança em recuperação completa.' },
  { technician: 'Sofia Barbosa', evaluator: 'Roberto Nunes', cycle: '2026-Q2',
    createdAt: new Date('2026-04-20'), profile: 'REGULAR_ALTO',
    recommendation: 'PLANO_DESENVOLVIMENTO',
    observations: 'Trajetória de recuperação se mantém. Já contribui ativamente nas dailies. PDI sendo concluído.' },

  // ── ALEXANDRE NUNES (Outros) — sólido e confiável ────────────────────────
  { technician: 'Alexandre Nunes', evaluator: 'Ana Lima', cycle: '2025-Q3',
    createdAt: new Date('2025-08-20'), profile: 'BOM_MEDIO',
    observations: 'Profissional confiável. Cumpre o esperado da função, boa relação interpessoal.' },
  { technician: 'Alexandre Nunes', evaluator: 'Ana Lima', cycle: '2025-Q4',
    createdAt: new Date('2025-11-25'), profile: 'BOM_MEDIO',
    recommendation: 'ELEGIVEL_BONUS',
    observations: 'Manteve nível BOM e teve destaque em projeto de integração cross-team. Elegível para bônus.' },
  { technician: 'Alexandre Nunes', evaluator: 'Ana Lima', cycle: '2026-Q1',
    createdAt: new Date('2026-03-10'), profile: 'BOM_ALTO',
    observations: 'Melhorou em proatividade. Propôs automatização de processo que economizou 3h/semana do time.' },
  { technician: 'Alexandre Nunes', evaluator: 'Ana Lima', cycle: '2026-Q2',
    createdAt: new Date('2026-04-20'), profile: 'BOM_ALTO',
    recommendation: 'ELEGIVEL_BONUS',
    observations: 'Mantém BOM_ALTO. Eleito "colaborador do trimestre" pelo próprio time. Elegível para bônus.' },

  // ── PATRICIA ROCHA (Outros) — recuperação consistente ────────────────────
  { technician: 'Patricia Rocha', evaluator: 'Carlos Mendes', cycle: '2025-Q3',
    createdAt: new Date('2025-08-20'), profile: 'REGULAR_MEDIO',
    recommendation: 'PLANO_DESENVOLVIMENTO',
    observations: 'Dificuldades na autonomia e comunicação. PDI com foco em comunicação assertiva e gestão do próprio trabalho.' },
  { technician: 'Patricia Rocha', evaluator: 'Carlos Mendes', cycle: '2025-Q4',
    createdAt: new Date('2025-11-25'), profile: 'REGULAR_ALTO',
    observations: 'Evolução perceptível. Mais comunicativa, cumpre prazos com mais consistência.' },
  { technician: 'Patricia Rocha', evaluator: 'Carlos Mendes', cycle: '2026-Q1',
    createdAt: new Date('2026-03-10'), profile: 'BOM_BAIXO',
    observations: 'Entrou para o BOM. Superou as metas do PDI. Encerramento formal do plano de desenvolvimento.' },
  { technician: 'Patricia Rocha', evaluator: 'Carlos Mendes', cycle: '2026-Q2',
    createdAt: new Date('2026-04-20'), profile: 'BOM_BAIXO',
    observations: 'Estabilizou no BOM. Jornada de melhoria reconhecida pelo time. Acompanhamento mensal mantido por precaução.' },

  // ── DANIEL FERREIRA (Outros) — caso crítico persistente ──────────────────
  { technician: 'Daniel Ferreira', evaluator: 'Roberto Nunes', cycle: '2025-Q3',
    createdAt: new Date('2025-08-20'), profile: 'CRITICO_BAIXO',
    recommendation: 'ATENCAO_URGENTE',
    observations: 'Desempenho muito abaixo do esperado. Faltas frequentes, entregas incompletas. Atenção urgente requerida.' },
  { technician: 'Daniel Ferreira', evaluator: 'Roberto Nunes', cycle: '2025-Q4',
    createdAt: new Date('2025-11-25'), profile: 'CRITICO_ALTO',
    recommendation: 'ATENCAO_URGENTE',
    observations: 'Pequena melhora insuficiente. Ainda em estado crítico. Segunda intervenção de RH realizada. Prazo final definido.' },
  { technician: 'Daniel Ferreira', evaluator: 'Roberto Nunes', cycle: '2026-Q1',
    createdAt: new Date('2026-03-10'), profile: 'CRITICO_ALTO',
    recommendation: 'ATENCAO_URGENTE',
    observations: 'Terceiro ciclo crítico. Processo formal de desligamento iniciado mediante não reversão até fim do Q2.' },
  { technician: 'Daniel Ferreira', evaluator: 'Roberto Nunes', cycle: '2026-Q2',
    createdAt: new Date('2026-04-20'), profile: 'REGULAR_BAIXO',
    recommendation: 'PLANO_DESENVOLVIMENTO',
    observations: 'Reverteu o crítico por margem mínima. Compromisso formal assumido. Acompanhamento intensivo no Q3.' },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[seed] Iniciando população do banco de dados...\n');

  // ── 1. Upsert users ──────────────────────────────────────────────────────
  const users: Record<string, string> = {};
  for (const u of USERS_DATA) {
    const user = await prisma.user.upsert({
      where:  { email: u.email },
      update: { name: u.name, role: u.role },
      create: { email: u.email, googleId: u.googleId, name: u.name, role: u.role },
      select: { id: true },
    });
    users[u.name] = user.id;
    console.log(`[seed] Usuário  : ${u.name} (${u.role})`);
  }

  // ── 2. Upsert technicians ────────────────────────────────────────────────
  const technicians: Record<string, string> = {};
  for (const t of TECHNICIANS_DATA) {
    const tech = await prisma.technician.upsert({
      where:  { email: t.email },
      update: { name: t.name, team: t.team },
      create: { name: t.name, email: t.email, team: t.team },
      select: { id: true },
    });
    technicians[t.name] = tech.id;
    console.log(`[seed] Técnico  : ${t.name} (${t.team})`);
  }

  console.log('');

  // ── 3. Create evaluations (idempotente: pula ciclo já existente) ─────────
  let created = 0;
  let skipped = 0;

  for (const spec of EVAL_SPECS) {
    const technicianId = technicians[spec.technician];
    const evaluatorId  = users[spec.evaluator];

    if (!technicianId || !evaluatorId) {
      console.warn(`[seed] WARN: referência inválida — ${spec.technician} / ${spec.evaluator}`);
      continue;
    }

    const existing = await prisma.evaluation.findFirst({
      where: { technicianId, cycle: spec.cycle },
      select: { id: true },
    });
    if (existing) { skipped++; continue; }

    const calc   = calculateScores(PROFILES[spec.profile]);
    const scores = PROFILES[spec.profile];

    await prisma.evaluation.create({
      data: {
        technicianId,
        evaluatorId,
        cycle:          spec.cycle,
        createdAt:      spec.createdAt,
        technicalScore: calc.technicalScore,
        behavioralScore: calc.behavioralScore,
        finalScore:     calc.finalScore,
        classification: calc.classification,
        recommendation: spec.recommendation,
        observations:   spec.observations,
        scores: {
          create: scores.map(s => ({
            block:        s.block,
            criterionKey: s.criterionKey,
            score:        s.score,
            weight:       s.weight,
          })),
        },
      },
    });

    created++;
    console.log(`[seed] Avaliação: ${spec.technician.padEnd(20)} | ${spec.cycle} | ${calc.classification.padEnd(7)} | nota ${calc.finalScore}`);
  }

  console.log(`
[seed] ──────────────────────────────────────
[seed] ✓ Concluído!
[seed]   ${Object.keys(users).length} usuários avaliadores
[seed]   ${Object.keys(technicians).length} técnicos
[seed]   ${created} avaliações criadas  (${skipped} já existiam — ignoradas)
[seed] ──────────────────────────────────────
  `);
}

main()
  .catch((err) => {
    console.error('[seed] Erro:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
