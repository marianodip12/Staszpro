export type Locale = 'es' | 'en' | 'pt';

export interface Dict {
  // ── App shell ──────────────────────────────────────────────
  nav_matches: string;
  nav_teams: string;
  nav_live: string;
  nav_stats: string;
  nav_evolution: string;

  // ── Matches page ───────────────────────────────────────────
  matches_title: string;
  matches_season: string;
  matches_new: string;
  matches_history: string;
  matches_empty_title: string;
  matches_empty_desc: string;
  matches_new_match: string;
  matches_load_team: string;
  live_banner: string;
  live_go: string;

  // ── Match card ─────────────────────────────────────────────
  card_final: string;
  card_analyze: string;
  card_evolution: string;
  card_delete: string;
  card_win: string;
  card_draw: string;
  card_loss: string;

  // ── Season summary ─────────────────────────────────────────
  season_label: string;
  season_recent: string;

  // ── New match dialog ───────────────────────────────────────
  new_match_title: string;
  new_match_my_team: string;
  new_match_rival: string;
  new_match_competition: string;
  new_match_round: string;
  new_match_start: string;
  new_match_cancel: string;

  // ── Teams page ─────────────────────────────────────────────
  teams_title: string;
  teams_new: string;
  teams_empty_title: string;
  teams_empty_desc: string;
  teams_create_first: string;
  teams_roster: string;
  teams_add_player: string;
  teams_no_players: string;
  teams_add_first: string;
  teams_my_team_badge: string;

  // ── Team / Player dialogs ──────────────────────────────────
  team_dialog_create: string;
  team_dialog_edit: string;
  team_dialog_name: string;
  team_dialog_color: string;
  team_dialog_mark_mine: string;
  team_dialog_save: string;
  team_dialog_cancel: string;
  team_dialog_delete: string;
  player_dialog_create: string;
  player_dialog_edit: string;
  player_dialog_number: string;
  player_dialog_name: string;
  player_dialog_position: string;
  player_dialog_save: string;
  player_dialog_cancel: string;

  // ── Live match ─────────────────────────────────────────────
  live_title: string;
  live_mode_full: string;
  live_mode_quick: string;
  live_attacker: string;
  live_step1: string;
  live_step2: string;
  live_goal_zone_hint: string;
  live_court_hint: string;
  live_fuera: string;
  live_palo: string;
  live_arco_a_arco: string;
  live_other_events: string;
  live_turnovers: string;
  live_excl: string;
  live_penals: string;
  live_clock_start: string;
  live_clock_pause: string;
  live_finish: string;
  live_discard: string;
  live_finish_confirm: string;
  live_discard_confirm: string;
  live_timeline_title: string;
  live_no_events: string;

  // ── Shot outcome ───────────────────────────────────────────
  outcome_title: string;
  outcome_goal: string;
  outcome_saved: string;
  outcome_miss: string;
  outcome_post: string;

  // ── Player picker ──────────────────────────────────────────
  picker_loaded: string;
  picker_new: string;
  picker_add: string;
  picker_name_optional: string;

  // ── Stats ──────────────────────────────────────────────────
  stats_title: string;
  stats_tab_summary: string;
  stats_tab_players: string;
  stats_all: string;
  stats_offensive: string;
  stats_defensive: string;
  stats_goals: string;
  stats_shots: string;
  stats_pct: string;
  stats_avg: string;
  stats_goals_against: string;
  stats_our_saves: string;
  stats_gk_pct: string;
  stats_avg_rec: string;
  stats_no_shooters: string;
  stats_matches: string;
  stats_match: string;

  // ── Evolution ──────────────────────────────────────────────
  evo_title: string;
  evo_tab_season: string;
  evo_tab_match: string;
  evo_no_team_title: string;
  evo_no_team_desc: string;
  evo_no_matches_title: string;
  evo_no_matches_desc: string;
  evo_last_results: string;
  evo_goal_diff: string;
  evo_points: string;
  evo_longest_run: string;
  evo_score_by_min: string;
  evo_diff_chart: string;
  evo_key_moments: string;
  evo_halftime: string;

  // ── Analysis ──────────────────────────────────────────────
  analysis_title: string;
  analysis_back: string;
  analysis_all_teams: string;
  analysis_clear: string;
  analysis_arco: string;
  analysis_arco_hint: string;
  analysis_court: string;
  analysis_court_hint: string;
  analysis_players: string;
  analysis_shooters: string;
  analysis_goalkeepers: string;
  analysis_events_title: string;
  analysis_lanzam: string;
  analysis_atajadas: string;
  analysis_palos: string;
  analysis_fuera: string;
  analysis_errados: string;
  analysis_efect: string;
  analysis_event_total: string;
  analysis_event_match: string;
  analysis_compare: string;
  analysis_no_filter: string;

  // ── Common ─────────────────────────────────────────────────
  common_go_teams: string;
  common_go_matches: string;
  common_matches: string;
  common_match: string;
  common_victory: string;
  common_draw: string;
  common_defeat: string;
  common_delete_match: string;

