// English / Spanish. Interface text is looked up by its English wording, so the code stays
// readable: t('Buy XP'), t('Bought {name}', { name }). Game descriptions carry their own
// Spanish in config (desc_es) and in each module's lists (name_es, desc_es, text_es).
// Proper names (players, teams, traits, keywords, abilities) stay as they are.
const KEY = 'tacticalboom.lang';
let lang = 'en';
try { lang = localStorage.getItem(KEY) === 'es' ? 'es' : 'en'; } catch { /* English */ }

export const getLang = () => lang;
export function setLang(l) {
  lang = l === 'es' ? 'es' : 'en';
  try { localStorage.setItem(KEY, lang); } catch { /* this session only */ }
  translatePage();
}

// An object's own field in the current language: es(obj, 'desc') reads desc_es in Spanish.
export const loc = (obj, field) => (lang === 'es' && obj[`${field}_es`]) || obj[field];

export function t(en, vars = {}) {
  let s = en;
  if (lang === 'es') {
    if (ES[en]) s = ES[en];
    else for (const [re, rep] of PATTERNS) if (re.test(en)) { s = en.replace(re, rep); break; }
  }
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}
export const ordinal = n => (lang === 'es' ? `${n}.º` : n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n] || 'th'));

// Static page text: elements marked data-i18n (text), data-i18n-html (trusted markup from this
// file only) and data-i18n-aria (aria-label). The English original is kept on the element.
export function translatePage(root = document) {
  document.documentElement.lang = lang;
  for (const el of root.querySelectorAll('[data-i18n]')) { el.dataset.en ??= el.textContent; el.textContent = t(el.dataset.en); }
  for (const el of root.querySelectorAll('[data-i18n-html]')) { el.dataset.en ??= el.innerHTML; el.innerHTML = lang === 'es' && ES_HTML[el.dataset.en.trim()] || el.dataset.en; }
  for (const el of root.querySelectorAll('[data-i18n-aria]')) { el.dataset.enAria ??= el.getAttribute('aria-label'); el.setAttribute('aria-label', t(el.dataset.enAria)); }
}

// Messages built from game state that carry numbers inside.
const PATTERNS = [
  [/^Court holds (\d+) at level (\d+)$/, 'La cancha admite $1 en el nivel $2'],
];

