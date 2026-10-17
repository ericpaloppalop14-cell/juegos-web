/* Mochi · textos en 10 idiomas (es por defecto). Idioma: ?lang=xx o navigator.languages; si no se soporta -> inglés. */
(function () {
  const D = {};
  D.es = {
    premHint: '👑 ¡Descubre los personajes premium en «Personajes»!',
    newChar: '¡Nuevo personaje!', pickIn: 'Elígelo en «Personajes»',
    sub: '¡Corre, cambia de color y atraviesa!', chars: 'Personajes', tapPlay: 'Toca para jugar', points: 'Puntos', record: 'Récord',
    newRecord: '¡Nuevo récord!', tapRetry: 'Toca para repetir', back: '‹ Volver', prev: 'Anterior', next: 'Siguiente', noAds: 'Sin anuncios',
    restore: 'Restaurar compras', privacy: 'Privacidad', play: '¡Jugar!', contTitle: '¿Seguir donde<br>te quedaste?', soFar: 'Llevas',
    contAd: '▶ Ver anuncio y seguir', contFree: '▶ Seguir gratis', noThanks: 'No, gracias', pause: 'Pausa', tapResume: 'Toca para seguir', sound: 'Sonido',
    combo: 'Combo {n}  ·  x{m}', tut1: 'Desliza ← → para cambiar de carril', tut2: '¡Otra vez! Esquiva el chocolate',
    tut3: 'Toca la pantalla o un botón de color de abajo', tut4: '¡Atraviesa las paredes de tu mismo color!', pResume: '▶ Continuar', pRestart: '↻ Reiniciar', pMenu: '⌂ Menú', pauseBtn: 'Pausa', turbo: '⚡ Modo Turbo', turboSub: 'Siempre a tope · puntos ×1,5', turboRec: 'Récord Turbo: {n}', turboTag: '⚡ Modo Turbo', howTo: '❓ Cómo jugar', skip: 'Saltar ›', tutChars: 'Gana puntos para desbloquear personajes en «Personajes» ✨', contHelp: 'Mira un anuncio cortito y sigue justo donde estabas', tutBrake: 'Desliza hacia abajo para frenar ⇣', home: 'Menú', demoFast: '¡Acelera!', demoBrake: 'Frena', tapStart: '🎵 Toca para empezar', tutDash: 'Desliza hacia arriba para acelerar ⇡ ¡Repite para encadenar!', tut5: 'Elige carril y color… ¡tú puedes!',
    run: '¡A correr!', wrongColor: '¡Color equivocado!', plof: '¡Plof!', lastChance: 'Última oportunidad en esta partida',
    canContinue: 'Puedes seguir {n} veces en esta partida', noAdsForever: 'Sin anuncios para siempre · {p}', over: ['¡Plof!', '¡Ups!', '¡Blup!', '¡Ay!'],
    unlocked: '¡Desbloqueado: {n}!', nextChar: 'Próximo personaje: {n} puntos', allChars: '¡Tienes todos los personajes!', recordLine: 'Récord: {n}',
    words: { 3: '¡Genial!', 5: '¡Increíble!', 8: '¡Mochi-mágico!', 12: '¡Imparable!', 16: '¡Leyenda!', 20: '¡Gelatina suprema!' },
    comboLost: 'Combo perdido', tutDone: '¡Muy bien! ¡A correr! 🍬', goOn: '¡Adelante!', tapCanvas: '¡TOCA!', ready: '¡Prepárate!',
    lockedDesc: '??? – Llega a {n} puntos', noAdsOwned: '✓ Sin anuncios', noAdsPrice: 'Sin anuncios · {p}', buyFor: 'Desbloquear por {p}',
    inside: 'Dentro lleva {x}', original: 'La original', reachOrBuy: 'Llega a {n} puntos o desbloquéalo ya', unlockAt: 'Desbloqueo: {n} puntos',
    premium: 'Premium', premiumLocked: 'Premium · {p}', lockedBtn: 'Bloqueado', playWith: '¡Jugar con {n}!', yourRecord: 'Tu récord: {n}', debugMode: '  ·  modo debug',
    prodNoAds: 'Mochi · Sin anuncios', prodChar: 'Personaje: {n}', themes: ['Amanecer', 'Día soleado', 'Atardecer', 'Noche estrellada'],
    signs: ['¡Vamos!', '¡Mochi!', '♥', '¡Ánimo!', '★'],
    mDone: '¡Compra completada!', mPending: 'Compra pendiente: se activará cuando Google Play la confirme.', mFail: 'No se pudo completar la compra.',
    mRestored: 'Compras restauradas ({n})', mNone: 'No hay compras que restaurar', mRestoreFail: 'No se pudieron restaurar las compras.',
    mPrivSim: 'Formulario de privacidad (simulado)', mAdsNA: 'Los anuncios no están disponibles ahora.', mNoAd: 'No hay ningún anuncio disponible ahora mismo.',
    mAdFail: 'No se pudo mostrar el anuncio.', mSim: '(simulado · debug)', mCancel: 'Cancelar', mBuy: 'Comprar', mAdTest: 'Anuncio de prueba',
    mAdEnds: 'El anuncio termina en {n}…', mClose: 'Cerrar sin recompensa',
    desc: { mochi: 'Una bolita de gelatina curiosa y saltarina. ¡La de siempre!', tiovivo: 'Lleva una feria dentro y siempre está dando vueltas a las cosas.',
      atomo: 'Pequeñito pero lleno de energía. Sus electrones no se están quietos.', cosmo: 'Tiene el sistema solar en la barriga. Muy soñador.',
      copito: 'Una bola de nieve con patas. Le encantan el frío y los abrazos.', burbuja: 'Un acuario andante con un pececito muy cotilla.',
      lava: 'Tranquilo y retro. Sus burbujas de lava suben y bajan sin prisa.', tictac: 'Puntual como nadie. Si pegas la oreja, hace tic-tac.',
      trueno: 'Lleva una tormenta dentro… ¡pero es un trozo de pan!', disco: 'La fiesta va con él. ¡Que no pare la música!', nebula: 'Lleva una galaxia entera dentro… y un agujero negro que se lo traga todo.', volcan: 'Tiene un volcán en la tripa. Cuando se emociona, ¡erupción!', caramelo: 'Una fábrica de golosinas con patas. Huele a fresa.', aurora: 'Dentro es de noche: auroras boreales y una ballena que vuela.', prisma: 'Hecho de cristal mágico. Convierte la luz en arcoíris.' },
    inner: { mochi: 'burbujitas', tiovivo: 'un tiovivo con caballitos', atomo: 'un átomo con electrones', cosmo: 'el sistema solar', copito: 'una bola de nieve',
      burbuja: 'un acuario con peces', lava: 'una lámpara de lava', tictac: 'engranajes de reloj', trueno: 'una tormenta con rayos', disco: 'una bola de discoteca', nebula: 'una galaxia con agujero negro', volcan: 'un volcán en erupción', caramelo: 'una fábrica de caramelos', aurora: 'una aurora boreal con ballena', prisma: 'una geoda de cristales arcoíris' },
    mfDesc: 'Corre con Mochi, cambia de color, atraviesa las paredes de gelatina y desbloquea 15 personajes con mundos dentro.'
  };
  D.en = {
    premHint: '👑 Discover the premium characters in “Characters”!',
    newChar: 'New character!', pickIn: 'Pick it in “Characters”',
    sub: 'Run, switch colors and pass through!', chars: 'Characters', tapPlay: 'Tap to play', points: 'Score', record: 'Best',
    newRecord: 'New record!', tapRetry: 'Tap to retry', back: '‹ Back', prev: 'Previous', next: 'Next', noAds: 'No ads',
    restore: 'Restore purchases', privacy: 'Privacy', play: 'Play!', contTitle: 'Keep going from<br>where you left off?', soFar: 'Your score',
    contAd: '▶ Watch ad & continue', contFree: '▶ Continue for free', noThanks: 'No, thanks', pause: 'Paused', tapResume: 'Tap to resume', sound: 'Sound',
    combo: 'Combo {n}  ·  x{m}', tut1: 'Swipe ← → to change lanes', tut2: 'Again! Dodge the chocolate',
    tut3: 'Tap the screen or a colour button below', tut4: 'Pass through walls of your own color!', pResume: '▶ Resume', pRestart: '↻ Restart', pMenu: '⌂ Menu', pauseBtn: 'Pause', turbo: '⚡ Turbo Mode', turboSub: 'Always full speed · points ×1.5', turboRec: 'Turbo best: {n}', turboTag: '⚡ Turbo Mode', howTo: '❓ How to play', skip: 'Skip ›', tutChars: 'Earn points to unlock characters in “Characters” ✨', contHelp: 'Watch a short ad and carry on right where you were', tutBrake: 'Swipe down to brake ⇣', home: 'Menu', demoFast: 'Speed up!', demoBrake: 'Brake', tapStart: '🎵 Tap to start', tutDash: 'Swipe up to boost ⇡ Repeat to chain boosts!', tut5: 'Pick a lane and a color… you got this!',
    run: "Let's run!", wrongColor: 'Wrong color!', plof: 'Splat!', lastChance: 'Last chance this run',
    canContinue: 'You can continue {n} more times this run', noAdsForever: 'No ads forever · {p}', over: ['Splat!', 'Oops!', 'Blub!', 'Ouch!'],
    unlocked: 'Unlocked: {n}!', nextChar: 'Next character: {n} points', allChars: 'You have every character!', recordLine: 'Best: {n}',
    words: { 3: 'Great!', 5: 'Amazing!', 8: 'Mochi-magic!', 12: 'Unstoppable!', 16: 'Legend!', 20: 'Supreme jelly!' },
    comboLost: 'Combo lost', tutDone: "Well done! Let's run! 🍬", goOn: 'Go!', tapCanvas: 'TAP!', ready: 'Get ready!',
    lockedDesc: '??? – Reach {n} points', noAdsOwned: '✓ No ads', noAdsPrice: 'No ads · {p}', buyFor: 'Unlock for {p}',
    inside: 'Inside: {x}', original: 'The original', reachOrBuy: 'Reach {n} points or unlock now', unlockAt: 'Unlocks at {n} points',
    premium: 'Premium', premiumLocked: 'Premium · {p}', lockedBtn: 'Locked', playWith: 'Play as {n}!', yourRecord: 'Your best: {n}', debugMode: '  ·  debug mode',
    prodNoAds: 'Mochi · No ads', prodChar: 'Character: {n}', themes: ['Dawn', 'Sunny day', 'Sunset', 'Starry night'],
    signs: ['Go go!', 'Mochi!', '♥', 'Yay!', '★'],
    mDone: 'Purchase complete!', mPending: 'Purchase pending: it will activate once Google Play confirms it.', mFail: "Couldn't complete the purchase.",
    mRestored: 'Purchases restored ({n})', mNone: 'No purchases to restore', mRestoreFail: "Couldn't restore purchases.",
    mPrivSim: 'Privacy form (simulated)', mAdsNA: 'Ads are not available right now.', mNoAd: 'No ad available right now.',
    mAdFail: "Couldn't show the ad.", mSim: '(simulated · debug)', mCancel: 'Cancel', mBuy: 'Buy', mAdTest: 'Test ad',
    mAdEnds: 'Ad ends in {n}…', mClose: 'Close without reward',
    desc: { mochi: 'A curious, bouncy little jelly ball. The classic!', tiovivo: 'Carries a fair inside and is always going round in circles.',
      atomo: 'Tiny but full of energy. Its electrons never sit still.', cosmo: 'Has the solar system in its tummy. A real dreamer.',
      copito: 'A snowball with feet. Loves the cold and big hugs.', burbuja: 'A walking aquarium with a very nosy little fish.',
      lava: 'Chill and retro. Its lava bubbles drift up and down, no rush.', tictac: 'Never late. Put your ear close and it goes tick-tock.',
      trueno: "There's a storm inside… but it's a total sweetheart!", disco: "The party follows it everywhere. Don't stop the music!", nebula: 'Carries a whole galaxy inside… and a black hole that swallows everything.', volcan: 'Has a volcano in its tummy. When it gets excited: eruption!', caramelo: 'A candy factory on legs. Smells like strawberry.', aurora: 'It is night inside: northern lights and a flying whale.', prisma: 'Made of magic crystal. Turns light into rainbows.' },
    inner: { mochi: 'tiny bubbles', tiovivo: 'a merry-go-round', atomo: 'an atom with electrons', cosmo: 'the solar system', copito: 'a snow globe',
      burbuja: 'an aquarium with fish', lava: 'a lava lamp', tictac: 'clockwork gears', trueno: 'a thunderstorm', disco: 'a disco ball', nebula: 'a galaxy with a black hole', volcan: 'an erupting volcano', caramelo: 'a candy factory', aurora: 'northern lights and a whale', prisma: 'a rainbow crystal geode' },
    mfDesc: 'Run with Mochi, switch colors, pass through jelly walls and unlock 15 characters with worlds inside.'
  };
  D['pt-BR'] = {
    premHint: '👑 Conheça os personagens premium em «Personagens»!',
    newChar: 'Novo personagem!', pickIn: 'Escolha em “Personagens”',
    sub: 'Corra, mude de cor e atravesse!', chars: 'Personagens', tapPlay: 'Toque para jogar', points: 'Pontos', record: 'Recorde',
    newRecord: 'Novo recorde!', tapRetry: 'Toque para jogar de novo', back: '‹ Voltar', prev: 'Anterior', next: 'Próximo', noAds: 'Sem anúncios',
    restore: 'Restaurar compras', privacy: 'Privacidade', play: 'Jogar!', contTitle: 'Continuar de<br>onde parou?', soFar: 'Você fez',
    contAd: '▶ Ver anúncio e continuar', contFree: '▶ Continuar grátis', noThanks: 'Não, obrigado', pause: 'Pausa', tapResume: 'Toque para continuar', sound: 'Som',
    combo: 'Combo {n}  ·  x{m}', tut1: 'Deslize ← → para mudar de pista', tut2: 'De novo! Desvie do chocolate',
    tut3: 'Toque na tela ou num botão de cor abaixo', tut4: 'Atravesse as paredes da sua cor!', pResume: '▶ Continuar', pRestart: '↻ Reiniciar', pMenu: '⌂ Menu', pauseBtn: 'Pausa', turbo: '⚡ Modo Turbo', turboSub: 'Sempre no máximo · pontos ×1,5', turboRec: 'Recorde Turbo: {n}', turboTag: '⚡ Modo Turbo', howTo: '❓ Como jogar', skip: 'Pular ›', tutChars: 'Ganhe pontos para desbloquear personagens em «Personagens» ✨', contHelp: 'Veja um anúncio curtinho e continue de onde parou', tutBrake: 'Deslize para baixo para frear ⇣', home: 'Menu', demoFast: 'Acelera!', demoBrake: 'Freia', tapStart: '🎵 Toque para começar', tutDash: 'Deslize para cima para acelerar ⇡ Repita para encadear!', tut5: 'Escolha pista e cor… você consegue!',
    run: 'Bora correr!', wrongColor: 'Cor errada!', plof: 'Plof!', lastChance: 'Última chance nesta partida',
    canContinue: 'Você pode continuar mais {n} vezes', noAdsForever: 'Sem anúncios para sempre · {p}', over: ['Plof!', 'Ops!', 'Blup!', 'Ai!'],
    unlocked: 'Desbloqueado: {n}!', nextChar: 'Próximo personagem: {n} pontos', allChars: 'Você tem todos os personagens!', recordLine: 'Recorde: {n}',
    words: { 3: 'Show!', 5: 'Incrível!', 8: 'Mochi-mágico!', 12: 'Imparável!', 16: 'Lenda!', 20: 'Gelatina suprema!' },
    comboLost: 'Combo perdido', tutDone: 'Muito bem! Bora correr! 🍬', goOn: 'Vai!', tapCanvas: 'TOQUE!', ready: 'Prepare-se!',
    lockedDesc: '??? – Faça {n} pontos', noAdsOwned: '✓ Sem anúncios', noAdsPrice: 'Sem anúncios · {p}', buyFor: 'Desbloquear por {p}',
    inside: 'Dentro tem {x}', original: 'A original', reachOrBuy: 'Faça {n} pontos ou desbloqueie já', unlockAt: 'Desbloqueia com {n} pontos',
    premium: 'Premium', premiumLocked: 'Premium · {p}', lockedBtn: 'Bloqueado', playWith: 'Jogar com {n}!', yourRecord: 'Seu recorde: {n}', debugMode: '  ·  modo debug',
    prodNoAds: 'Mochi · Sem anúncios', prodChar: 'Personagem: {n}', themes: ['Amanhecer', 'Dia de sol', 'Pôr do sol', 'Noite estrelada'],
    signs: ['Vai!', 'Mochi!', '♥', 'Força!', '★'],
    mDone: 'Compra concluída!', mPending: 'Compra pendente: será ativada quando o Google Play confirmar.', mFail: 'Não foi possível concluir a compra.',
    mRestored: 'Compras restauradas ({n})', mNone: 'Não há compras para restaurar', mRestoreFail: 'Não foi possível restaurar as compras.',
    mPrivSim: 'Formulário de privacidade (simulado)', mAdsNA: 'Os anúncios não estão disponíveis agora.', mNoAd: 'Nenhum anúncio disponível agora.',
    mAdFail: 'Não foi possível mostrar o anúncio.', mSim: '(simulado · debug)', mCancel: 'Cancelar', mBuy: 'Comprar', mAdTest: 'Anúncio de teste',
    mAdEnds: 'O anúncio termina em {n}…', mClose: 'Fechar sem recompensa',
    desc: { mochi: 'Uma bolinha de gelatina curiosa e saltitante. A de sempre!', tiovivo: 'Leva um parque de diversões dentro e vive dando voltas.',
      atomo: 'Pequenininho, mas cheio de energia. Seus elétrons não param.', cosmo: 'Tem o sistema solar na barriga. Muito sonhador.',
      copito: 'Uma bola de neve com pezinhos. Ama o frio e abraços.', burbuja: 'Um aquário ambulante com um peixinho muito fofoqueiro.',
      lava: 'Calmo e retrô. Suas bolhas de lava sobem e descem sem pressa.', tictac: 'Pontual como ninguém. Encoste a orelha: tique-taque.',
      trueno: 'Tem uma tempestade dentro… mas é um doce!', disco: 'A festa vai com ele. Não para a música!', nebula: 'Leva uma galáxia inteira dentro… e um buraco negro que engole tudo.', volcan: 'Tem um vulcão na barriga. Quando se empolga, erupção!', caramelo: 'Uma fábrica de doces com pernas. Tem cheiro de morango.', aurora: 'Lá dentro é noite: auroras boreais e uma baleia voadora.', prisma: 'Feito de cristal mágico. Transforma a luz em arco-íris.' },
    inner: { mochi: 'bolhinhas', tiovivo: 'um carrossel', atomo: 'um átomo com elétrons', cosmo: 'o sistema solar', copito: 'um globo de neve',
      burbuja: 'um aquário com peixes', lava: 'uma lâmpada de lava', tictac: 'engrenagens de relógio', trueno: 'uma tempestade com raios', disco: 'um globo de discoteca', nebula: 'uma galáxia com buraco negro', volcan: 'um vulcão em erupção', caramelo: 'uma fábrica de doces', aurora: 'uma aurora boreal com baleia', prisma: 'um geodo de cristais arco-íris' },
    mfDesc: 'Corra com Mochi, mude de cor, atravesse paredes de gelatina e desbloqueie 15 personagens com mundos dentro.'
  };
  D.fr = {
    premHint: '👑 Découvre les personnages premium dans « Personnages » !',
    newChar: 'Nouveau personnage !', pickIn: 'Choisis-le dans « Personnages »',
    sub: 'Cours, change de couleur et traverse !', chars: 'Personnages', tapPlay: 'Touche pour jouer', points: 'Points', record: 'Record',
    newRecord: 'Nouveau record !', tapRetry: 'Touche pour rejouer', back: '‹ Retour', prev: 'Précédent', next: 'Suivant', noAds: 'Sans pub',
    restore: 'Restaurer les achats', privacy: 'Confidentialité', play: 'Jouer !', contTitle: 'Reprendre là où<br>tu t’es arrêté ?', soFar: 'Ton score',
    contAd: '▶ Voir une pub et continuer', contFree: '▶ Continuer gratuitement', noThanks: 'Non merci', pause: 'Pause', tapResume: 'Touche pour reprendre', sound: 'Son',
    combo: 'Combo {n}  ·  x{m}', tut1: 'Glisse ← → pour changer de voie', tut2: 'Encore ! Évite le chocolat',
    tut3: 'Touche l’écran ou un bouton de couleur en bas', tut4: 'Traverse les murs de ta couleur !', pResume: '▶ Continuer', pRestart: '↻ Recommencer', pMenu: '⌂ Menu', pauseBtn: 'Pause', turbo: '⚡ Mode Turbo', turboSub: 'Toujours à fond · points ×1,5', turboRec: 'Record Turbo : {n}', turboTag: '⚡ Mode Turbo', howTo: '❓ Comment jouer', skip: 'Passer ›', tutChars: 'Gagne des points pour débloquer des personnages dans « Personnages » ✨', contHelp: 'Regarde une courte pub et repars d’ici', tutBrake: 'Glisse vers le bas pour freiner ⇣', home: 'Menu', demoFast: 'Accélère !', demoBrake: 'Freine', tapStart: '🎵 Touche pour commencer', tutDash: 'Glisse vers le haut pour accélérer ⇡ Recommence pour enchaîner !', tut5: 'Choisis voie et couleur… tu peux le faire !',
    run: 'C’est parti !', wrongColor: 'Mauvaise couleur !', plof: 'Plof !', lastChance: 'Dernière chance pour cette partie',
    canContinue: 'Tu peux continuer encore {n} fois', noAdsForever: 'Sans pub pour toujours · {p}', over: ['Plof !', 'Oups !', 'Blup !', 'Aïe !'],
    unlocked: 'Débloqué : {n} !', nextChar: 'Prochain personnage : {n} points', allChars: 'Tu as tous les personnages !', recordLine: 'Record : {n}',
    words: { 3: 'Génial !', 5: 'Incroyable !', 8: 'Mochi-magique !', 12: 'Inarrêtable !', 16: 'Légende !', 20: 'Gelée suprême !' },
    comboLost: 'Combo perdu', tutDone: 'Bravo ! C’est parti ! 🍬', goOn: 'Go !', tapCanvas: 'TOUCHE !', ready: 'Prêt ?',
    lockedDesc: '??? – Atteins {n} points', noAdsOwned: '✓ Sans pub', noAdsPrice: 'Sans pub · {p}', buyFor: 'Débloquer pour {p}',
    inside: 'Dedans : {x}', original: 'L’original', reachOrBuy: 'Atteins {n} points ou débloque-le', unlockAt: 'Déblocage : {n} points',
    premium: 'Premium', premiumLocked: 'Premium · {p}', lockedBtn: 'Verrouillé', playWith: 'Jouer avec {n} !', yourRecord: 'Ton record : {n}', debugMode: '  ·  mode debug',
    prodNoAds: 'Mochi · Sans pub', prodChar: 'Personnage : {n}', themes: ['Aurore', 'Plein soleil', 'Coucher de soleil', 'Nuit étoilée'],
    signs: ['Allez !', 'Mochi !', '♥', 'Bravo !', '★'],
    mDone: 'Achat terminé !', mPending: 'Achat en attente : il sera activé quand Google Play l’aura confirmé.', mFail: 'Impossible de finaliser l’achat.',
    mRestored: 'Achats restaurés ({n})', mNone: 'Aucun achat à restaurer', mRestoreFail: 'Impossible de restaurer les achats.',
    mPrivSim: 'Formulaire de confidentialité (simulé)', mAdsNA: 'Les pubs ne sont pas disponibles pour le moment.', mNoAd: 'Aucune pub disponible pour le moment.',
    mAdFail: 'Impossible d’afficher la pub.', mSim: '(simulé · debug)', mCancel: 'Annuler', mBuy: 'Acheter', mAdTest: 'Pub de test',
    mAdEnds: 'La pub se termine dans {n}…', mClose: 'Fermer sans récompense',
    desc: { mochi: 'Une petite boule de gelée curieuse et sautillante. La classique !', tiovivo: 'Il a une fête foraine dedans et tourne toujours en rond.',
      atomo: 'Tout petit mais plein d’énergie. Ses électrons ne tiennent pas en place.', cosmo: 'Il a le système solaire dans le ventre. Un vrai rêveur.',
      copito: 'Une boule de neige sur pattes. Adore le froid et les câlins.', burbuja: 'Un aquarium sur pattes avec un petit poisson très curieux.',
      lava: 'Zen et rétro. Ses bulles de lave montent et descendent sans se presser.', tictac: 'Toujours à l’heure. Colle ton oreille : tic-tac.',
      trueno: 'Il cache un orage… mais c’est un amour !', disco: 'La fête le suit partout. Que la musique continue !', nebula: 'Il porte toute une galaxie… et un trou noir qui avale tout.', volcan: 'Il a un volcan dans le ventre. Quand il s’emballe : éruption !', caramelo: 'Une usine à bonbons sur pattes. Ça sent la fraise.', aurora: 'Dedans, c’est la nuit : aurores boréales et baleine volante.', prisma: 'Fait de cristal magique. Il change la lumière en arc-en-ciel.' },
    inner: { mochi: 'des bulles', tiovivo: 'un manège', atomo: 'un atome', cosmo: 'le système solaire', copito: 'une boule à neige',
      burbuja: 'un aquarium', lava: 'une lampe à lave', tictac: 'des rouages', trueno: 'un orage', disco: 'une boule disco', nebula: 'une galaxie et un trou noir', volcan: 'un volcan en éruption', caramelo: 'une usine à bonbons', aurora: 'une aurore boréale et une baleine', prisma: 'une géode de cristaux arc-en-ciel' },
    mfDesc: 'Cours avec Mochi, change de couleur, traverse les murs de gelée et débloque 15 personnages avec des mondes à l’intérieur.'
  };
  D.de = {
    premHint: '👑 Entdecke die Premium-Figuren unter „Figuren“!',
    newChar: 'Neue Figur!', pickIn: 'Wähle sie unter „Figuren“',
    sub: 'Lauf, wechsle die Farbe und spring durch!', chars: 'Figuren', tapPlay: 'Tippen zum Spielen', points: 'Punkte', record: 'Rekord',
    newRecord: 'Neuer Rekord!', tapRetry: 'Tippen für neue Runde', back: '‹ Zurück', prev: 'Zurück', next: 'Weiter', noAds: 'Werbefrei',
    restore: 'Käufe wiederherstellen', privacy: 'Datenschutz', play: 'Spielen!', contTitle: 'Da weitermachen,<br>wo du warst?', soFar: 'Bisher',
    contAd: '▶ Werbung ansehen & weiter', contFree: '▶ Gratis weiter', noThanks: 'Nein, danke', pause: 'Pause', tapResume: 'Tippen zum Weiterspielen', sound: 'Ton',
    combo: 'Combo {n}  ·  x{m}', tut1: 'Wische ← →, um die Spur zu wechseln', tut2: 'Nochmal! Weich der Schokolade aus',
    tut3: 'Tippe auf den Bildschirm oder eine Farbtaste unten', tut4: 'Lauf durch Wände in deiner Farbe!', pResume: '▶ Weiter', pRestart: '↻ Neustart', pMenu: '⌂ Menü', pauseBtn: 'Pause', turbo: '⚡ Turbo-Modus', turboSub: 'Immer Vollgas · Punkte ×1,5', turboRec: 'Turbo-Rekord: {n}', turboTag: '⚡ Turbo-Modus', howTo: '❓ So wird gespielt', skip: 'Überspringen ›', tutChars: 'Sammle Punkte, um unter „Figuren“ neue Figuren freizuschalten ✨', contHelp: 'Kurze Werbung ansehen und genau hier weitermachen', tutBrake: 'Nach unten wischen zum Bremsen ⇣', home: 'Menü', demoFast: 'Gas geben!', demoBrake: 'Bremsen', tapStart: '🎵 Tippen zum Starten', tutDash: 'Nach oben wischen für Turbo ⇡ Wiederholen zum Verketten!', tut5: 'Wähl Spur und Farbe… du schaffst das!',
    run: 'Los geht’s!', wrongColor: 'Falsche Farbe!', plof: 'Plopp!', lastChance: 'Letzte Chance in dieser Runde',
    canContinue: 'Du kannst noch {n}× weitermachen', noAdsForever: 'Für immer werbefrei · {p}', over: ['Plopp!', 'Hoppla!', 'Blubb!', 'Autsch!'],
    unlocked: 'Freigeschaltet: {n}!', nextChar: 'Nächste Figur: {n} Punkte', allChars: 'Du hast alle Figuren!', recordLine: 'Rekord: {n}',
    words: { 3: 'Super!', 5: 'Wahnsinn!', 8: 'Mochi-Magie!', 12: 'Unaufhaltsam!', 16: 'Legende!', 20: 'Wackelpudding-König!' },
    comboLost: 'Combo verloren', tutDone: 'Super! Los geht’s! 🍬', goOn: 'Los!', tapCanvas: 'TIPP!', ready: 'Achtung!',
    lockedDesc: '??? – Erreiche {n} Punkte', noAdsOwned: '✓ Werbefrei', noAdsPrice: 'Werbefrei · {p}', buyFor: 'Freischalten für {p}',
    inside: 'Drin: {x}', original: 'Das Original', reachOrBuy: '{n} Punkte holen oder jetzt freischalten', unlockAt: 'Ab {n} Punkten',
    premium: 'Premium', premiumLocked: 'Premium · {p}', lockedBtn: 'Gesperrt', playWith: 'Mit {n} spielen!', yourRecord: 'Dein Rekord: {n}', debugMode: '  ·  Debug-Modus',
    prodNoAds: 'Mochi · Werbefrei', prodChar: 'Figur: {n}', themes: ['Morgengrauen', 'Sonniger Tag', 'Sonnenuntergang', 'Sternennacht'],
    signs: ['Los!', 'Mochi!', '♥', 'Hurra!', '★'],
    mDone: 'Kauf abgeschlossen!', mPending: 'Kauf ausstehend: wird aktiviert, sobald Google Play ihn bestätigt.', mFail: 'Kauf konnte nicht abgeschlossen werden.',
    mRestored: 'Käufe wiederhergestellt ({n})', mNone: 'Keine Käufe zum Wiederherstellen', mRestoreFail: 'Käufe konnten nicht wiederhergestellt werden.',
    mPrivSim: 'Datenschutzformular (simuliert)', mAdsNA: 'Werbung ist gerade nicht verfügbar.', mNoAd: 'Gerade ist keine Werbung verfügbar.',
    mAdFail: 'Werbung konnte nicht angezeigt werden.', mSim: '(simuliert · Debug)', mCancel: 'Abbrechen', mBuy: 'Kaufen', mAdTest: 'Testwerbung',
    mAdEnds: 'Werbung endet in {n}…', mClose: 'Ohne Belohnung schließen',
    desc: { mochi: 'Ein neugieriges, hüpfendes Geleebällchen. Der Klassiker!', tiovivo: 'Trägt einen Jahrmarkt in sich und dreht sich ständig im Kreis.',
      atomo: 'Winzig, aber voller Energie. Seine Elektronen halten nie still.', cosmo: 'Hat das Sonnensystem im Bauch. Ein echter Träumer.',
      copito: 'Ein Schneeball mit Füßen. Liebt Kälte und Umarmungen.', burbuja: 'Ein laufendes Aquarium mit einem sehr neugierigen Fischlein.',
      lava: 'Entspannt und retro. Seine Lavablasen steigen ganz gemütlich auf und ab.', tictac: 'Immer pünktlich. Halt dein Ohr dran: tick-tack.',
      trueno: 'Drinnen tobt ein Gewitter… aber er ist ein Schatz!', disco: 'Wo er ist, ist Party. Die Musik darf nie aufhören!', nebula: 'Trägt eine ganze Galaxie in sich… und ein Schwarzes Loch, das alles verschluckt.', volcan: 'Hat einen Vulkan im Bauch. Wenn er sich freut: Ausbruch!', caramelo: 'Eine Bonbonfabrik auf Beinen. Riecht nach Erdbeere.', aurora: 'Drinnen ist Nacht: Polarlichter und ein fliegender Wal.', prisma: 'Aus magischem Kristall. Macht aus Licht Regenbögen.' },
    inner: { mochi: 'Bläschen', tiovivo: 'ein Karussell', atomo: 'ein Atom', cosmo: 'das Sonnensystem', copito: 'eine Schneekugel',
      burbuja: 'ein Aquarium', lava: 'eine Lavalampe', tictac: 'Uhrwerk-Zahnräder', trueno: 'ein Gewitter', disco: 'eine Discokugel', nebula: 'eine Galaxie mit Schwarzem Loch', volcan: 'ein ausbrechender Vulkan', caramelo: 'eine Bonbonfabrik', aurora: 'Polarlichter mit Wal', prisma: 'eine Regenbogen-Kristallgeode' },
    mfDesc: 'Lauf mit Mochi, wechsle die Farbe, spring durch Geleewände und schalte 15 Figuren mit Welten im Inneren frei.'
  };
  D.it = {
    premHint: '👑 Scopri i personaggi premium in «Personaggi»!',
    newChar: 'Nuovo personaggio!', pickIn: 'Sceglilo in «Personaggi»',
    sub: 'Corri, cambia colore e attraversa!', chars: 'Personaggi', tapPlay: 'Tocca per giocare', points: 'Punti', record: 'Record',
    newRecord: 'Nuovo record!', tapRetry: 'Tocca per riprovare', back: '‹ Indietro', prev: 'Precedente', next: 'Successivo', noAds: 'Senza pubblicità',
    restore: 'Ripristina acquisti', privacy: 'Privacy', play: 'Gioca!', contTitle: 'Riprendere da<br>dove eri rimasto?', soFar: 'Hai fatto',
    contAd: '▶ Guarda la pubblicità e continua', contFree: '▶ Continua gratis', noThanks: 'No, grazie', pause: 'Pausa', tapResume: 'Tocca per continuare', sound: 'Suono',
    combo: 'Combo {n}  ·  x{m}', tut1: 'Scorri ← → per cambiare corsia', tut2: 'Ancora! Schiva il cioccolato',
    tut3: 'Tocca lo schermo o un pulsante colore in basso', tut4: 'Attraversa i muri del tuo colore!', pResume: '▶ Continua', pRestart: '↻ Ricomincia', pMenu: '⌂ Menu', pauseBtn: 'Pausa', turbo: '⚡ Modalità Turbo', turboSub: 'Sempre al massimo · punti ×1,5', turboRec: 'Record Turbo: {n}', turboTag: '⚡ Modalità Turbo', howTo: '❓ Come si gioca', skip: 'Salta ›', tutChars: 'Fai punti per sbloccare personaggi in «Personaggi» ✨', contHelp: 'Guarda un breve annuncio e riparti da qui', tutBrake: 'Scorri verso il basso per frenare ⇣', home: 'Menu', demoFast: 'Accelera!', demoBrake: 'Frena', tapStart: '🎵 Tocca per iniziare', tutDash: 'Scorri verso l’alto per accelerare ⇡ Ripeti per concatenare!', tut5: 'Scegli corsia e colore… ce la puoi fare!',
    run: 'Si corre!', wrongColor: 'Colore sbagliato!', plof: 'Plof!', lastChance: 'Ultima occasione in questa partita',
    canContinue: 'Puoi continuare ancora {n} volte', noAdsForever: 'Senza pubblicità per sempre · {p}', over: ['Plof!', 'Ops!', 'Blup!', 'Ahi!'],
    unlocked: 'Sbloccato: {n}!', nextChar: 'Prossimo personaggio: {n} punti', allChars: 'Hai tutti i personaggi!', recordLine: 'Record: {n}',
    words: { 3: 'Grande!', 5: 'Incredibile!', 8: 'Mochi-magico!', 12: 'Inarrestabile!', 16: 'Leggenda!', 20: 'Gelatina suprema!' },
    comboLost: 'Combo perso', tutDone: 'Bravissimo! Si corre! 🍬', goOn: 'Via!', tapCanvas: 'TOCCA!', ready: 'Pronti?',
    lockedDesc: '??? – Arriva a {n} punti', noAdsOwned: '✓ Senza pubblicità', noAdsPrice: 'Senza pubblicità · {p}', buyFor: 'Sblocca per {p}',
    inside: 'Dentro c’è {x}', original: 'L’originale', reachOrBuy: 'Arriva a {n} punti o sbloccalo ora', unlockAt: 'Si sblocca a {n} punti',
    premium: 'Premium', premiumLocked: 'Premium · {p}', lockedBtn: 'Bloccato', playWith: 'Gioca con {n}!', yourRecord: 'Il tuo record: {n}', debugMode: '  ·  modalità debug',
    prodNoAds: 'Mochi · Senza pubblicità', prodChar: 'Personaggio: {n}', themes: ['Alba', 'Giornata di sole', 'Tramonto', 'Notte stellata'],
    signs: ['Dai!', 'Mochi!', '♥', 'Forza!', '★'],
    mDone: 'Acquisto completato!', mPending: 'Acquisto in sospeso: si attiverà quando Google Play lo confermerà.', mFail: 'Impossibile completare l’acquisto.',
    mRestored: 'Acquisti ripristinati ({n})', mNone: 'Nessun acquisto da ripristinare', mRestoreFail: 'Impossibile ripristinare gli acquisti.',
    mPrivSim: 'Modulo privacy (simulato)', mAdsNA: 'La pubblicità non è disponibile ora.', mNoAd: 'Nessuna pubblicità disponibile al momento.',
    mAdFail: 'Impossibile mostrare la pubblicità.', mSim: '(simulato · debug)', mCancel: 'Annulla', mBuy: 'Compra', mAdTest: 'Pubblicità di prova',
    mAdEnds: 'La pubblicità finisce tra {n}…', mClose: 'Chiudi senza premio',
    desc: { mochi: 'Una pallina di gelatina curiosa e saltellante. La solita!', tiovivo: 'Ha un luna park dentro e gira sempre intorno alle cose.',
      atomo: 'Piccolino ma pieno di energia. I suoi elettroni non stanno mai fermi.', cosmo: 'Ha il sistema solare nella pancia. Un gran sognatore.',
      copito: 'Una palla di neve con le zampe. Ama il freddo e gli abbracci.', burbuja: 'Un acquario ambulante con un pesciolino molto curioso.',
      lava: 'Tranquillo e retrò. Le sue bolle di lava salgono e scendono senza fretta.', tictac: 'Puntuale come nessuno. Avvicina l’orecchio: tic-tac.',
      trueno: 'Ha un temporale dentro… ma è un tesoro!', disco: 'La festa va con lui. Che la musica non si fermi!', nebula: 'Ha dentro una galassia intera… e un buco nero che inghiotte tutto.', volcan: 'Ha un vulcano nella pancia. Quando si emoziona: eruzione!', caramelo: 'Una fabbrica di caramelle con le gambe. Profuma di fragola.', aurora: 'Dentro è notte: aurore boreali e una balena volante.', prisma: 'Fatto di cristallo magico. Trasforma la luce in arcobaleni.' },
    inner: { mochi: 'tante bollicine', tiovivo: 'una giostra', atomo: 'un atomo', cosmo: 'il sistema solare', copito: 'una palla di neve',
      burbuja: 'un acquario', lava: 'una lampada lava', tictac: 'ingranaggi d’orologio', trueno: 'un temporale', disco: 'una palla da discoteca', nebula: 'una galassia con buco nero', volcan: 'un vulcano in eruzione', caramelo: 'una fabbrica di caramelle', aurora: 'un’aurora boreale con balena', prisma: 'una geode di cristalli arcobaleno' },
    mfDesc: 'Corri con Mochi, cambia colore, attraversa i muri di gelatina e sblocca 15 personaggi con mondi dentro.'
  };
  D.ja = {
    premHint: '👑「キャラクター」でプレミアムキャラをチェック！',
    newChar: '新キャラ登場！', pickIn: '「キャラクター」で選べるよ',
    sub: '走って、色を変えて、すり抜けよう！', chars: 'キャラクター', tapPlay: 'タップでスタート', points: 'スコア', record: 'ベスト',
    newRecord: '新記録！', tapRetry: 'タップでもう一回', back: '‹ もどる', prev: '前へ', next: '次へ', noAds: '広告なし',
    restore: '購入を復元', privacy: 'プライバシー', play: 'あそぶ！', contTitle: '続きから<br>プレイする？', soFar: '現在のスコア',
    contAd: '▶ 広告を見て続ける', contFree: '▶ 無料で続ける', noThanks: 'いいえ', pause: 'ポーズ', tapResume: 'タップで再開', sound: 'サウンド',
    combo: 'コンボ {n}  ·  x{m}', tut1: '← → にスワイプしてレーンを変えよう', tut2: 'もう一回！チョコをよけて',
    tut3: '画面か下の色ボタンをタップ', tut4: '同じ色のカベはすり抜けられる！', pResume: '▶ つづける', pRestart: '↻ やりなおす', pMenu: '⌂ メニュー', pauseBtn: 'ポーズ', turbo: '⚡ ターボモード', turboSub: 'ずっと全速力・ポイント×1.5', turboRec: 'ターボ記録：{n}', turboTag: '⚡ ターボモード', howTo: '❓ あそびかた', skip: 'スキップ ›', tutChars: 'ポイントをためて「キャラクター」で仲間を解放しよう ✨', contHelp: '短い広告を見ると、その場からつづけられます', tutBrake: '下にスワイプでブレーキ ⇣', home: 'メニュー', demoFast: '加速！', demoBrake: 'ブレーキ', tapStart: '🎵 タップしてスタート', tutDash: '上にスワイプでダッシュ ⇡ くりかえすと連続ダッシュ！', tut5: 'レーンと色を選んで…きみならできる！',
    run: 'さあ走ろう！', wrongColor: '色がちがう！', plof: 'ぷにっ！', lastChance: 'このプレイでラストチャンス',
    canContinue: 'このプレイであと{n}回続けられます', noAdsForever: 'ずっと広告なし · {p}', over: ['ぷにっ！', 'あらら！', 'ぷくっ！', 'いてっ！'],
    unlocked: '{n} 解放！', nextChar: '次のキャラ：{n}点', allChars: '全キャラそろったよ！', recordLine: 'ベスト：{n}',
    words: { 3: 'いいね！', 5: 'すごい！', 8: 'もちマジック！', 12: '止まらない！', 16: 'レジェンド！', 20: '最強ゼリー！' },
    comboLost: 'コンボ終了', tutDone: 'よくできました！さあ走ろう！🍬', goOn: 'GO！', tapCanvas: 'タップ！', ready: 'よーい！',
    lockedDesc: '??? – {n}点で解放', noAdsOwned: '✓ 広告なし', noAdsPrice: '広告なし · {p}', buyFor: '{p}で解放',
    inside: '中身：{x}', original: 'オリジナル', reachOrBuy: '{n}点で解放、または今すぐ解放', unlockAt: '{n}点で解放',
    premium: 'プレミアム', premiumLocked: 'プレミアム · {p}', lockedBtn: 'ロック中', playWith: '{n}であそぶ！', yourRecord: 'ベスト：{n}', debugMode: '  ·  デバッグ',
    prodNoAds: 'Mochi · 広告なし', prodChar: 'キャラクター：{n}', themes: ['夜明け', 'はれの日', '夕焼け', '星空の夜'],
    signs: ['がんばれ!', 'Mochi!', '♥', 'いけー!', '★'],
    mDone: '購入完了！', mPending: '購入保留中：Google Play の確認後に有効になります。', mFail: '購入を完了できませんでした。',
    mRestored: '購入を復元しました（{n}）', mNone: '復元する購入はありません', mRestoreFail: '購入を復元できませんでした。',
    mPrivSim: 'プライバシー設定（シミュレーション）', mAdsNA: '現在、広告は利用できません。', mNoAd: '今は表示できる広告がありません。',
    mAdFail: '広告を表示できませんでした。', mSim: '（シミュレーション · debug）', mCancel: 'キャンセル', mBuy: '購入', mAdTest: 'テスト広告',
    mAdEnds: 'あと{n}秒で広告終了…', mClose: '報酬なしで閉じる',
    desc: { mochi: '好奇心いっぱい、ぴょんぴょんはねるゼリーボール。いつもの子！', tiovivo: 'おなかの中は遊園地。いつもくるくる考えごと。',
      atomo: 'ちいさいけど元気いっぱい。電子がじっとしていない。', cosmo: 'おなかに太陽系が入ってる。夢見がちな子。',
      copito: '足の生えた雪玉。寒いのとハグが大好き。', burbuja: '歩く水族館。中の小さな魚はとっても知りたがり。',
      lava: 'のんびりレトロ。溶岩の泡がゆっくり上下する。', tictac: '時間ぴったり。耳をあてるとチクタク。',
      trueno: '中では嵐…でも性格はとってもやさしい！', disco: 'いつでもパーティー。音楽を止めないで！', nebula: 'おなかの中に銀河まるごと…なんでも吸いこむブラックホールつき。', volcan: 'おなかに火山。わくわくすると、ふんか！', caramelo: 'あしのはえたお菓子工場。いちごのにおい。', aurora: '中はいつも夜。オーロラと空とぶクジラ。', prisma: 'まほうのクリスタル。光をにじにかえる。' },
    inner: { mochi: 'ちいさな泡', tiovivo: 'メリーゴーランド', atomo: '原子と電子', cosmo: '太陽系', copito: 'スノードーム',
      burbuja: '魚のいる水族館', lava: 'ラバランプ', tictac: '時計の歯車', trueno: '雷の嵐', disco: 'ミラーボール', nebula: '銀河とブラックホール', volcan: 'ふんかする火山', caramelo: 'キャンディ工場', aurora: 'オーロラとクジラ', prisma: 'にじ色のクリスタル' },
    mfDesc: 'Mochiと走って、色を変えて、ゼリーのカベをすり抜け、中に世界がある15体のキャラを解放しよう。'
  };
  D.ko = {
    premHint: '👑 ‘캐릭터’에서 프리미엄 캐릭터를 만나 보세요!',
    newChar: '새 캐릭터!', pickIn: '「캐릭터」에서 골라 보세요',
    sub: '달리고, 색을 바꾸고, 통과하자!', chars: '캐릭터', tapPlay: '탭해서 시작', points: '점수', record: '최고 기록',
    newRecord: '신기록!', tapRetry: '탭해서 다시 하기', back: '‹ 뒤로', prev: '이전', next: '다음', noAds: '광고 제거',
    restore: '구매 복원', privacy: '개인정보', play: '플레이!', contTitle: '이어서<br>할까요?', soFar: '현재 점수',
    contAd: '▶ 광고 보고 계속하기', contFree: '▶ 무료로 계속하기', noThanks: '괜찮아요', pause: '일시정지', tapResume: '탭해서 계속', sound: '소리',
    combo: '콤보 {n}  ·  x{m}', tut1: '← → 로 밀어서 차선 변경', tut2: '한 번 더! 초콜릿을 피해요',
    tut3: '화면이나 아래 색 버튼을 탭하세요', tut4: '같은 색 벽은 통과할 수 있어요!', pResume: '▶ 계속하기', pRestart: '↻ 다시 시작', pMenu: '⌂ 메뉴', pauseBtn: '일시정지', turbo: '⚡ 터보 모드', turboSub: '항상 최고 속도 · 점수 ×1.5', turboRec: '터보 최고 기록: {n}', turboTag: '⚡ 터보 모드', howTo: '❓ 게임 방법', skip: '건너뛰기 ›', tutChars: '점수를 모아 ‘캐릭터’에서 새 친구를 해금하세요 ✨', contHelp: '짧은 광고를 보면 그 자리에서 이어서 해요', tutBrake: '아래로 밀어서 감속 ⇣', home: '메뉴', demoFast: '가속!', demoBrake: '감속', tapStart: '🎵 탭하여 시작', tutDash: '위로 밀어서 가속 ⇡ 반복하면 연속 가속!', tut5: '레인과 색을 골라요… 할 수 있어!',
    run: '달려 보자!', wrongColor: '색이 달라요!', plof: '퐁!', lastChance: '이번 판 마지막 기회',
    canContinue: '이번 판에 {n}번 더 이어갈 수 있어요', noAdsForever: '평생 광고 제거 · {p}', over: ['퐁!', '앗!', '뽀글!', '아야!'],
    unlocked: '해금: {n}!', nextChar: '다음 캐릭터: {n}점', allChars: '모든 캐릭터를 모았어요!', recordLine: '최고 기록: {n}',
    words: { 3: '좋아요!', 5: '대단해요!', 8: '모찌 매직!', 12: '멈출 수 없어!', 16: '전설!', 20: '최강 젤리!' },
    comboLost: '콤보 끊김', tutDone: '잘했어요! 달려 보자! 🍬', goOn: '출발!', tapCanvas: '탭!', ready: '준비!',
    lockedDesc: '??? – {n}점 달성', noAdsOwned: '✓ 광고 제거됨', noAdsPrice: '광고 제거 · {p}', buyFor: '{p}에 해금',
    inside: '안에는 {x}', original: '오리지널', reachOrBuy: '{n}점 달성 또는 지금 해금', unlockAt: '{n}점에 해금',
    premium: '프리미엄', premiumLocked: '프리미엄 · {p}', lockedBtn: '잠김', playWith: '{n}(으)로 플레이!', yourRecord: '내 최고 기록: {n}', debugMode: '  ·  디버그',
    prodNoAds: 'Mochi · 광고 제거', prodChar: '캐릭터: {n}', themes: ['새벽', '맑은 낮', '노을', '별이 빛나는 밤'],
    signs: ['가자!', 'Mochi!', '♥', '힘내!', '★'],
    mDone: '구매 완료!', mPending: '구매 대기 중: Google Play에서 확인되면 활성화됩니다.', mFail: '구매를 완료하지 못했어요.',
    mRestored: '구매 복원 완료 ({n})', mNone: '복원할 구매가 없어요', mRestoreFail: '구매를 복원하지 못했어요.',
    mPrivSim: '개인정보 양식 (시뮬레이션)', mAdsNA: '지금은 광고를 이용할 수 없어요.', mNoAd: '지금 볼 수 있는 광고가 없어요.',
    mAdFail: '광고를 표시하지 못했어요.', mSim: '(시뮬레이션 · debug)', mCancel: '취소', mBuy: '구매', mAdTest: '테스트 광고',
    mAdEnds: '{n}초 후 광고 종료…', mClose: '보상 없이 닫기',
    desc: { mochi: '호기심 많고 통통 튀는 작은 젤리 공. 늘 그 친구!', tiovivo: '몸속에 놀이공원이 있어서 늘 빙글빙글 생각해요.',
      atomo: '작지만 에너지가 넘쳐요. 전자가 가만히 있질 않아요.', cosmo: '배 속에 태양계가 있어요. 꿈 많은 친구.',
      copito: '발 달린 눈뭉치. 추위와 포옹을 좋아해요.', burbuja: '걸어 다니는 수족관. 안에 사는 물고기가 참견쟁이예요.',
      lava: '느긋한 레트로 감성. 용암 방울이 천천히 오르내려요.', tictac: '시간 약속은 칼같이. 귀를 대면 째깍째깍.',
      trueno: '속에는 폭풍이… 하지만 마음은 엄청 착해요!', disco: '어디든 파티! 음악을 멈추지 마!', nebula: '몸속에 은하가 통째로… 모든 걸 삼키는 블랙홀까지!', volcan: '배 속에 화산이 있어요. 신나면 폭발!', caramelo: '다리 달린 사탕 공장. 딸기 향이 나요.', aurora: '안은 늘 밤: 오로라와 하늘을 나는 고래.', prisma: '마법 크리스털로 만들어졌어요. 빛을 무지개로 바꿔요.' },
    inner: { mochi: '작은 거품', tiovivo: '회전목마', atomo: '원자와 전자', cosmo: '태양계', copito: '스노우볼',
      burbuja: '물고기 수족관', lava: '라바 램프', tictac: '시계 톱니바퀴', trueno: '번개 폭풍', disco: '디스코 볼', nebula: '블랙홀이 있는 은하', volcan: '분출하는 화산', caramelo: '사탕 공장', aurora: '오로라와 고래', prisma: '무지개 크리스털 정동' },
    mfDesc: 'Mochi와 함께 달리고, 색을 바꾸고, 젤리 벽을 통과하며 안에 세상이 담긴 캐릭터 15명을 해금하세요.'
  };
  D['zh-Hans'] = {
    premHint: '👑 去「角色」看看高级角色吧！',
    newChar: '新角色！', pickIn: '在“角色”中选择',
    sub: '奔跑、变色、穿过去！', chars: '角色', tapPlay: '点击开始', points: '得分', record: '最高分',
    newRecord: '新纪录！', tapRetry: '点击再来一次', back: '‹ 返回', prev: '上一个', next: '下一个', noAds: '去广告',
    restore: '恢复购买', privacy: '隐私', play: '开始！', contTitle: '从刚才的地方<br>继续吗？', soFar: '当前得分',
    contAd: '▶ 看广告继续', contFree: '▶ 免费继续', noThanks: '不用了', pause: '暂停', tapResume: '点击继续', sound: '声音',
    combo: '连击 {n}  ·  x{m}', tut1: '左右滑动 ← → 换车道', tut2: '再来！躲开巧克力',
    tut3: '点击屏幕或下方的颜色按钮', tut4: '穿过和你同色的墙！', pResume: '▶ 继续', pRestart: '↻ 重新开始', pMenu: '⌂ 菜单', pauseBtn: '暂停', turbo: '⚡ 极速模式', turboSub: '一直全速 · 分数×1.5', turboRec: '极速纪录：{n}', turboTag: '⚡ 极速模式', howTo: '❓ 玩法说明', skip: '跳过 ›', tutChars: '赚取分数，在「角色」里解锁新角色 ✨', contHelp: '看一段短广告，就能从这里继续', tutBrake: '向下滑动来刹车 ⇣', home: '菜单', demoFast: '加速！', demoBrake: '刹车', tapStart: '🎵 点击开始', tutDash: '向上滑动加速 ⇡ 连续滑动可以连加速！', tut5: '选好跑道和颜色……你可以的！',
    run: '跑起来！', wrongColor: '颜色不对！', plof: '噗！', lastChance: '本局最后一次机会',
    canContinue: '本局还能继续 {n} 次', noAdsForever: '永久去广告 · {p}', over: ['噗！', '哎呀！', '咕噜！', '哎哟！'],
    unlocked: '已解锁：{n}！', nextChar: '下一个角色：{n} 分', allChars: '你已集齐所有角色！', recordLine: '最高分：{n}',
    words: { 3: '真棒！', 5: '太厉害了！', 8: '麻糬魔法！', 12: '势不可挡！', 16: '传奇！', 20: '至尊果冻！' },
    comboLost: '连击中断', tutDone: '做得好！跑起来！🍬', goOn: '冲！', tapCanvas: '点击！', ready: '准备！',
    lockedDesc: '??? – 达到 {n} 分', noAdsOwned: '✓ 已去广告', noAdsPrice: '去广告 · {p}', buyFor: '{p} 解锁',
    inside: '里面有{x}', original: '初始角色', reachOrBuy: '达到 {n} 分或立即解锁', unlockAt: '{n} 分解锁',
    premium: '高级', premiumLocked: '高级 · {p}', lockedBtn: '未解锁', playWith: '用{n}开玩！', yourRecord: '你的最高分：{n}', debugMode: '  ·  调试模式',
    prodNoAds: 'Mochi · 去广告', prodChar: '角色：{n}', themes: ['黎明', '晴天', '日落', '星空之夜'],
    signs: ['加油!', 'Mochi!', '♥', '冲呀!', '★'],
    mDone: '购买成功！', mPending: '购买待处理：Google Play 确认后生效。', mFail: '无法完成购买。',
    mRestored: '已恢复购买（{n}）', mNone: '没有可恢复的购买', mRestoreFail: '无法恢复购买。',
    mPrivSim: '隐私表单（模拟）', mAdsNA: '暂时无法使用广告。', mNoAd: '现在没有可用的广告。',
    mAdFail: '无法显示广告。', mSim: '（模拟 · debug）', mCancel: '取消', mBuy: '购买', mAdTest: '测试广告',
    mAdEnds: '广告将在 {n} 秒后结束…', mClose: '关闭（无奖励）',
    desc: { mochi: '好奇又爱蹦跳的小果冻球。经典款！', tiovivo: '肚子里有座游乐园，总是转个不停。',
      atomo: '个子小小，能量满满。电子一刻也停不下来。', cosmo: '肚子里装着太阳系。一个爱做梦的家伙。',
      copito: '长了脚的雪球。最爱寒冷和拥抱。', burbuja: '会走路的水族箱，里面有条特别八卦的小鱼。',
      lava: '悠闲又复古。熔岩泡泡慢悠悠地上上下下。', tictac: '准时第一名。贴耳一听：滴答滴答。',
      trueno: '肚子里有场暴风雨……但其实超级温柔！', disco: '走到哪儿派对就到哪儿。音乐别停！', nebula: '肚子里装着整个银河……还有一个吞掉一切的黑洞。', volcan: '肚子里有座火山，一兴奋就喷发！', caramelo: '长了腿的糖果工厂，闻起来像草莓。', aurora: '里面总是夜晚：极光和会飞的鲸鱼。', prisma: '魔法水晶做成，能把光变成彩虹。' },
    inner: { mochi: '小泡泡', tiovivo: '旋转木马', atomo: '原子和电子', cosmo: '太阳系', copito: '雪花球',
      burbuja: '有鱼的水族箱', lava: '熔岩灯', tictac: '钟表齿轮', trueno: '雷雨', disco: '迪斯科球', nebula: '银河与黑洞', volcan: '喷发的火山', caramelo: '糖果工厂', aurora: '极光与鲸鱼', prisma: '彩虹水晶洞' },
    mfDesc: '和 Mochi 一起奔跑、变色、穿过果冻墙，解锁 15 个内藏小世界的角色。'
  };
  D['zh-Hant'] = {
    premHint: '👑 去「角色」看看高級角色吧！',
    newChar: '新角色！', pickIn: '在「角色」中選擇',
    sub: '奔跑、變色、穿過去！', chars: '角色', tapPlay: '點擊開始', points: '分數', record: '最高分',
    newRecord: '新紀錄！', tapRetry: '點擊再玩一次', back: '‹ 返回', prev: '上一個', next: '下一個', noAds: '移除廣告',
    restore: '恢復購買', privacy: '隱私', play: '開始！', contTitle: '從剛才的地方<br>繼續嗎？', soFar: '目前分數',
    contAd: '▶ 看廣告繼續', contFree: '▶ 免費繼續', noThanks: '不用了', pause: '暫停', tapResume: '點擊繼續', sound: '聲音',
    combo: '連擊 {n}  ·  x{m}', tut1: '左右滑動 ← → 換車道', tut2: '再來！閃開巧克力',
    tut3: '點擊螢幕或下方的顏色按鈕', tut4: '穿過和你同色的牆！', pResume: '▶ 繼續', pRestart: '↻ 重新開始', pMenu: '⌂ 選單', pauseBtn: '暫停', turbo: '⚡ 極速模式', turboSub: '一直全速 · 分數×1.5', turboRec: '極速紀錄：{n}', turboTag: '⚡ 極速模式', howTo: '❓ 玩法說明', skip: '跳過 ›', tutChars: '賺取分數，在「角色」裡解鎖新角色 ✨', contHelp: '看一段短廣告，就能從這裡繼續', tutBrake: '向下滑動來煞車 ⇣', home: '選單', demoFast: '加速！', demoBrake: '煞車', tapStart: '🎵 點擊開始', tutDash: '向上滑動加速 ⇡ 連續滑動可以連加速！', tut5: '選好跑道和顏色……你可以的！',
    run: '跑起來！', wrongColor: '顏色不對！', plof: '噗！', lastChance: '本局最後一次機會',
    canContinue: '本局還能繼續 {n} 次', noAdsForever: '永久移除廣告 · {p}', over: ['噗！', '哎呀！', '咕嚕！', '哎喲！'],
    unlocked: '已解鎖：{n}！', nextChar: '下一個角色：{n} 分', allChars: '你已集滿所有角色！', recordLine: '最高分：{n}',
    words: { 3: '真棒！', 5: '太厲害了！', 8: '麻糬魔法！', 12: '勢不可擋！', 16: '傳奇！', 20: '至尊果凍！' },
    comboLost: '連擊中斷', tutDone: '做得好！跑起來！🍬', goOn: '衝！', tapCanvas: '點擊！', ready: '準備！',
    lockedDesc: '??? – 達到 {n} 分', noAdsOwned: '✓ 已移除廣告', noAdsPrice: '移除廣告 · {p}', buyFor: '{p} 解鎖',
    inside: '裡面有{x}', original: '初始角色', reachOrBuy: '達到 {n} 分或立即解鎖', unlockAt: '{n} 分解鎖',
    premium: '高級', premiumLocked: '高級 · {p}', lockedBtn: '未解鎖', playWith: '用{n}開玩！', yourRecord: '你的最高分：{n}', debugMode: '  ·  除錯模式',
    prodNoAds: 'Mochi · 移除廣告', prodChar: '角色：{n}', themes: ['黎明', '晴天', '日落', '星空之夜'],
    signs: ['加油!', 'Mochi!', '♥', '衝呀!', '★'],
    mDone: '購買成功！', mPending: '購買處理中：Google Play 確認後生效。', mFail: '無法完成購買。',
    mRestored: '已恢復購買（{n}）', mNone: '沒有可恢復的購買', mRestoreFail: '無法恢復購買。',
    mPrivSim: '隱私表單（模擬）', mAdsNA: '目前無法使用廣告。', mNoAd: '現在沒有可用的廣告。',
    mAdFail: '無法顯示廣告。', mSim: '（模擬 · debug）', mCancel: '取消', mBuy: '購買', mAdTest: '測試廣告',
    mAdEnds: '廣告將在 {n} 秒後結束…', mClose: '關閉（無獎勵）',
    desc: { mochi: '好奇又愛蹦跳的小果凍球。經典款！', tiovivo: '肚子裡有座遊樂園，總是轉個不停。',
      atomo: '個子小小，能量滿滿。電子一刻也停不下來。', cosmo: '肚子裡裝著太陽系。一個愛做夢的傢伙。',
      copito: '長了腳的雪球。最愛寒冷和擁抱。', burbuja: '會走路的水族箱，裡面有條特別八卦的小魚。',
      lava: '悠閒又復古。熔岩泡泡慢悠悠地上上下下。', tictac: '準時第一名。貼耳一聽：滴答滴答。',
      trueno: '肚子裡有場暴風雨……但其實超級溫柔！', disco: '走到哪裡派對就到哪裡。音樂別停！', nebula: '肚子裡裝著整個銀河……還有一個吞掉一切的黑洞。', volcan: '肚子裡有座火山，一興奮就噴發！', caramelo: '長了腿的糖果工廠，聞起來像草莓。', aurora: '裡面總是夜晚：極光和會飛的鯨魚。', prisma: '魔法水晶做成，能把光變成彩虹。' },
    inner: { mochi: '小泡泡', tiovivo: '旋轉木馬', atomo: '原子和電子', cosmo: '太陽系', copito: '雪花球',
      burbuja: '有魚的水族箱', lava: '熔岩燈', tictac: '時鐘齒輪', trueno: '雷雨', disco: '迪斯可球', nebula: '銀河與黑洞', volcan: '噴發的火山', caramelo: '糖果工廠', aurora: '極光與鯨魚', prisma: '彩虹水晶洞' },
    mfDesc: '和 Mochi 一起奔跑、變色、穿過果凍牆，解鎖 15 個內藏小世界的角色。'
  };

  // 1.2.4 · probar personaje (anuncio bonificado)
  const TR = {
    es: { trialBtn: '▶ Probar 1 partida', trialFree: '▶ Probar 1 partida gratis', trialLeft: 'Pruebas hoy: {n}', trialNone: 'Sin pruebas por hoy · vuelve mañana', trialTag: 'Probando: {n}', trialEnd: '¿Te ha gustado {n}?', trialBuy: 'Quedártelo · {p}', trialKeep: 'O sigue jugando: se desbloquea con {n} puntos', trialKeepPrem: 'Personaje premium: solo con compra' },
    en: { trialBtn: '▶ Try 1 run', trialFree: '▶ Try 1 run free', trialLeft: 'Trials today: {n}', trialNone: 'No trials left today · come back tomorrow', trialTag: 'Trying: {n}', trialEnd: 'Did you like {n}?', trialBuy: 'Keep it · {p}', trialKeep: 'Or keep playing: unlocks at {n} points', trialKeepPrem: 'Premium character: purchase only' },
    'pt-BR': { trialBtn: '▶ Testar 1 partida', trialFree: '▶ Testar 1 partida grátis', trialLeft: 'Testes hoje: {n}', trialNone: 'Sem testes hoje · volte amanhã', trialTag: 'Testando: {n}', trialEnd: 'Gostou de {n}?', trialBuy: 'Ficar com ele · {p}', trialKeep: 'Ou continue jogando: desbloqueia com {n} pontos', trialKeepPrem: 'Personagem premium: só com compra' },
    fr: { trialBtn: '▶ Essayer 1 partie', trialFree: '▶ Essayer 1 partie gratuite', trialLeft: 'Essais aujourd\'hui : {n}', trialNone: 'Plus d\'essais aujourd\'hui · reviens demain', trialTag: 'Essai : {n}', trialEnd: 'Tu as aimé {n} ?', trialBuy: 'Le garder · {p}', trialKeep: 'Ou continue : déblocage à {n} points', trialKeepPrem: 'Personnage premium : achat uniquement' },
    de: { trialBtn: '▶ 1 Runde testen', trialFree: '▶ 1 Runde gratis testen', trialLeft: 'Tests heute: {n}', trialNone: 'Heute keine Tests mehr · komm morgen wieder', trialTag: 'Test: {n}', trialEnd: 'Hat dir {n} gefallen?', trialBuy: 'Behalten · {p}', trialKeep: 'Oder weiterspielen: frei ab {n} Punkten', trialKeepPrem: 'Premium-Figur: nur per Kauf' },
    it: { trialBtn: '▶ Prova 1 partita', trialFree: '▶ Prova 1 partita gratis', trialLeft: 'Prove oggi: {n}', trialNone: 'Nessuna prova oggi · torna domani', trialTag: 'In prova: {n}', trialEnd: 'Ti è piaciuto {n}?', trialBuy: 'Tienilo · {p}', trialKeep: 'Oppure continua: si sblocca a {n} punti', trialKeepPrem: 'Personaggio premium: solo con acquisto' },
    ja: { trialBtn: '▶ 1回おためし', trialFree: '▶ 1回無料でおためし', trialLeft: '今日のおためし：{n}', trialNone: '今日のおためしは終了・また明日', trialTag: 'おためし中：{n}', trialEnd: '{n}はどうだった？', trialBuy: '手に入れる · {p}', trialKeep: 'または{n}点で解放', trialKeepPrem: 'プレミアムキャラ：購入のみ' },
    ko: { trialBtn: '▶ 1판 체험', trialFree: '▶ 1판 무료 체험', trialLeft: '오늘 체험: {n}', trialNone: '오늘 체험 끝 · 내일 다시 와요', trialTag: '체험 중: {n}', trialEnd: '{n} 마음에 들었나요?', trialBuy: '갖기 · {p}', trialKeep: '또는 계속 플레이: {n}점에 해금', trialKeepPrem: '프리미엄 캐릭터: 구매 전용' },
    'zh-Hans': { trialBtn: '▶ 试玩 1 局', trialFree: '▶ 免费试玩 1 局', trialLeft: '今日试玩：{n}', trialNone: '今日试玩已用完 · 明天再来', trialTag: '试玩中：{n}', trialEnd: '喜欢 {n} 吗？', trialBuy: '收下它 · {p}', trialKeep: '或继续玩：{n} 分解锁', trialKeepPrem: '高级角色：仅限购买' },
    'zh-Hant': { trialBtn: '▶ 試玩 1 局', trialFree: '▶ 免費試玩 1 局', trialLeft: '今日試玩：{n}', trialNone: '今日試玩已用完 · 明天再來', trialTag: '試玩中：{n}', trialEnd: '喜歡 {n} 嗎？', trialBuy: '收下它 · {p}', trialKeep: '或繼續玩：{n} 分解鎖', trialKeepPrem: '高級角色：僅限購買' }
  };
  Object.keys(TR).forEach(k => Object.assign(D[k], TR[k]));
  function detect() {
    const q = (location.search.match(/[?&]lang=([\w-]+)/) || [])[1];
    const list = q ? [q] : (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'es']);
    for (const raw of list) {
      const l = String(raw).toLowerCase().replace('_', '-'), b = l.split('-')[0];
      if (b === 'zh') return /hant|-tw|-hk|-mo/.test(l) ? 'zh-Hant' : 'zh-Hans';
      if (b === 'pt') return 'pt-BR';
      if (D[b]) return b;
    }
    return 'en';
  }
  const LANG = detect(), S = D[LANG];
  const LOCALE = { es: 'es-ES', en: 'en-US', 'pt-BR': 'pt-BR', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', ja: 'ja-JP', ko: 'ko-KR', 'zh-Hans': 'zh-CN', 'zh-Hant': 'zh-TW' }[LANG];
  const CJK = { ja: "'MochiJA',", ko: "'MochiKO',", 'zh-Hans': "'MochiSC',", 'zh-Hant': "'MochiTC'," }[LANG] || '';
  // Fuente para canvas y CSS: Fredoka para latín; subconjunto CJK incluido (offline) + fuentes del sistema
  const FONT = `Fredoka, ${CJK} ui-rounded, 'Hiragino Maru Gothic ProN', 'Noto Sans CJK JP', 'Noto Sans CJK KR', 'Noto Sans CJK SC', 'Noto Sans CJK TC', sans-serif`;
  function T(k, v) {
    let s = S[k] != null ? S[k] : D.es[k];
    if (typeof s === 'string' && v) s = s.replace(/\{(\w+)\}/g, (m, n) => v[n] != null ? v[n] : m);
    return s;
  }
  document.documentElement.lang = LANG;
  document.documentElement.classList.add('lang-' + LANG);
  if (CJK) document.documentElement.classList.add('cjk');
  // Encoge un elemento de texto hasta que quepa en su ancho máximo
  function fit(el, maxW, minScale) {
    if (!el) return; el.style.fontSize = ''; const base = parseFloat(getComputedStyle(el).fontSize); let fs = base;
    const lim = maxW || (el.parentElement ? el.parentElement.clientWidth : innerWidth);
    while (el.scrollWidth > lim && fs > base * (minScale || 0.6)) { fs -= 0.5; el.style.fontSize = fs + 'px'; }
  }
  function apply(root) {
    (root || document).querySelectorAll('[data-i18n]').forEach(e => { e.textContent = T(e.dataset.i18n); });
    (root || document).querySelectorAll('[data-i18n-html]').forEach(e => { e.innerHTML = T(e.dataset.i18nHtml); });
    (root || document).querySelectorAll('[data-i18n-aria]').forEach(e => { e.setAttribute('aria-label', T(e.dataset.i18nAria)); });
  }
  window.I18N = { lang: LANG, locale: LOCALE, T, FONT, fit, apply, dict: D };
  window.T = T;
})();