  // ── Landing ────────────────────────────────────────────────
  landing_nav_features: string;
  landing_nav_demo: string;
  landing_nav_signin: string;
  landing_nav_signup: string;
  landing_hero_eyebrow: string;
  landing_hero_title: string;
  landing_hero_subtitle: string;
  landing_hero_cta: string;
  landing_hero_secondary: string;
  landing_features_title: string;
  landing_features_subtitle: string;
  landing_feature1_title: string;
  landing_feature1_desc: string;
  landing_feature2_title: string;
  landing_feature2_desc: string;
  landing_feature3_title: string;
  landing_feature3_desc: string;
  landing_feature4_title: string;
  landing_feature4_desc: string;
  landing_demo_title: string;
  landing_demo_subtitle: string;
  landing_demo_goal_label: string;
  landing_demo_court_label: string;
  landing_demo_outcome_label: string;
  landing_demo_outcome_goal: string;
  landing_demo_outcome_saved: string;
  landing_demo_outcome_miss: string;
  landing_demo_outcome_post: string;
  landing_demo_reset: string;
  landing_demo_summary_shots: string;
  landing_demo_summary_goals: string;
  landing_demo_summary_pct: string;
  landing_cta_title: string;
  landing_cta_subtitle: string;
  landing_cta_button: string;
  landing_footer_tagline: string;
  landing_footer_contact: string;
  landing_footer_copyright: string;

  // ── Auth ───────────────────────────────────────────────────
  auth_signin_title: string;
  auth_signup_title: string;
  auth_email: string;
  auth_password: string;
  auth_password_help: string;
  auth_signin_button: string;
  auth_signup_button: string;
  auth_or: string;
  auth_google_button: string;
  auth_google_disabled_help: string;
  auth_no_account: string;
  auth_have_account: string;
  auth_to_signup: string;
  auth_to_signin: string;
  auth_check_email_title: string;
  auth_check_email_desc: string;
  auth_back_to_landing: string;
  auth_signout: string;
  auth_my_account: string;
  auth_loading: string;
  auth_err_invalid_credentials: string;
  auth_err_email_required: string;
  auth_err_password_min: string;
  auth_err_generic: string;
}

