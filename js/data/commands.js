// Tela de comandos (celular): a lista vem desta tabela. Cada linha = um botão. Um comando novo = uma linha nova.
//   id, cat (categoria), label, desc (o que faz), params: [{ key, label, opts: [[rótulo, valor], ...] }], make(valores) → texto do comando
//   (o texto é executado pelo mesmo `Terminal.run` do computador: um só lugar para as regras)
export const CMD_CATS = [
  { id: 'tempo',     label: 'Tempo',        color: '#e8c84a' },
  { id: 'pessoa',    label: 'Personagem',   color: '#e05a4a' },
  { id: 'itens',     label: 'Itens',        color: '#7fb7e0' },
  { id: 'casa',      label: 'Casa e obra',  color: '#d9a066' },
  { id: 'mundo',     label: 'Mundo',        color: '#5fae4a' },
  { id: 'agua',      label: 'Água e canoa', color: '#4aa8d8' },
];
const o = (...pairs) => pairs.map(p => Array.isArray(p) ? p : [String(p), String(p)]);
const VIDA = o(['0', '0'], ['25', '25'], ['50', '50'], ['100', '100']);
const ITEM_LIST = o(['Madeira', 'madeira'], ['Pedra', 'pedra'], ['Corda', 'corda'], ['Fibra', 'fibra'], ['Graveto', 'graveto'], ['Capim', 'capim'], ['Osso', 'osso'], ['Argila', 'argila'], ['Resina', 'resina'],
  ['Folha larga', 'folha_larga'], ['Pedra lascada', 'pedra_lascada'], ['Barra de ferro', 'barra_ferro'], ['Quartzo', 'quartzo'], ['Sal', 'sal'], ['Carvão', 'carvao'], ['Madeira nobre', 'madeira_nobre'], ['Tocha', 'tocha']);
const simple = (id, cat, label, desc, cmd) => ({ id, cat, label, desc, params: [], make: () => cmd });
const withParam = (id, cat, label, desc, param, make) => ({ id, cat, label, desc, params: [param], make });

