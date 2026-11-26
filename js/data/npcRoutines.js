// 6B — papéis, semana e rotinas diárias dos moradores (docs/PERDIDO_Rotinas_NPCs_6B.docx, itens 3–5).
// Horários em MINUTOS DE JOGO (0..1439), valem em qualquer velocidade do relógio. Cada morador desloca o dia em 10–30 min (semente).
export const ROLES = {
  lider:      { label: 'líder', fem: 'líder', work: -1, place: 'meeting_area' },   // sem pose própria: fica de pé, atendendo
  agricultor: { label: 'agricultor', fem: 'agricultora', work: 0, place: 'farm' },
  pescador:   { label: 'pescador', fem: 'pescadora', work: 1, place: 'fishing_spot' },
  cacador:    { label: 'caçador', fem: 'caçadora', work: 2, place: 'hunting_area' },
  artesao:    { label: 'artesão', fem: 'artesã', work: 3, place: 'workbench' },
  morador:    { label: 'morador', fem: 'moradora', work: 4, place: 'water_source' },
  guardiao:   { label: 'guardião', fem: 'guardiã', work: 5, place: 'guard_post' },
};
// Chance de a pessoa ser MULHER, por profissão e povo. São PESOS DE GERAÇÃO ficcionais e ajustáveis (decididos pelo autor para
// dar variedade e leitura ao jogo), não afirmações históricas nem antropológicas. Maioria de um sexo em cada profissão, nunca exclusividade:
// todas as profissões ficam acessíveis a todos. Os "moradores" compensam no fim para a vila não ficar só de homens ou só de mulheres.
export const FEM_SHARE = {
  lider:      { indigena: 0.15, quilombola: 0.40, ribeirinho: 0.30 },
  agricultor: { indigena: 0.75, quilombola: 0.55, ribeirinho: 0.55 },
  pescador:   { indigena: 0.10, quilombola: 0.25, ribeirinho: 0.20 },
  cacador:    { indigena: 0.05, quilombola: 0.10, ribeirinho: 0.05 },
  artesao:    { indigena: 0.60, quilombola: 0.55, ribeirinho: 0.50 },
  morador:    { indigena: 0.70, quilombola: 0.70, ribeirinho: 0.70 },
  guardiao:   { indigena: 0.10, quilombola: 0.15, ribeirinho: 0.15 },
};
// semana: T = trabalho, M = manutenção, D = descanso (o padrão gira por morador para espalhar as folgas)
export const WEEK = {
  agricultor: 'TTMTDTD', pescador: 'TDTTMDT', cacador: 'DTTMTTD', artesao: 'TMTDTDT', morador: 'TTDTMTD', guardiao: 'TDTTDMT', lider: 'TTMDTTD',
};
// perfis de 10 moradores (o líder vem à parte); vilas menores pegam os primeiros da lista
export const PROFILES = {
  indigena:   ['guardiao', 'agricultor', 'cacador', 'pescador', 'artesao', 'agricultor', 'cacador', 'morador', 'morador'],
  quilombola: ['guardiao', 'agricultor', 'artesao', 'agricultor', 'pescador', 'cacador', 'agricultor', 'artesao', 'morador'],
  ribeirinho: ['guardiao', 'pescador', 'artesao', 'pescador', 'agricultor', 'pescador', 'cacador', 'artesao', 'morador'],
};
// rotinas de um dia de TRABALHO: [início (min), lugar, tipo]. tipo: sleep (em casa, escondido), home (em casa), work, carry (levando para casa), eat, social
const h = (hh, mm = 0) => hh * 60 + mm;
export const DAY_T = {
  agricultor: [[0, 'home', 'sleep'], [h(5, 30), 'home', 'home'], [h(7), 'farm', 'work'], [h(9), 'water_source', 'work'], [h(10), 'farm', 'work'], [h(12), 'home', 'eat'], [h(13), 'farm', 'work'], [h(15), 'home', 'carry'], [h(16), 'workbench', 'work'], [h(17, 30), 'home', 'eat'], [h(19), 'meeting_area', 'social'], [h(21), 'home', 'sleep']],
  pescador:   [[0, 'home', 'sleep'], [h(4, 30), 'home', 'home'], [h(6), 'fishing_spot', 'work'], [h(9), 'home', 'carry'], [h(10), 'fishing_spot', 'work'], [h(12), 'home', 'eat'], [h(13), 'dock', 'work'], [h(15), 'fishing_spot', 'work'], [h(17), 'meeting_area', 'social'], [h(19), 'home', 'eat'], [h(20, 30), 'home', 'sleep']],
  cacador:    [[0, 'home', 'sleep'], [h(6), 'home', 'home'], [h(7), 'workbench', 'work'], [h(9), 'hunting_area', 'work'], [h(12), 'home', 'eat'], [h(13), 'workbench', 'work'], [h(14, 30), 'hunting_area', 'work'], [h(17), 'home', 'carry'], [h(18), 'home', 'eat'], [h(19), 'meeting_area', 'social'], [h(21), 'home', 'sleep']],
  artesao:    [[0, 'home', 'sleep'], [h(6), 'home', 'home'], [h(7), 'workbench', 'work'], [h(9), 'hunting_area', 'work'], [h(10, 30), 'workbench', 'work'], [h(12), 'home', 'eat'], [h(13, 30), 'workbench', 'work'], [h(15, 30), 'meeting_area', 'social'], [h(17), 'home', 'eat'], [h(19), 'meeting_area', 'social'], [h(21), 'home', 'sleep']],
  morador:    [[0, 'home', 'sleep'], [h(6), 'home', 'home'], [h(7), 'water_source', 'work'], [h(8), 'home', 'carry'], [h(9), 'meeting_area', 'work'], [h(10), 'farm', 'work'], [h(12), 'home', 'eat'], [h(14), 'workbench', 'work'], [h(16), 'meeting_area', 'social'], [h(18), 'home', 'eat'], [h(21), 'home', 'sleep']],
  guardiao:   [[0, 'home', 'sleep'], [h(6), 'home', 'home'], [h(7), 'patrol', 'work'], [h(9), 'guard_post', 'work'], [h(12), 'home', 'eat'], [h(13), 'patrol', 'work'], [h(15), 'workbench', 'work'], [h(18), 'guard_post', 'work'], [h(22), 'home', 'sleep']],
  lider:      [[0, 'home', 'sleep'], [h(6), 'home', 'home'], [h(7), 'visit', 'social'], [h(9), 'meeting_area', 'work'], [h(12), 'home', 'eat'], [h(13), 'workbench', 'work'], [h(15), 'meeting_area', 'work'], [h(17), 'meeting_area', 'social'], [h(19), 'home', 'eat'], [h(21), 'home', 'sleep']],
};
// manutenção: trabalho leve perto de casa / na bancada
export const DAY_M = [[0, 'home', 'sleep'], [h(6, 30), 'home', 'home'], [h(8), 'workbench', 'work'], [h(12), 'home', 'eat'], [h(13, 30), 'home', 'home'], [h(15), 'workbench', 'work'], [h(17), 'meeting_area', 'social'], [h(19), 'home', 'eat'], [h(21), 'home', 'sleep']];
// descanso: acorda mais tarde, visita, passeia, terreiro
export const DAY_D = [[0, 'home', 'sleep'], [h(7), 'home', 'home'], [h(9), 'visit', 'social'], [h(11), 'stroll', 'social'], [h(12, 30), 'home', 'eat'], [h(14), 'home', 'home'], [h(16), 'meeting_area', 'social'], [h(18, 30), 'home', 'eat'], [h(21, 30), 'home', 'sleep']];
// atividade do lugar -> linha da folha de trabalho (profissão ≠ atividade): quem não tem pose para a tarefa usa o quadro neutro
export const ACTIVITY_ANIM = { farm: 0, fishing_spot: 1, dock: 1, hunting_area: 2, workbench: 3, water_source: 4, meeting_area: 4, guard_post: 5, patrol: 5 };
// o que a PROFISSÃO sabe fazer de cada atividade (agricultor só capina na roça; na bancada ou na fonte fica neutro)
export const CAN_ANIM = { agricultor: ['farm'], pescador: ['fishing_spot', 'dock'], cacador: ['hunting_area'], artesao: ['workbench'], morador: ['water_source', 'meeting_area'], guardiao: ['guard_post', 'patrol'], lider: [] };
export const NPC = { SPEED: 48, ACTIVE: 30, INACTIVE: 45, LINES: {
  lider: ['Seja bem-vindo. Aqui todo mundo trabalha e todo mundo come.', 'Se precisar de alguma coisa, fale comigo.'],
  agricultor: ['A terra pede paciência.', 'Nas Chuvas a gente planta; na Seca a gente rega.'],
  pescador: ['O peixe vem cedo, antes do sol esquentar.', 'Rede rasgada não pega nada.'],
  cacador: ['A mata ensina quem sabe ouvir.', 'Sem pressa: o bicho sente o cheiro do medo.'],
  artesao: ['Corda boa é fibra bem torcida.', 'Uma peça bem feita dura uma vida.'],
  morador: ['A água da lagoa é boa.', 'Fica um pouco, o dia está bonito.'],
  guardiao: ['Eu fico de olho em quem chega pelo mar.', 'Por aqui está tudo em paz.'],
} };
export const FIRST = {
  indigena: { f: ['Jaci', 'Iara', 'Moema', 'Potira', 'Inaiê', 'Aracy', 'Yara'], m: ['Raoni', 'Tainã', 'Kauê', 'Ubiratã', 'Iberê', 'Caiubi', 'Peri'] },
  quilombola: { f: ['Dandara', 'Benedita', 'Zeferina', 'Luzia', 'Tereza', 'Josefa', 'Aqualtune'], m: ['Benedito', 'Zumbi', 'Ganga', 'Sebastião', 'Cosme', 'Damião', 'Bento'] },
  ribeirinho: { f: ['Jurema', 'Raimunda', 'Francisca', 'Socorro', 'Nazaré', 'Graça', 'Conceição'], m: ['Raimundo', 'Chico', 'Manoel', 'Tião', 'Zé Maria', 'Expedito', 'Joaquim'] },
};