const es: Dict = {
  nav_matches: 'Partidos',
  nav_teams: 'Equipos',
  nav_live: 'En Vivo',
  nav_stats: 'Stats',
  nav_evolution: 'Evolución',
  matches_title: '🤾 Partidos',
  matches_season: 'Temporada',
  matches_new: 'Nuevo',
  matches_history: 'Historial',
  matches_empty_title: 'Sin partidos aún',
  matches_empty_desc: 'Empezá registrando tu primer partido.',
  matches_new_match: 'Nuevo partido',
  matches_load_team: 'Cargar equipo',
  live_banner: '● EN VIVO',
  live_go: 'Ir al partido en vivo',
  card_final: 'Final',
  card_analyze: 'Análisis',
  card_evolution: 'Evolución',
  card_delete: 'Eliminar',
  card_win: 'Victoria',
  card_draw: 'Empate',
  card_loss: 'Derrota',
  season_label: 'Temporada',
  season_recent: 'Últimos',
  new_match_title: 'Nuevo partido',
  new_match_my_team: 'Mi equipo',
  new_match_rival: 'Rival',
  new_match_competition: 'Competición',
  new_match_round: 'Fecha / Jornada',
  new_match_start: 'Comenzar',
  new_match_cancel: 'Cancelar',
  teams_title: '👥 Equipos',
  teams_new: 'Nuevo',
  teams_empty_title: 'Sin equipos cargados',
  teams_empty_desc: 'Necesitás al menos un equipo para registrar partidos.',
  teams_create_first: 'Crear mi primer equipo',
  teams_roster: 'Plantel',
  teams_add_player: 'Jugador',
  teams_no_players: 'Sin jugadores cargados',
  teams_add_first: 'Agregar el primero',
  teams_my_team_badge: 'Mi equipo',
  team_dialog_create: 'Nuevo equipo',
  team_dialog_edit: 'Editar equipo',
  team_dialog_name: 'Nombre del equipo',
  team_dialog_color: 'Color',
  team_dialog_mark_mine: 'Marcar como mi equipo',
  team_dialog_save: 'Guardar',
  team_dialog_cancel: 'Cancelar',
  team_dialog_delete: 'Eliminar',
  player_dialog_create: 'Nuevo jugador',
  player_dialog_edit: 'Editar jugador',
  player_dialog_number: 'Número',
  player_dialog_name: 'Nombre',
  player_dialog_position: 'Posición',
  player_dialog_save: 'Guardar',
  player_dialog_cancel: 'Cancelar',
  live_title: 'En Vivo',
  live_mode_full: 'Completo',
  live_mode_quick: 'Rápido',
  live_attacker: 'Atacando',
  live_step1: '🎯 ¿A qué cuadrante fue?',
  live_step2: '🏐 ¿Desde dónde tiró?',
  live_goal_zone_hint: 'Tocá el arco para registrar',
  live_court_hint: 'Tocá la zona de lanzamiento',
  live_fuera: 'Lanzamiento con falta',
  live_palo: 'Palo',
  live_arco_a_arco: '🎯 Arco a Arco',
  live_other_events: 'Otros eventos',
  live_turnovers: 'Pérdidas',
  live_excl: 'Exclusiones',
  live_penals: 'Penales',
  live_clock_start: 'Iniciar',
  live_clock_pause: 'Pausar',
  live_finish: 'Finalizar partido',
  live_discard: 'Descartar',
  live_finish_confirm: '¿Finalizar y guardar el partido?',
  live_discard_confirm: '¿Descartar el partido? Se perderán todos los eventos.',
  live_timeline_title: 'Eventos',
  live_no_events: 'Sin eventos aún',
  outcome_title: '¿Qué pasó?',
  outcome_goal: '⚽ Gol',
  outcome_saved: '🧤 Atajada',
  outcome_miss: '❌ Errado',
  outcome_post: '🪵 Palo',
  picker_loaded: 'Ya cargados en este partido',
  picker_new: 'Nuevo',
  picker_add: 'Agregar',
  picker_name_optional: 'Nombre (opcional)',
  stats_title: '📊',
  stats_tab_summary: '📋 Resumen',
  stats_tab_players: '🎯 Jugadores',
  stats_all: 'Todas',
  stats_offensive: 'Ofensivo',
  stats_defensive: 'Defensivo',
  stats_goals: 'Goles',
  stats_shots: 'Tiros',
  stats_pct: 'Efect.',
  stats_avg: 'Prom.',
  stats_goals_against: 'Gol contr.',
  stats_our_saves: 'Ataj. propias',
  stats_gk_pct: '% arquero',
  stats_avg_rec: 'Prom. rec.',
  stats_no_shooters: 'Sin tiradores identificados',
  stats_matches: 'partidos',
  stats_match: 'partido',
  evo_title: '📈',
  evo_tab_season: '🏆 Temporada',
  evo_tab_match: '🎯 Por partido',
  evo_no_team_title: 'Sin equipo propio',
  evo_no_team_desc: 'Definí tu equipo en Equipos para ver tu evolución.',
  evo_no_matches_title: 'Sin partidos completados',
  evo_no_matches_desc: 'Completá al menos un partido para ver la evolución.',
  evo_last_results: 'Últimos resultados',
  evo_goal_diff: 'Diferencia de gol por partido',
  evo_points: 'Puntos acumulados',
  evo_longest_run: 'Racha más larga',
  evo_score_by_min: 'Marcador por minuto',
  evo_diff_chart: 'Diferencia',
  evo_key_moments: 'Momentos clave',
  evo_halftime: 'Descanso',
  analysis_title: '📊 Análisis',
  analysis_back: '← Volver',
  analysis_all_teams: 'Ambos',
  analysis_clear: 'Limpiar todo',
  analysis_arco: '🎯 Arco',
  analysis_arco_hint: 'Tocá un cuadrante para filtrar',
  analysis_court: '🏐 Cancha',
  analysis_court_hint: 'Tocá una zona para filtrar',
  analysis_players: '👥 Jugadores',
  analysis_shooters: 'Tiradores',
  analysis_goalkeepers: 'Arqueros',
  analysis_events_title: 'Eventos',
  analysis_lanzam: 'Lanzam.',
  analysis_atajadas: 'Atajadas',
  analysis_palos: 'Palos',
  analysis_fuera: 'Con Falta',
  analysis_errados: 'Errados',
  analysis_efect: 'Efect.',
  analysis_event_total: 'eventos en total',
  analysis_event_match: 'eventos coinciden',
  analysis_compare: 'Comparativa final',
  analysis_no_filter: 'sin filtros',
  common_go_teams: 'Ir a Equipos',
  common_go_matches: 'Ir a Partidos',
  common_matches: 'partidos',
  common_match: 'partido',
  common_victory: 'Victoria',
  common_draw: 'Empate',
  common_defeat: 'Derrota',
  common_delete_match: '¿Eliminar este partido?',

  // Landing
  landing_nav_features: 'Funciones',
  landing_nav_demo: 'Demo',
  landing_nav_signin: 'Iniciar sesión',
  landing_nav_signup: 'Registrarme',
  landing_hero_eyebrow: 'Análisis de handball para entrenadores',
  landing_hero_title: 'Convertí cada partido en datos que mejoran tu equipo',
  landing_hero_subtitle: 'Registrá tiros, atajadas, pérdidas y exclusiones en vivo. Visualizá zonas calientes, evaluá jugadores, compará rivales. Todo desde tu celular o computadora.',
  landing_hero_cta: 'Empezar gratis',
  landing_hero_secondary: 'Probar la demo',
  landing_features_title: 'Todo lo que necesitás en un partido',
  landing_features_subtitle: 'Sin papeles, sin Excels, sin perder tiempo después del partido.',
  landing_feature1_title: 'Registro en vivo',
  landing_feature1_desc: 'Tocá la zona del arco a donde fue el tiro y de qué parte de la cancha salió. En 2 segundos, evento cargado.',
  landing_feature2_title: 'Mapa de calor',
  landing_feature2_desc: 'Ves al instante en qué zonas convertís más, dónde te ataja el arquero rival y desde dónde tira mejor cada jugador.',
  landing_feature3_title: 'Análisis por jugador',
  landing_feature3_desc: 'Eficacia individual, zonas preferidas y rendimiento contra cada arquero. Datos para decidir el plantel del próximo partido.',
  landing_feature4_title: 'Comparativas y evolución',
  landing_feature4_desc: 'Mirá cómo evoluciona tu equipo a lo largo de la temporada y comparalo con cualquier rival.',
  landing_demo_title: 'Probalo sin registrarte',
  landing_demo_subtitle: 'Tocá una zona del arco y una de la cancha, después marcá el resultado. Datos de ejemplo.',
  landing_demo_goal_label: '1. ¿A dónde fue el tiro?',
  landing_demo_court_label: '2. ¿Desde dónde tiró?',
  landing_demo_outcome_label: '3. Resultado',
  landing_demo_outcome_goal: 'Gol',
  landing_demo_outcome_saved: 'Atajada',
  landing_demo_outcome_miss: 'Errado',
  landing_demo_outcome_post: 'Palo',
  landing_demo_reset: 'Reiniciar demo',
  landing_demo_summary_shots: 'Tiros',
  landing_demo_summary_goals: 'Goles',
  landing_demo_summary_pct: 'Eficacia',
  landing_cta_title: '¿Listo para llevar tu análisis al siguiente nivel?',
  landing_cta_subtitle: 'Registrate gratis. Tus datos se guardan en la nube y los podés ver desde cualquier dispositivo.',
  landing_cta_button: 'Crear mi cuenta',
  landing_footer_tagline: 'Análisis de handball para entrenadores y analistas.',
  landing_footer_contact: 'Contacto',
  landing_footer_copyright: '© 2026 StatzPro · Todos los derechos reservados',

  // Auth
  auth_signin_title: 'Iniciar sesión',
  auth_signup_title: 'Crear cuenta',
  auth_email: 'Email',
  auth_password: 'Contraseña',
  auth_password_help: 'Mínimo 6 caracteres',
  auth_signin_button: 'Entrar',
  auth_signup_button: 'Registrarme',
  auth_or: 'o',
  auth_google_button: 'Continuar con Google',
  auth_google_disabled_help: 'Próximamente',
  auth_no_account: '¿No tenés cuenta?',
  auth_have_account: '¿Ya tenés cuenta?',
  auth_to_signup: 'Registrate',
  auth_to_signin: 'Iniciá sesión',
  auth_check_email_title: 'Revisá tu email',
  auth_check_email_desc: 'Te enviamos un link de confirmación. Hacé click para activar tu cuenta y empezar a usar la app.',
  auth_back_to_landing: 'Volver al inicio',
  auth_signout: 'Cerrar sesión',
  auth_my_account: 'Mi cuenta',
  auth_loading: 'Cargando…',
  auth_err_invalid_credentials: 'Email o contraseña incorrectos.',
  auth_err_email_required: 'Ingresá un email válido.',
  auth_err_password_min: 'La contraseña debe tener al menos 6 caracteres.',
  auth_err_generic: 'Algo salió mal. Intentá de nuevo.',
};

