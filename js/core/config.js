// Configurações centrais. Ajuste aqui, não espalhe números pelo código.
export const CONFIG = {
  REF_HEIGHT: 360,      // altura lógica de referência; define a escala inteira automática (zoom padrão)
  ZOOM_MIN_SCALE: 2,    // zoom afastado nunca desce de 2x (a 1x o texto e o personagem ficariam pequenos demais)
  ZOOM_MAX_STEPS: 2,    // até 2 níveis mais longe que o automático
  TILE_SIZE: 32,
  MAX_DELTA: 0.1,       // segundos; evita "teleporte" após troca de aba
  CAMERA_SMOOTH: 10,    // maior = câmera mais "colada" ao jogador
  PLAYER: {
    SPEED: 75,          // px de mundo por segundo (passada desenhada é curta; 75 foi aprovado no teste)
    RUN_MULT: 1.6,      // Shift = correr: 120 px/s
    RUN_STEP_MULT: 1.25, // na corrida a passada da animação é 25% mais longa (os pés não ficam frenéticos)
    WADE_MULT: 0.55,    // dentro de um vau (água na cintura): mais lento e sem correr
    FOOT_W: 16,         // área de colisão nos pés
    FOOT_H: 10,
    ANCHOR_Y: 63,       // altura do sprite acima dos pés (usada pelo balão de interação)
    WAIST_H: 24,        // altura da cintura acima dos pés (linha da água dentro de um vau)
    ANIM_FPS: 8,        // quadros por segundo da caminhada
    DEFAULT: 'female',  // personagem inicial (veja js/data/characters.js)
  },
  INTERACT_RANGE: 22,   // distância máxima (px) dos pés até o objeto
  WATER_ANIM: true,     // água animada ligada (tecla O liga/desliga; a escolha fica guardada)
  WATER_RIVER_SPEED: 20,  // px/s da correnteza dos rios (camada principal; a fina anda a 55%; o vau a 60%)
  WATER_WAVE_SPEED: 5,    // px/s da deriva das cristas de onda do mar (lago: metade)
  WATER_SPARKLE_FPS: 3,   // quadros por segundo dos brilhos da água
  WATER_SWASH_SPEED: 1.5, // rad/s da marola (pulsação da faixa rasa junto da costa)
  CHUNK_TILES: 16,      // chão desenhado em pedaços de 16x16 tiles (512 px)
  MAX_CHUNKS: 64,       // limite de pedaços em cache (~1 MB cada); com zoom afastado a tela mostra mais pedaços
  WATER_INSET: 10,      // quanto da borda do tile de água ainda é caminhável (areia/espuma)
  SAVE: {
    BACKEND: 'local',     // 'local' (navegador) | 'supabase' (veja docs/supabase/saves.sql e js/save/supabaseStore.js)
    SUPABASE_URL: '',     // ex.: 'https://xxxx.supabase.co'
    SUPABASE_ANON_KEY: '',
    AUTOSAVE_SECONDS: 60, // salva sozinho a cada minuto real de jogo (e ao voltar ao menu / fechar a aba)
  },
  DEV_CODE: 'perdido',  // código que libera o terminal de desenvolvimento (tecla ' / Backquote)
  HIT_REPEAT: 0.4,      // s entre golpes segurando E
  WEATHER: {
    RAIN_DENSITY: 1,      // multiplica a quantidade de pingos
    WAVE_WIND: 6,         // px/s que o vento empurra as cristas do mar (com vento máximo)
  },
  CLOCK: {
    DAY_SECONDS: 720,     // um dia de jogo = 12 minutos reais (24 h de jogo)
    START_DAY_MINUTES: 6.5 * 60,   // começa no dia 1, 06:30, nas Chuvas
  },
  BOAT_SPEED: 95,       // px/s remando
  BOAT_CURRENT: 14,     // px/s que a correnteza do rio empurra a canoa
  BOAT_FPS: 6,          // quadros de remada por segundo
  MAP_SHOW_CANOE: true, // TEMPORÁRIO: mostra a canoa no mapa (F4). Depois: só depois de achá-la pela 1a vez ou fabricar uma
  DEBUG_LEVEL: 0,       // 0 = nada, 1 = FPS/posição, 2 = + colisões (tecla F3 alterna)
};