export const ES = {
  // header and sections
  'HP': 'Vida', 'Gold': 'Oro', 'Round': 'Ronda', 'Time': 'Tiempo', 'Pause': 'Pausa', 'Resume': 'Seguir', 'Settings': 'Ajustes',
  'History': 'Historial', 'How to play': 'Cómo jugar', 'New game': 'Nueva partida', 'Got it': 'Entendido', 'Hide tips': 'Ocultar consejos',
  'Court': 'Cancha', 'Players': 'Jugadoras', 'Fight damage': 'Daño del partido', 'Fights': 'Partidos', 'tap one to watch it': 'toca uno para verlo',
  "This round's other fights": 'Otros partidos de esta ronda', 'Traits': 'Rasgos', 'Bench': 'Banca', 'Shop': 'Tienda',
  'Sell': 'Vender', 'Reroll': 'Renovar', 'Buy XP': 'Comprar XP', 'Next round': 'Siguiente ronda', 'Skip': 'Saltar',
  'Status': 'Estado', 'Court hexes, your half': 'Hexágonos de la cancha, tu mitad', 'Bench slots': 'Puestos de la banca', 'Shop cards': 'Cartas de la tienda',
  'Actions': 'Acciones', 'Augment choices': 'Opciones de mejora', 'Carousel players': 'Jugadoras del carrusel', 'Players list': 'Lista de jugadoras',
  // dialogs
  'Close': 'Cerrar', 'Cancel': 'Cancelar', 'The current game ends.': 'La partida actual termina.', 'Free play': 'Partida libre', "Today's challenge": 'Reto del día',
  'Kept on this device.': 'Se guarda en este dispositivo.', 'Sound': 'Sonido', 'Auto-advance timer': 'Avance automático', 'Bots': 'Bots',
  'Easy': 'Fácil', 'Normal': 'Normal', 'Hard': 'Difícil', 'Applies from the next new game.': 'Se aplica desde la próxima partida.',
  'Fight speed': 'Velocidad del partido', 'Motion': 'Movimiento', 'Follow this device': 'Según el dispositivo', 'Reduce': 'Reducir', 'Tips': 'Consejos',
  'Text size': 'Tamaño del texto', 'Standard': 'Normal', 'Large': 'Grande', 'Larger': 'Más grande', 'Language': 'Idioma',
  'Players on your final boards': 'Jugadoras en tus equipos finales', 'Player': 'Jugadora', 'Games': 'Partidas', 'Avg place': 'Puesto medio', 'Wins': 'Victorias',
  'Achievements': 'Logros', 'Kept on this device only. The feedback file holds these game facts and nothing else.': 'Solo en este dispositivo. El archivo de comentarios contiene estos datos de partidas y nada más.',
  'Download feedback file': 'Descargar archivo de comentarios', 'Clear history': 'Borrar historial', 'Carousel': 'Carrusel',
  'Lowest HP picks first. Take one player for free; if time runs out you get the first open one.': 'Elige primero quien tiene menos vida. Llévate una jugadora gratis; si se acaba el tiempo recibes la primera libre.',
  'Pick an augment': 'Elige una mejora', 'It lasts the whole game. If time runs out you get the first one.': 'Dura toda la partida. Si se acaba el tiempo recibes la primera.',
  'Game over': 'Fin de la partida', 'Sound on': 'Sonido activado', 'Sound off': 'Sonido desactivado', 'off': 'no',
  // status line and labels
  ' practice': ' práctica', ' · daily': ' · reto del día', 'Lv {level}': 'Nv {level}', ' (max)': ' (máx.)', ' · {n} XP to next': ' · {n} XP para subir',
  'arrow keys move between hexes': 'las flechas mueven entre hexágonos', 'scouting {name}: {traits}': 'espiando a {name}: {traits}', 'no traits': 'sin rasgos',
  'Augments: {list}': 'Mejoras: {list}', 'Reroll free ({n}) ': 'Renovar gratis ({n}) ', 'Reroll ': 'Renovar ', 'Sell for {g}g': 'Vender por {g} de oro',
  'Place units on the court to start traits.': 'Pon jugadoras en la cancha para activar rasgos.', '. Tap to show who holds it.': '. Toca para ver quién lo tiene.', 'Showing who holds {name}': 'Mostrando quién tiene {name}', 'Trait highlight off': 'Resaltado de rasgo apagado', 'wild cards: {list}': 'comodines: {list}', '{name} as {role}': '{name} como {role}',
  '{name}: {count} of {next} to start': '{name}: {count} de {next} para activarse', 'Sold': 'Vendida', 'Buy ': 'Comprar ', 'Take ': 'Elegir ',
  'Taken: {name}': 'Elegida: {name}', '{tier}-cost': 'cuesta {tier}', '{name}, {hp} HP. Stop scouting': '{name}, {hp} de vida. Dejar de espiar',
  '{name}, {hp} HP. Scout their board': '{name}, {hp} de vida. Espiar su equipo', '{hp} HP': '{hp} de vida', 'Empty {where} slot {k}': 'Puesto vacío de {where} {k}',
  'bench': 'banca', 'court': 'cancha', '{name}, {star} star, {style}, {where} slot {k}': '{name}, {star} estrella(s), {style}, {where} puesto {k}', ', selected': ', seleccionada',
  'Empty court row {r} column {c}': 'Cancha vacía, fila {r}, columna {c}', '{name}, {star} star, {style}, court row {r} column {c}': '{name}, {star} estrella(s), {style}, cancha fila {r} columna {c}',
  // fights
  '{label}: fight against {opp}.': '{label}: partido contra {opp}.', '{label}: replay of your fight against {opp}.': '{label}: repetición de tu partido contra {opp}.',
  '{label}: {a} against {b}.': '{label}: {a} contra {b}.', ' (a copy)': ' (una copia)', ' (copy)': ' (copia)', 'Escape skips.': 'Escape salta.',
  'Replay of {label} finished': 'Terminó la repetición de {label}', '{a} against {b} finished': 'Terminó {a} contra {b}', 'won': 'ganado', 'draw': 'empate',
  'lost −{n}': 'perdido −{n}', '{winner} won': 'ganó {winner}', 'Replay {what}': 'Repetir {what}', 'Watch {what}': 'Ver {what}',
  'Fight damage, {label} vs {opp}': 'Daño del partido, {label} contra {opp}', 'Fight damage, {label}: {a} vs {b}': 'Daño del partido, {label}: {a} contra {b}',
  '{label}: practice, no health lost': '{label}: práctica, sin perder vida', '{label}: no fight': '{label}: sin partido', '{label} vs {opp}: ': '{label} contra {opp}: ',
  'lost, −{n} HP': 'perdido, −{n} de vida', '{line}. Round {label}, +{gold} gold.': '{line}. Ronda {label}, +{gold} de oro.',
  // game over and history
  'You finished {place} of {n}.': 'Terminaste en el puesto {place} de {n}.', ' Rating {sign}{delta} to {rating} ({rank}{moved}).': ' Puntuación {sign}{delta}, ahora {rating} ({rank}{moved}).',
  ', up from {rank}': ', subes desde {rank}', ', down from {rank}': ', bajas desde {rank}', 'New achievements: {list}': 'Logros nuevos: {list}', 'New achievement: {list}': 'Logro nuevo: {list}',
  'Game over. You finished {place}.': 'Fin de la partida. Terminaste en el puesto {place}.',
  '{n} games on this device. Average place {avg}, {won} won.': '{n} partidas en este dispositivo. Puesto medio {avg}, {won} ganadas.',
  '1 game on this device. Average place {avg}, {won} won.': '1 partida en este dispositivo. Puesto medio {avg}, {won} ganadas.',
  'No finished games yet. Finish a game and it appears here.': 'Aún no hay partidas terminadas. Termina una y aparecerá aquí.',
  " Today's challenge best: {place}.": ' Mejor puesto en el reto de hoy: {place}.',
  'Rank: {rank}, rating {rating}{peak}, {games} rated games. Clear history does not reset it.': 'Rango: {rank}, puntuación {rating}{peak}, {games} partidas puntuadas. Borrar el historial no lo reinicia.',
  ' (peak {n})': ' (máximo {n})', 'Achievements {n} / {total}': 'Logros {n} / {total}', ' Earned {date}.': ' Conseguido el {date}.', ' Not earned yet.': ' Aún no conseguido.',
  '{date} · {place} of {n} · {diff} bots · out at {round} · {traits}': '{date} · {place} de {n} · bots {diff} · fuera en {round} · {traits}',
  'Delete the game history on this device?': '¿Borrar el historial de partidas de este dispositivo?',
  // messages
  'Bought {name}': 'Compraste a {name}', 'Not enough gold': 'No tienes suficiente oro', 'Bench is full': 'La banca está llena', 'Empty slot': 'Puesto vacío',
  'No such unit': 'No existe esa jugadora', 'Not your pick': 'No es tu turno', 'Already taken': 'Ya la eligieron', 'No augment to pick': 'No hay mejora que elegir',
  'Put down': 'Soltada', '{name} picked up: {style}, {kws}. Tap a hex or bench slot to move, or Sell.': '{name} seleccionada: {style}, {kws}. Toca un hexágono o un puesto de la banca para moverla, o Vender.',
  '{name} moved to court': '{name} pasó a la cancha', '{name} moved to bench': '{name} pasó a la banca', 'Sold for {gold} gold': 'Vendida por {gold} de oro',
  'New shop': 'Tienda nueva', 'Level {n}': 'Nivel {n}', 'Carousel: {name} joins your bench': 'Carrusel: {name} se une a tu banca', 'Augment: {name}. {desc}': 'Mejora: {name}. {desc}',
  'Stopped scouting': 'Ya no espías', 'Scouting {name}: their board is on the far side': 'Espiando a {name}: su equipo está en la mitad lejana',
  'Tips hidden. Turn them back on in Settings.': 'Consejos ocultos. Puedes volver a activarlos en Ajustes.', 'Fights play at {n}x': 'Los partidos van a {n}x',
  'Motion reduced': 'Movimiento reducido', 'Motion follows this device': 'El movimiento sigue al dispositivo', 'Text size changed': 'Tamaño del texto cambiado',
  'Feedback file saved to your downloads': 'Archivo de comentarios guardado en tus descargas', 'History cleared': 'Historial borrado',
  'Timer paused': 'Reloj en pausa', 'Timer running': 'Reloj en marcha', 'Auto-advance on': 'Avance automático activado',
  'Auto-advance off: press Next round when ready': 'Avance automático desactivado: pulsa Siguiente ronda cuando quieras',
  'Bots: {d}, from the next new game': 'Bots: {d}, desde la próxima partida', 'New game': 'Nueva partida',
  "Today's challenge, {date}: same players and bots for everyone today": 'Reto del día, {date}: las mismas jugadoras y bots para todos hoy',
  "Today's challenge ({date}): same pool, shops and bots for everyone today, bots on Normal. ": 'Reto del día ({date}): el mismo grupo, tiendas y bots para todos hoy, bots en Normal. ',
  'Your best today: {place}.': 'Tu mejor puesto hoy: {place}.', 'Not played yet today.': 'Aún no has jugado hoy.',
  'Round {label}. Buy from the shop, tap a unit then a slot to move it.': 'Ronda {label}. Compra en la tienda; toca una jugadora y luego un puesto para moverla.',
  'Feedback file': 'Archivo de comentarios', 'Language: English': 'Idioma: español',
  // unit card
  'Bronze': 'Bronce', 'Silver': 'Plata', 'Platinum': 'Platino', 'Diamond': 'Diamante', 'Master': 'Maestra',
  'Team': 'Equipo', 'Cost': 'Coste', '{n} gold': '{n} de oro', 'Game role': 'Rol de juego', 'Keyword': 'Palabra clave', 'Keyword x{n}': 'Palabra clave x{n}',
  'Ability': 'Habilidad', 'Stats': 'Estadísticas', 'No Specialization (wild card)': 'No Specialization (comodín)', 'Outside or Opposite (wild card)': 'Outside u Opposite (comodín)',
  'HP {hp} · attack {atk} · armor {arm} · mana {mana} · speed {spd}': 'Vida {hp} · ataque {atk} · defensa {arm} · maná {mana} · velocidad {spd}', ' · dodge {n}%': ' · esquiva {n}%',
};