const en: Dict = {
  nav_matches: 'Matches',
  nav_teams: 'Teams',
  nav_live: 'Live',
  nav_stats: 'Stats',
  nav_evolution: 'Evolution',
  matches_title: '🤾 Matches',
  matches_season: 'Season',
  matches_new: 'New',
  matches_history: 'History',
  matches_empty_title: 'No matches yet',
  matches_empty_desc: 'Start by recording your first match.',
  matches_new_match: 'New match',
  matches_load_team: 'Load team',
  live_banner: '● LIVE',
  live_go: 'Go to live match',
  card_final: 'Final',
  card_analyze: 'Analysis',
  card_evolution: 'Evolution',
  card_delete: 'Delete',
  card_win: 'Win',
  card_draw: 'Draw',
  card_loss: 'Loss',
  season_label: 'Season',
  season_recent: 'Last',
  new_match_title: 'New match',
  new_match_my_team: 'Your team',
  new_match_rival: 'Opponent',
  new_match_competition: 'Competition',
  new_match_round: 'Round / Matchday',
  new_match_start: 'Start',
  new_match_cancel: 'Cancel',
  teams_title: '👥 Teams',
  teams_new: 'New',
  teams_empty_title: 'No teams loaded',
  teams_empty_desc: 'You need at least one team to record matches.',
  teams_create_first: 'Create my first team',
  teams_roster: 'Roster',
  teams_add_player: 'Player',
  teams_no_players: 'No players loaded',
  teams_add_first: 'Add the first one',
  teams_my_team_badge: 'My team',
  team_dialog_create: 'New team',
  team_dialog_edit: 'Edit team',
  team_dialog_name: 'Team name',
  team_dialog_color: 'Color',
  team_dialog_mark_mine: 'Mark as my team',
  team_dialog_save: 'Save',
  team_dialog_cancel: 'Cancel',
  team_dialog_delete: 'Delete',
  player_dialog_create: 'New player',
  player_dialog_edit: 'Edit player',
  player_dialog_number: 'Number',
  player_dialog_name: 'Name',
  player_dialog_position: 'Position',
  player_dialog_save: 'Save',
  player_dialog_cancel: 'Cancel',
  live_title: 'Live',
  live_mode_full: 'Full',
  live_mode_quick: 'Quick',
  live_attacker: 'Attacking',
  live_step1: '🎯 Which quadrant?',
  live_step2: '🏐 From where?',
  live_goal_zone_hint: 'Tap the goal to register',
  live_court_hint: 'Tap the shooting zone',
  live_fuera: 'Out',
  live_palo: 'Post',
  live_arco_a_arco: '🎯 Long Range',
  live_other_events: 'Other events',
  live_turnovers: 'Turnovers',
  live_excl: 'Exclusions',
  live_penals: 'Penalties',
  live_clock_start: 'Start',
  live_clock_pause: 'Pause',
  live_finish: 'Finish match',
  live_discard: 'Discard',
  live_finish_confirm: 'Finish and save the match?',
  live_discard_confirm: 'Discard the match? All events will be lost.',
  live_timeline_title: 'Events',
  live_no_events: 'No events yet',
  outcome_title: 'What happened?',
  outcome_goal: '⚽ Goal',
  outcome_saved: '🧤 Saved',
  outcome_miss: '❌ Missed',
  outcome_post: '🪵 Post',
  picker_loaded: 'Already tagged this match',
  picker_new: 'New',
  picker_add: 'Add',
  picker_name_optional: 'Name (optional)',
  stats_title: '📊',
  stats_tab_summary: '📋 Summary',
  stats_tab_players: '🎯 Players',
  stats_all: 'All',
  stats_offensive: 'Offensive',
  stats_defensive: 'Defensive',
  stats_goals: 'Goals',
  stats_shots: 'Shots',
  stats_pct: 'Effic.',
  stats_avg: 'Avg.',
  stats_goals_against: 'Goals ag.',
  stats_our_saves: 'Our saves',
  stats_gk_pct: 'GK %',
  stats_avg_rec: 'Avg. rec.',
  stats_no_shooters: 'No shooters identified',
  stats_matches: 'matches',
  stats_match: 'match',
  evo_title: '📈',
  evo_tab_season: '🏆 Season',
  evo_tab_match: '🎯 By match',
  evo_no_team_title: 'No home team',
  evo_no_team_desc: 'Set your team in Teams to view evolution.',
  evo_no_matches_title: 'No completed matches',
  evo_no_matches_desc: 'Complete at least one match to see evolution.',
  evo_last_results: 'Last results',
  evo_goal_diff: 'Goal difference per match',
  evo_points: 'Cumulative points',
  evo_longest_run: 'Longest run',
  evo_score_by_min: 'Score by minute',
  evo_diff_chart: 'Difference',
  evo_key_moments: 'Key moments',
  evo_halftime: 'Half-time',
  analysis_title: '📊 Analysis',
  analysis_back: '← Back',
  analysis_all_teams: 'Both',
  analysis_clear: 'Clear all',
  analysis_arco: '🎯 Goal',
  analysis_arco_hint: 'Tap a quadrant to filter',
  analysis_court: '🏐 Court',
  analysis_court_hint: 'Tap a zone to filter',
  analysis_players: '👥 Players',
  analysis_shooters: 'Shooters',
  analysis_goalkeepers: 'Goalkeepers',
  analysis_events_title: 'Events',
  analysis_lanzam: 'Shots',
  analysis_atajadas: 'Saves',
  analysis_palos: 'Posts',
  analysis_fuera: 'Out',
  analysis_errados: 'Missed',
  analysis_efect: 'Effic.',
  analysis_event_total: 'events total',
  analysis_event_match: 'events match',
  analysis_compare: 'Final comparison',
  analysis_no_filter: 'no filters',
  common_go_teams: 'Go to Teams',
  common_go_matches: 'Go to Matches',
  common_matches: 'matches',
  common_match: 'match',
  common_victory: 'Win',
  common_draw: 'Draw',
  common_defeat: 'Loss',
  common_delete_match: 'Delete this match?',

  // Landing
  landing_nav_features: 'Features',
  landing_nav_demo: 'Demo',
  landing_nav_signin: 'Sign in',
  landing_nav_signup: 'Sign up',
  landing_hero_eyebrow: 'Handball analytics for coaches',
  landing_hero_title: 'Turn every match into data that improves your team',
  landing_hero_subtitle: 'Track shots, saves, turnovers and exclusions live. Visualize hot zones, evaluate players, compare opponents — all from your phone or desktop.',
  landing_hero_cta: 'Start free',
  landing_hero_secondary: 'Try the demo',
  landing_features_title: 'Everything you need during a match',
  landing_features_subtitle: 'No paper, no spreadsheets, no wasted time after the game.',
  landing_feature1_title: 'Live tracking',
  landing_feature1_desc: 'Tap the goal zone where the shot landed and the part of the court it came from. Event logged in 2 seconds.',
  landing_feature2_title: 'Heatmap',
  landing_feature2_desc: 'See instantly where you score the most, where the rival keeper saves and which zone each player shoots best from.',
  landing_feature3_title: 'Player analysis',
  landing_feature3_desc: 'Individual efficiency, preferred zones and matchups against each keeper. Data to pick your next squad.',
  landing_feature4_title: 'Trends and evolution',
  landing_feature4_desc: 'Watch your team progress through the season and benchmark against any opponent.',
  landing_demo_title: 'Try it without signing up',
  landing_demo_subtitle: 'Tap a goal zone and a court zone, then mark the outcome. Sample data.',
  landing_demo_goal_label: '1. Where did the shot go?',
  landing_demo_court_label: '2. Where did it come from?',
  landing_demo_outcome_label: '3. Outcome',
  landing_demo_outcome_goal: 'Goal',
  landing_demo_outcome_saved: 'Saved',
  landing_demo_outcome_miss: 'Missed',
  landing_demo_outcome_post: 'Post',
  landing_demo_reset: 'Reset demo',
  landing_demo_summary_shots: 'Shots',
  landing_demo_summary_goals: 'Goals',
  landing_demo_summary_pct: 'Efficiency',
  landing_cta_title: 'Ready to take your analysis to the next level?',
  landing_cta_subtitle: 'Sign up free. Your data is stored in the cloud and accessible from any device.',
  landing_cta_button: 'Create my account',
  landing_footer_tagline: 'Handball analytics for coaches and analysts.',
  landing_footer_contact: 'Contact',
  landing_footer_copyright: '© 2026 StatzPro · All rights reserved',

  // Auth
  auth_signin_title: 'Sign in',
  auth_signup_title: 'Create account',
  auth_email: 'Email',
  auth_password: 'Password',
  auth_password_help: 'Minimum 6 characters',
  auth_signin_button: 'Sign in',
  auth_signup_button: 'Sign up',
  auth_or: 'or',
  auth_google_button: 'Continue with Google',
  auth_google_disabled_help: 'Coming soon',
  auth_no_account: "Don't have an account?",
  auth_have_account: 'Already have an account?',
  auth_to_signup: 'Sign up',
  auth_to_signin: 'Sign in',
  auth_check_email_title: 'Check your email',
  auth_check_email_desc: 'We sent you a confirmation link. Click it to activate your account and start using the app.',
  auth_back_to_landing: 'Back to home',
  auth_signout: 'Sign out',
  auth_my_account: 'My account',
  auth_loading: 'Loading…',
  auth_err_invalid_credentials: 'Invalid email or password.',
  auth_err_email_required: 'Please enter a valid email.',
  auth_err_password_min: 'Password must be at least 6 characters.',
  auth_err_generic: 'Something went wrong. Please try again.',
};