export const COMMANDS = [
  // ---- Tempo ----
  withParam('hora', 'tempo', 'Hora do dia', 'Muda o relógio para a hora escolhida (o dia continua o mesmo).', { key: 'h', label: 'Hora', opts: o(['0h', '0'], ['6h', '6'], ['9h', '9'], ['12h', '12'], ['15h', '15'], ['18h', '18'], ['21h', '21']) }, (v) => `hora ${v.h}`),
  simple('manha', 'tempo', 'Manhã (06:00)', 'Pula para as 6 da manhã.', 'manha'),
  simple('noite', 'tempo', 'Noite (19:45)', 'Pula para a noite.', 'noite'),
  withParam('dia', 'tempo', 'Avançar dias', 'Passa dias inteiros: plantas crescem, a vila segue a rotina, o rio sobe e desce.', { key: 'n', label: 'Dias', opts: o(['+1', '1'], ['+3', '3'], ['+7', '7'], ['+30', '30']) }, (v) => `dia +${v.n}`),
  withParam('estacao', 'tempo', 'Estação', 'Vai para a estação escolhida.', { key: 'e', label: 'Estação', opts: o(['Chuvas', 'chuvas'], ['Estiagem', 'estiagem'], ['Seca', 'seca'], ['Trovoadas', 'trovoadas'], ['Próxima', 'proxima']) }, (v) => `estacao ${v.e}`),
  withParam('clima', 'tempo', 'Clima', 'Força o tempo (ou volta ao automático).', { key: 'c', label: 'Tempo', opts: o(['Aberto', 'aberto'], ['Nublado', 'nublado'], ['Chuva', 'chuva'], ['Trovoada', 'trovoada'], ['Auto', 'auto']) }, (v) => `clima ${v.c}`),
  withParam('relampago', 'tempo', 'Relâmpagos', 'Liga ou desliga os clarões da trovoada.', { key: 'r', label: 'Clarões', opts: o(['Ligar', 'on'], ['Desligar', 'off']) }, (v) => `relampago ${v.r}`),
  // ---- Personagem ----
  simple('curar', 'pessoa', 'Curar tudo', 'Enche vida, fome, energia e resistência.', 'curar'),
  simple('status', 'pessoa', 'Ver status', 'Mostra vida, fome, energia, resistência e as qualidades.', 'status'),
  withParam('vida', 'pessoa', 'Vida', 'Define a vida (0 a 100).', { key: 'n', label: 'Vida', opts: VIDA }, (v) => `vida ${v.n}`),
  withParam('fome', 'pessoa', 'Fome', 'Define a fome (100 = saciado).', { key: 'n', label: 'Fome', opts: VIDA }, (v) => `fome ${v.n}`),
  withParam('energia', 'pessoa', 'Energia', 'Define a energia.', { key: 'n', label: 'Energia', opts: VIDA }, (v) => `energia ${v.n}`),
  withParam('resistencia', 'pessoa', 'Resistência', 'Define a resistência ao tempo (frio, chuva).', { key: 'n', label: 'Resistência', opts: VIDA }, (v) => `resistencia ${v.n}`),
  withParam('personagem', 'pessoa', 'Trocar personagem', 'Troca só o visual (as qualidades continuam).', { key: 'p', label: 'Quem', opts: o(['Nawa', 'nawa'], ['Cauã', 'caua'], ['Helena', 'helena'], ['Mateus', 'mateus']) }, (v) => `personagem ${v.p}`),
  // ---- Itens ----
  { id: 'dar', cat: 'itens', label: 'Dar item', desc: 'Põe a quantidade escolhida do item na mochila.', params: [{ key: 'i', label: 'Item', opts: ITEM_LIST }, { key: 'n', label: 'Quantos', opts: o('1', '10', '50') }], make: (v) => `dar ${v.i} ${v.n}` },
  simple('dar_ferr', 'itens', 'Ferramentas de pedra', 'Machado e picareta de pedra, novos.', 'dar ferramentas'),
  simple('dar_mat', 'itens', '+20 de cada material', 'Pedra, madeira, capim, fibra, corda, graveto, osso e pedra lascada.', 'dar materiais'),
  simple('dar_tudo', 'itens', 'Um pouco de tudo', 'Põe 20 de cada item (e 1 de cada ferramenta).', 'dar tudo'),
  simple('kit_caca', 'itens', 'Kit de caça', 'Adaga, lança, arco e 10 flechas.', 'caca'),
  simple('kit_pesca', 'itens', 'Kit de pesca', 'Vara, anzóis, minhocas e arpão.', 'pesca'),
  simple('kit_roca', 'itens', 'Kit de roça', 'Enxada, pá, manivas, sementes e cabaças.', 'roca'),
  simple('luz', 'itens', 'Tocha acesa', 'Dá 3 tochas e acende uma.', 'luz'),
  simple('reparar', 'itens', 'Reparar ferramentas', 'Zera o desgaste de tudo.', 'reparar'),
  simple('durab', 'itens', 'Ver durabilidade', 'Lista o desgaste de cada ferramenta.', 'durabilidade'),
  simple('limpar_inv', 'itens', 'Esvaziar mochila', 'Tira tudo da mochila. Sem volta.', 'limpar-inventario'),
  // ---- Casa e obra ----
  simple('kits_casa', 'casa', 'Kits de casa', 'Casa, cama, baú, bancada e abrigo.', 'casa'),
  simple('bancada', 'casa', 'Bancada de bolso', 'Liga ou desliga: fabrica tudo sem bancada por perto.', 'bancada'),
  simple('dormir', 'casa', 'Dormir', 'Dorme na primeira cama montada.', 'dormir'),
  withParam('nivel', 'casa', 'Nível da casa', 'Muda sua casa para o nível escolhido (1 a 4), sem gastar material.', { key: 'n', label: 'Nível', opts: o('1', '2', '3', '4') }, (v) => `nivel ${v.n}`),
  // ---- Mundo ----
  simple('versao', 'mundo', 'Versão do jogo', 'Mostra a versão e a data deste pacote.', 'versao'),
  simple('onde', 'mundo', 'Onde estou', 'Mostra a posição em tiles e o código do mundo.', 'onde'),
  withParam('ir', 'mundo', 'Ir para…', 'Leva você para perto do lugar escolhido.', { key: 'l', label: 'Lugar', opts: o(['Início', 'inicio'], ['Canoa', 'canoa'], ['Ilhota', 'ilhota']) }, (v) => `ir ${v.l}`),
  simple('vilas', 'mundo', 'Listar vilas', 'Lista as ilhas de vila e quem mora em cada uma.', 'vila'),
  withParam('vila_ir', 'mundo', 'Ir à ilha de vila', 'Leva você até a ilha escolhida (a numeração está em "Listar vilas").', { key: 'n', label: 'Ilha', opts: o('0', '1', '2', '3') }, (v) => `vila ir ${v.n}`),
  withParam('vila_fundar', 'mundo', 'Fundar vila', 'Cria uma vila numa ilha virgem.', { key: 'n', label: 'Ilha', opts: o('0', '1', '2', '3') }, (v) => `vila ${v.n}`),
  simple('cavernas', 'mundo', 'Listar cavernas', 'Lista as cavernas do mundo.', 'caverna'),
  withParam('caverna', 'mundo', 'Entrar na caverna', 'Entra na caverna escolhida.', { key: 'n', label: 'Caverna', opts: o('0', '1', '2', '3', '4', '5') }, (v) => `caverna ${v.n}`),
  simple('caverna_sair', 'mundo', 'Sair da caverna', 'Volta para fora.', 'caverna sair'),
  // ---- Água e canoa ----
  simple('canoa', 'agua', 'Estado da canoa', 'Mostra o desgaste e os consertos.', 'canoa'),
  withParam('canoa_pct', 'agua', 'Desgaste da canoa', 'Define quanto da canoa ainda aguenta (100 = nova).', { key: 'n', label: 'Resta', opts: o(['100%', '100'], ['50%', '50'], ['25%', '25'], ['10%', '10']) }, (v) => `canoa ${v.n}`),
  simple('canoa_nova', 'agua', 'Canoa achada', 'Traz a canoa achada de volta para a praia.', 'canoa nova'),
  simple('canoa_quebrar', 'agua', 'Quebrar a canoa', 'Destrói a canoa (para testar o naufrágio).', 'canoa quebrar'),
  withParam('agua', 'agua', 'Água animada', 'Liga ou desliga a animação da água (ajuda em aparelho fraco).', { key: 'a', label: 'Água', opts: o(['Ligar', 'on'], ['Desligar', 'off']) }, (v) => `agua ${v.a}`),
];
export const defaultValues = (cmd) => Object.fromEntries(cmd.params.map(p => [p.key, p.opts[0][1]]));
