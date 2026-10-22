/* =====================================================================
   MOCHI · CONFIGURACIÓN CENTRAL (único sitio donde cambiar estos datos)
   ---------------------------------------------------------------------
   Tras cambiar algo aquí, recompila la app Android con:
       cd /workspace/mochi-android && ./build.sh
   (build.sh copia este fichero al proyecto Android y escribe el nombre
   de la app y el App ID de AdMob en el AndroidManifest automáticamente)
   ===================================================================== */
window.MOCHI_WEB_VERSION = '1.3.0-web (anuncios)';
window.MOCHI_CONFIG = {
  // Nombre visible de la app (icono del móvil y título). Cámbialo aquí.
  appName: 'Mochi',

  // ---- AdMob ----------------------------------------------------------
  // testing:false  -> IDs REALES de tu cuenta (build de PUBLICACIÓN para Play).
  // testing:true   -> IDs de PRUEBA oficiales de Google (para tu móvil mientras
  //                   desarrollas: así no se marcan clics inválidos en tu cuenta).
  // No hace falta tocarlo a mano: ./build.sh usa los reales y
  // MODO=prueba ./build.sh genera un APK con los de prueba.
  admob: {
    testing: true, // APK de pruebas con los ID oficiales de Google; para Play poner false y rellenar los reales
    real: {
      appIdAndroid: 'ca-app-pub-1783137870341265~6228121051',     // App ID de Mochi (cuenta de Eric)
      rewardedAndroid: 'ca-app-pub-1783137870341265/5130661802',  // Bloque bonificado de Mochi
      interstitialAndroid: ''  // FALTA: bloque intersticial real de Eric (vacío = no se muestran intersticiales con IDs reales)
    },
    test: {
      appIdAndroid: 'ca-app-pub-3940256099942544~3347511713',     // App ID de prueba oficial de Google
      rewardedAndroid: 'ca-app-pub-3940256099942544/5224354917',  // Bonificado de prueba oficial de Google
      interstitialAndroid: 'ca-app-pub-3940256099942544/1033173712' // Intersticial de prueba oficial de Google
    }
  },

  // ---- Productos de Google Play (compras únicas, "no consumibles") -----
  // Créalos en Play Console con EXACTAMENTE estos IDs.
  products: {
    noAds: 'mochi_sin_anuncios',
    chars: {
      tiovivo: 'mochi_pj_tiovivo',
      atomo: 'mochi_pj_atomo',
      cosmo: 'mochi_pj_cosmo',
      copito: 'mochi_pj_copito',
      burbuja: 'mochi_pj_burbuja',
      lava: 'mochi_pj_lava',
      tictac: 'mochi_pj_tictac',
      trueno: 'mochi_pj_trueno',
      disco: 'mochi_pj_disco',
      // PREMIUM (solo compra, 0,99 €)
      nebula: 'mochi_pj_nebula',
      volcan: 'mochi_pj_volcan',
      caramelo: 'mochi_pj_caramelo',
      aurora: 'mochi_pj_aurora',
      prisma: 'mochi_pj_prisma'
    }
  },
  // Precios de referencia que se muestran si Google Play aún no ha devuelto
  // el precio real (el precio real lo fijas en Play Console).
  refPrices: { noAds: '2,99 €', char: '0,99 €' },

  // "Seguir donde te quedaste": máximo por partida
  maxContinues: 1, // una vez por partida

  // ---- Ritmo de intersticiales (nunca en mitad de partida ni en la 1.ª sesión)
  interstitial: { everyRuns: 3, minSeconds: 180, afterRewardSeconds: 90, minSession: 2 },

  privacyUrl: 'https://telegra.ph/Pol%C3%ADtica-de-privacidad-de-Mochi-10-12'
};

// IDs efectivos según el modo (no tocar)
(function (a) { const ids = a.testing ? a.test : a.real; a.appIdAndroid = ids.appIdAndroid; a.rewardedAndroid = ids.rewardedAndroid; a.interstitialAndroid = ids.interstitialAndroid || ''; })(window.MOCHI_CONFIG.admob);