const pt: Dict = {
  nav_matches: 'Jogos',
  nav_teams: 'Equipes',
  nav_live: 'Ao Vivo',
  nav_stats: 'Stats',
  nav_evolution: 'Evolução',
  matches_title: '🤾 Jogos',
  matches_season: 'Temporada',
  matches_new: 'Novo',
  matches_history: 'Histórico',
  matches_empty_title: 'Sem jogos ainda',
  matches_empty_desc: 'Comece registrando seu primeiro jogo.',
  matches_new_match: 'Novo jogo',
  matches_load_team: 'Carregar equipe',
  live_banner: '● AO VIVO',
  live_go: 'Ir para o jogo ao vivo',
  card_final: 'Final',
  card_analyze: 'Análise',
  card_evolution: 'Evolução',
  card_delete: 'Excluir',
  card_win: 'Vitória',
  card_draw: 'Empate',
  card_loss: 'Derrota',
  season_label: 'Temporada',
  season_recent: 'Últimos',
  new_match_title: 'Novo jogo',
  new_match_my_team: 'Seu time',
  new_match_rival: 'Adversário',
  new_match_competition: 'Competição',
  new_match_round: 'Rodada',
  new_match_start: 'Começar',
  new_match_cancel: 'Cancelar',
  teams_title: '👥 Equipes',
  teams_new: 'Nova',
  teams_empty_title: 'Sem equipes carregadas',
  teams_empty_desc: 'Você precisa de pelo menos uma equipe para registrar jogos.',
  teams_create_first: 'Criar minha primeira equipe',
  teams_roster: 'Elenco',
  teams_add_player: 'Jogador',
  teams_no_players: 'Sem jogadores carregados',
  teams_add_first: 'Adicionar o primeiro',
  teams_my_team_badge: 'Meu time',
  team_dialog_create: 'Nova equipe',
  team_dialog_edit: 'Editar equipe',
  team_dialog_name: 'Nome da equipe',
  team_dialog_color: 'Cor',
  team_dialog_mark_mine: 'Marcar como meu time',
  team_dialog_save: 'Salvar',
  team_dialog_cancel: 'Cancelar',
  team_dialog_delete: 'Excluir',
  player_dialog_create: 'Novo jogador',
  player_dialog_edit: 'Editar jogador',
  player_dialog_number: 'Número',
  player_dialog_name: 'Nome',
  player_dialog_position: 'Posição',
  player_dialog_save: 'Salvar',
  player_dialog_cancel: 'Cancelar',
  live_title: 'Ao Vivo',
  live_mode_full: 'Completo',
  live_mode_quick: 'Rápido',
  live_attacker: 'Atacando',
  live_step1: '🎯 Qual quadrante?',
  live_step2: '🏐 De onde arremessou?',
  live_goal_zone_hint: 'Toque no gol para registrar',
  live_court_hint: 'Toque na zona de arremesso',
  live_fuera: 'Fora',
  live_palo: 'Trave',
  live_arco_a_arco: '🎯 Longo Alcance',
  live_other_events: 'Outros eventos',
  live_turnovers: 'Perdas',
  live_excl: 'Exclusões',
  live_penals: 'Penalidades',
  live_clock_start: 'Iniciar',
  live_clock_pause: 'Pausar',
  live_finish: 'Finalizar jogo',
  live_discard: 'Descartar',
  live_finish_confirm: 'Finalizar e salvar o jogo?',
  live_discard_confirm: 'Descartar o jogo? Todos os eventos serão perdidos.',
  live_timeline_title: 'Eventos',
  live_no_events: 'Sem eventos ainda',
  outcome_title: 'O que aconteceu?',
  outcome_goal: '⚽ Gol',
  outcome_saved: '🧤 Defesa',
  outcome_miss: '❌ Errado',
  outcome_post: '🪵 Trave',
  picker_loaded: 'Já registrados neste jogo',
  picker_new: 'Novo',
  picker_add: 'Adicionar',
  picker_name_optional: 'Nome (opcional)',
  stats_title: '📊',
  stats_tab_summary: '📋 Resumo',
  stats_tab_players: '🎯 Jogadores',
  stats_all: 'Todos',
  stats_offensive: 'Ofensivo',
  stats_defensive: 'Defensivo',
  stats_goals: 'Gols',
  stats_shots: 'Arremessos',
  stats_pct: 'Efic.',
  stats_avg: 'Média',
  stats_goals_against: 'Gols contr.',
  stats_our_saves: 'Defesas',
  stats_gk_pct: '% goleiro',
  stats_avg_rec: 'Média rec.',
  stats_no_shooters: 'Sem atiradores identificados',
  stats_matches: 'jogos',
  stats_match: 'jogo',
  evo_title: '📈',
  evo_tab_season: '🏆 Temporada',
  evo_tab_match: '🎯 Por jogo',
  evo_no_team_title: 'Sem time próprio',
  evo_no_team_desc: 'Defina seu time em Equipes para ver a evolução.',
  evo_no_matches_title: 'Sem jogos concluídos',
  evo_no_matches_desc: 'Conclua pelo menos um jogo para ver a evolução.',
  evo_last_results: 'Últimos resultados',
  evo_goal_diff: 'Diferença de gols por jogo',
  evo_points: 'Pontos acumulados',
  evo_longest_run: 'Série mais longa',
  evo_score_by_min: 'Placar por minuto',
  evo_diff_chart: 'Diferença',
  evo_key_moments: 'Momentos chave',
  evo_halftime: 'Intervalo',
  analysis_title: '📊 Análise',
  analysis_back: '← Voltar',
  analysis_all_teams: 'Ambos',
  analysis_clear: 'Limpar tudo',
  analysis_arco: '🎯 Gol',
  analysis_arco_hint: 'Toque em um quadrante para filtrar',
  analysis_court: '🏐 Quadra',
  analysis_court_hint: 'Toque em uma zona para filtrar',
  analysis_players: '👥 Jogadores',
  analysis_shooters: 'Atiradores',
  analysis_goalkeepers: 'Goleiros',
  analysis_events_title: 'Eventos',
  analysis_lanzam: 'Arremessos',
  analysis_atajadas: 'Defesas',
  analysis_palos: 'Traves',
  analysis_fuera: 'Fora',
  analysis_errados: 'Errados',
  analysis_efect: 'Efic.',
  analysis_event_total: 'eventos no total',
  analysis_event_match: 'eventos coincidem',
  analysis_compare: 'Comparativo final',
  analysis_no_filter: 'sem filtros',
  common_go_teams: 'Ir a Equipes',
  common_go_matches: 'Ir a Jogos',
  common_matches: 'jogos',
  common_match: 'jogo',
  common_victory: 'Vitória',
  common_draw: 'Empate',
  common_defeat: 'Derrota',
  common_delete_match: 'Excluir este jogo?',

  // Landing
  landing_nav_features: 'Funções',
  landing_nav_demo: 'Demo',
  landing_nav_signin: 'Entrar',
  landing_nav_signup: 'Cadastrar',
  landing_hero_eyebrow: 'Análise de handebol para treinadores',
  landing_hero_title: 'Transforme cada jogo em dados que melhoram seu time',
  landing_hero_subtitle: 'Registre arremessos, defesas, perdas e exclusões ao vivo. Visualize zonas quentes, avalie jogadores, compare adversários — tudo do celular ou computador.',
  landing_hero_cta: 'Começar grátis',
  landing_hero_secondary: 'Testar a demo',
  landing_features_title: 'Tudo que você precisa em um jogo',
  landing_features_subtitle: 'Sem papel, sem planilhas, sem perder tempo depois do jogo.',
  landing_feature1_title: 'Registro ao vivo',
  landing_feature1_desc: 'Toque a zona do gol e a parte da quadra de onde saiu o arremesso. Evento registrado em 2 segundos.',
  landing_feature2_title: 'Mapa de calor',
  landing_feature2_desc: 'Veja na hora onde você converte mais, onde o goleiro adversário defende e de qual zona cada jogador arremessa melhor.',
  landing_feature3_title: 'Análise por jogador',
  landing_feature3_desc: 'Eficiência individual, zonas preferidas e desempenho contra cada goleiro. Dados para escolher o próximo plantel.',
  landing_feature4_title: 'Comparativos e evolução',
  landing_feature4_desc: 'Acompanhe a evolução do time durante a temporada e compare com qualquer adversário.',
  landing_demo_title: 'Teste sem se cadastrar',
  landing_demo_subtitle: 'Toque uma zona do gol e uma da quadra, depois marque o resultado. Dados de exemplo.',
  landing_demo_goal_label: '1. Para onde foi o arremesso?',
  landing_demo_court_label: '2. De onde foi arremessado?',
  landing_demo_outcome_label: '3. Resultado',
  landing_demo_outcome_goal: 'Gol',
  landing_demo_outcome_saved: 'Defesa',
  landing_demo_outcome_miss: 'Errou',
  landing_demo_outcome_post: 'Trave',
  landing_demo_reset: 'Reiniciar demo',
  landing_demo_summary_shots: 'Arremessos',
  landing_demo_summary_goals: 'Gols',
  landing_demo_summary_pct: 'Eficiência',
  landing_cta_title: 'Pronto para levar sua análise ao próximo nível?',
  landing_cta_subtitle: 'Cadastre-se grátis. Seus dados ficam na nuvem e disponíveis em qualquer dispositivo.',
  landing_cta_button: 'Criar minha conta',
  landing_footer_tagline: 'Análise de handebol para treinadores e analistas.',
  landing_footer_contact: 'Contato',
  landing_footer_copyright: '© 2026 StatzPro · Todos os direitos reservados',

  // Auth
  auth_signin_title: 'Entrar',
  auth_signup_title: 'Criar conta',
  auth_email: 'Email',
  auth_password: 'Senha',
  auth_password_help: 'Mínimo 6 caracteres',
  auth_signin_button: 'Entrar',
  auth_signup_button: 'Cadastrar',
  auth_or: 'ou',
  auth_google_button: 'Continuar com Google',
  auth_google_disabled_help: 'Em breve',
  auth_no_account: 'Não tem conta?',
  auth_have_account: 'Já tem conta?',
  auth_to_signup: 'Cadastrar',
  auth_to_signin: 'Entrar',
  auth_check_email_title: 'Verifique seu email',
  auth_check_email_desc: 'Enviamos um link de confirmação. Clique para ativar sua conta e começar a usar o app.',
  auth_back_to_landing: 'Voltar ao início',
  auth_signout: 'Sair',
  auth_my_account: 'Minha conta',
  auth_loading: 'Carregando…',
  auth_err_invalid_credentials: 'Email ou senha incorretos.',
  auth_err_email_required: 'Insira um email válido.',
  auth_err_password_min: 'A senha deve ter no mínimo 6 caracteres.',
  auth_err_generic: 'Algo deu errado. Tente novamente.',
};

export const DICTIONARIES: Record<Locale, Dict> = { es, en, pt };

export const LOCALE_LABELS: Record<Locale, string> = {
  es: '🇦🇷 ES',
  en: '🇺🇸 EN',
  pt: '🇧🇷 PT',
};