// The How to play list, item by item (English markup → Spanish markup; both written here, never from input).
export const ES_HTML = {
  '<b>Goal:</b> be the last of eight teams standing. Lose a fight and you lose HP; at 0 you are out.': '<b>Objetivo:</b> ser el último de ocho equipos en pie. Si pierdes un partido pierdes vida; con 0 quedas fuera.',
  '<b>Build:</b> buy players in the Shop with gold, then tap a player and a hex to put her on your court. Your level sets how many can play.': '<b>Arma tu equipo:</b> compra jugadoras en la Tienda con oro; toca una jugadora y luego un hexágono para ponerla en tu cancha. Tu nivel marca cuántas pueden jugar.',
  '<b>Upgrade:</b> three copies of a player merge into a 2-star; three 2-stars make a 3-star.': '<b>Mejora:</b> tres copias de una jugadora se unen en una de 2 estrellas; tres de 2 estrellas hacen una de 3.',
  '<b>Traits:</b> players share game roles, club levels and archetypes. Field enough of one and its bonus switches on (see Traits). Pin and Utility players are wild cards.': '<b>Rasgos:</b> las jugadoras comparten rol de juego, nivel de club y arquetipo. Con suficientes de uno se activa su bonificación (mira Rasgos). Las Pin y Utility son comodines.',
  '<b>Fights</b> play themselves, rally style. Front-row Liberos and Middles take the hits; hitters score.': '<b>Los partidos</b> se juegan solos, punto a punto. Las Libero y Middle de la primera fila reciben los golpes; las atacantes anotan.',
  '<b>Gold:</b> income every round, more on a win or loss streak. Reroll the shop for 1, buy XP for 4.': '<b>Oro:</b> ingresos en cada ronda, más con una racha de victorias o derrotas. Renovar la tienda cuesta 1; comprar XP, 4.',
  '<b>Extras:</b> pick an augment at 2-1, 3-2 and 4-2; take a free player from the carousel at the start of stages 3 to 7.': '<b>Extras:</b> elige una mejora en 2-1, 3-2 y 4-2; llévate una jugadora gratis del carrusel al empezar las etapas 3 a 7.',
  '<b>Look closer:</b> hold a player (or press I) for her card; tap a team in Players to scout their board.': '<b>Mira de cerca:</b> mantén pulsada una jugadora (o pulsa I) para ver su ficha; toca un equipo en Jugadoras para espiar su cancha.',
  '<b>Keys:</b> R reroll, X buy XP, S sell, N next round, Escape skips a fight, arrow keys move around the court.': '<b>Teclas:</b> R renovar, X comprar XP, S vender, N siguiente ronda, Escape salta un partido, las flechas mueven por la cancha.',
};
