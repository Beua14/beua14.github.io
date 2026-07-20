// ============================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================
const SUPABASE_URL = 'https://nfeesrbgyadlgqhctkhi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mZWVzcmJneWFkbGdxaGN0a2hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMDY3MjYsImV4cCI6MjA5OTc4MjcyNn0.3EDW-3MYnfXHzGbnijUVM3zO_wT5L6brvnhTwOmz_ZY';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let TODOS_APPS = [];
let CATEGORIAS = [];
let NOTICIAS_CACHE = [];
let BANNERS_CACHE = [];

const LABELS_DESTAQUE = {
  app_do_dia: 'NOVO', app_da_semana: 'NOVO', recomendado: 'RECOMENDADO',
  patrocinado: 'PATROCINADO', mais_baixado: 'POPULAR', novo: 'NOVO',
};

// ============================================
// NAVBAR COM FUNDO SÓLIDO NO SCROLL
// ============================================
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 40);
});

// ============================================
// SCROLL REVEAL
// ============================================
function iniciarScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}
function observarNovosElementos(seletor) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll(seletor).forEach(el => { el.classList.add('reveal'); observer.observe(el); });
}

// ============================================
// PARTÍCULAS DE FUNDO (leve, só efeito visual)
// ============================================
function iniciarParticulas() {
  const container = document.getElementById('fx-particles');
  if (!container) return;
  const qtd = window.innerWidth < 768 ? 10 : 22;
  for (let i = 0; i < qtd; i++) {
    const p = document.createElement('div');
    p.className = 'fx-particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.bottom = '-10px';
    p.style.animationDuration = (10 + Math.random() * 10) + 's';
    p.style.animationDelay = (Math.random() * 10) + 's';
    container.appendChild(p);
  }
}

// ============================================
// INICIALIZAÇÃO
// ============================================
async function iniciar() {
  document.getElementById('ano-atual').textContent = new Date().getFullYear();
  iniciarScrollReveal();
  iniciarParticulas();
  iniciarSliderTelefone();

  await Promise.all([
    carregarConfiguracoes(),
    carregarBanners(),
    carregarCategorias(),
    carregarApps(),
    carregarNoticias(),
  ]);

  montarHeroSlides();
}

// ============================================
// CONFIGURAÇÕES DO SITE
// ============================================
async function carregarConfiguracoes() {
  const { data } = await db.from('configuracoes').select().eq('id', 1).maybeSingle();
  if (!data) return;
  document.title = (data.nome_site || 'BEUA14') + ' — Descubra. Baixe. Aproveite.';
  document.getElementById('footer-nome-site').textContent = data.nome_site || 'BEUA14';
  if (data.descricao) document.getElementById('footer-descricao').textContent = data.descricao;

  const social = document.getElementById('social-icons');
  const redes = [
    { url: data.facebook, icon: 'fa-facebook-f' },
    { url: data.instagram, icon: 'fa-instagram' },
    { url: data.telegram, icon: 'fa-telegram' },
  ];
  redes.forEach(r => { if (r.url) social.innerHTML += '<a href="' + r.url + '" target="_blank"><i class="fab ' + r.icon + '"></i></a>'; });
  if (data.telegram) document.getElementById('telegram-link').href = data.telegram;
}

// ============================================
// BANNERS
// ============================================
async function carregarBanners() {
  const { data } = await db.from('banners').select().eq('ativo', true).order('ordem');
  const agora = new Date();
  BANNERS_CACHE = (data || []).filter(b => {
    if (b.data_inicio && new Date(b.data_inicio) > agora) return false;
    if (b.data_fim && new Date(b.data_fim) < agora) return false;
    return true;
  });
}

// ============================================
// CATEGORIAS
// ============================================
async function carregarCategorias() {
  const { data } = await db.from('categorias').select().order('ordem');
  CATEGORIAS = data || [];
  renderizarCategorias();
}

function renderizarCategorias() {
  const grid = document.getElementById('categorias-grid');
  const footerCats = document.getElementById('footer-categorias');
  if (CATEGORIAS.length === 0) { grid.innerHTML = '<div class="empty-state">Nenhuma categoria cadastrada ainda.</div>'; return; }

  grid.innerHTML = CATEGORIAS.slice(0, 6).map(c => {
    const qtd = TODOS_APPS.filter(a => a.categoria === c.nome).length;
    return '<div class="categoria-card reveal" onclick="filtrarPorCategoria(\'' + c.nome.replace(/'/g, "\\'") + '\')">' +
      '<i class="fas ' + iconeFontAwesome(c.icone) + '"></i><h3>' + c.nome + '</h3><span>' + qtd + ' apps</span></div>';
  }).join('');

  footerCats.innerHTML = CATEGORIAS.slice(0, 5).map(c =>
    '<li><a href="#aplicativos" onclick="filtrarPorCategoria(\'' + c.nome.replace(/'/g, "\\'") + '\')">' + c.nome + '</a></li>'
  ).join('');

  observarNovosElementos('.categoria-card');
}

function iconeFontAwesome(emoji) {
  const mapa = {
    '🎮': 'fa-gamepad', '🛠️': 'fa-wrench', '💬': 'fa-comments', '🎬': 'fa-film',
    '🎵': 'fa-music', '📹': 'fa-video', '📚': 'fa-graduation-cap', '🔧': 'fa-screwdriver-wrench',
    '⚡': 'fa-bolt', '📦': 'fa-box', '💼': 'fa-briefcase', '📊': 'fa-chart-simple',
  };
  return mapa[emoji] || 'fa-shapes';
}

function filtrarPorCategoria(nome) {
  document.getElementById('aplicativos').scrollIntoView({ behavior: 'smooth' });
  renderizarNovidades(nome);
}

// ============================================
// APPS
// ============================================
async function carregarApps() {
  const { data } = await db.from('apps').select().eq('ativo', true).order('data_publicacao', { ascending: false });
  TODOS_APPS = data || [];
  renderizarCategorias();
  renderizarNovidades();
  atualizarEstatisticasRodape();
  carregarDownloadsHoje();
}

function ehRecente(dataStr) {
  const dias = (Date.now() - new Date(dataStr).getTime()) / (1000 * 60 * 60 * 24);
  return dias <= 7;
}

function estrelasHtml(app) {
  if (app.avaliacao === null || app.avaliacao === undefined) return '';
  return '<span class="stars"><i class="fas fa-star"></i> ' + Number(app.avaliacao).toFixed(1) + '</span>';
}

function renderizarNovidades(filtroCategoria) {
  const carousel = document.getElementById('novidades-carousel');
  let lista = TODOS_APPS;
  if (filtroCategoria) lista = lista.filter(a => a.categoria === filtroCategoria);
  if (lista.length === 0) { carousel.innerHTML = '<div class="empty-state">Nenhum aplicativo encontrado.</div>'; return; }

  const fallbackImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56'%3E%3Crect width='56' height='56' rx='14' fill='%23161F2D'/%3E%3C/svg%3E";

  carousel.innerHTML = lista.map(app => {
    const tag = app.destaque
      ? '<div class="app-tag">' + (LABELS_DESTAQUE[app.tipo_destaque] || 'DESTAQUE') + '</div>'
      : (ehRecente(app.data_publicacao) ? '<div class="app-tag atualizado">NOVO</div>' : '');
    return '<div class="app-card reveal" onclick="abrirDetalhes(\'' + app.id + '\')">' + tag +
      '<img class="app-icon" src="' + app.imagem_url + '" onerror="this.src=\'' + fallbackImg + '\'">' +
      '<h3>' + app.nome + '</h3>' +
      '<div class="app-meta">v' + (app.versao || '-') + ' • ' + (app.tamanho || '-') + '</div>' +
      '<div class="app-rating">' + estrelasHtml(app) + '<span><i class="fas fa-download"></i> ' + (app.downloads || 0) + '</span></div>' +
      '<button class="btn-download-mini" onclick="event.stopPropagation(); baixarApp(\'' + app.id + '\', \'' + (app.link_download || '').replace(/'/g, "\\'") + '\')">Download</button>' +
      '</div>';
  }).join('');

  observarNovosElementos('.app-card');
}

document.getElementById('search-input').addEventListener('input', (e) => {
  const termo = e.target.value.toLowerCase();
  const filtrados = termo ? TODOS_APPS.filter(a => a.nome.toLowerCase().includes(termo)) : TODOS_APPS;
  const carousel = document.getElementById('novidades-carousel');
  if (filtrados.length === 0) {
    carousel.innerHTML = '<div class="empty-state">Nenhum aplicativo encontrado para "' + e.target.value + '".</div>';
  } else {
    renderizarListaFiltrada(filtrados);
  }
  document.getElementById('aplicativos').scrollIntoView({ behavior: 'smooth' });
});

function renderizarListaFiltrada(lista) {
  const carousel = document.getElementById('novidades-carousel');
  const fallbackImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56'%3E%3Crect width='56' height='56' rx='14' fill='%23161F2D'/%3E%3C/svg%3E";
  carousel.innerHTML = lista.map(app =>
    '<div class="app-card reveal visible" onclick="abrirDetalhes(\'' + app.id + '\')">' +
    '<img class="app-icon" src="' + app.imagem_url + '" onerror="this.src=\'' + fallbackImg + '\'">' +
    '<h3>' + app.nome + '</h3>' +
    '<div class="app-meta">v' + (app.versao || '-') + ' • ' + (app.tamanho || '-') + '</div>' +
    '<button class="btn-download-mini" onclick="event.stopPropagation(); baixarApp(\'' + app.id + '\', \'' + (app.link_download || '').replace(/'/g, "\\'") + '\')">Download</button>' +
    '</div>'
  ).join('');
}

// ============================================
// HERO SLIDER INTELIGENTE (apps destaque + notícias + atualizações + banners)
// ============================================
let HERO_SLIDES = [];
let heroIndex = 0;
let heroTimer = null;

function montarHeroSlides() {
  const destaquesApps = TODOS_APPS.filter(a => a.destaque)
    .map(a => ({ tipo: 'app', badge: 'Em destaque', app: a }));

  const atualizacoes = TODOS_APPS.filter(a => ehRecente(a.data_publicacao) && !a.destaque)
    .slice(0, 3)
    .map(a => ({ tipo: 'app', badge: 'Atualização', app: a }));

  const destaquesNoticias = NOTICIAS_CACHE.slice(0, 3)
    .map(n => ({ tipo: 'noticia', noticia: n }));

  const bannerSlides = BANNERS_CACHE.map(b => ({ tipo: 'banner', banner: b }));

  HERO_SLIDES = [...destaquesApps, ...destaquesNoticias, ...atualizacoes, ...bannerSlides];

  if (HERO_SLIDES.length === 0) {
    HERO_SLIDES = [{ tipo: 'boasvindas' }];
  }

  heroIndex = 0;
  renderizarHeroSlide(true);
  iniciarAutoplayHero();
}

function renderizarHeroSlide(semAnimacao) {
  const container = document.getElementById('hero-left');
  const slide = HERO_SLIDES[heroIndex];
  const html = construirSlideHtml(slide);

  if (semAnimacao) {
    container.innerHTML = html;
  } else {
    const atual = container.querySelector('.hero-slide');
    if (atual) atual.classList.add('slide-out');
    setTimeout(() => { container.innerHTML = html; }, 250);
  }
}

function construirSlideHtml(slide) {
  if (slide.tipo === 'app') {
    const app = slide.app;
    const fallbackImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='84' height='84'%3E%3Crect width='84' height='84' rx='20' fill='%23161F2D'/%3E%3C/svg%3E";
    return '<div class="hero-slide">' +
      '<div class="slide-badge">' + slide.badge + '</div>' +
      '<div class="slide-app-row">' +
      '<img class="slide-app-icon" src="' + app.imagem_url + '" onerror="this.src=\'' + fallbackImg + '\'">' +
      '<div><h2>' + app.nome + '</h2>' +
      '<div class="slide-app-meta">' + estrelasHtml(app) +
      '<span><i class="fas fa-download"></i> ' + (app.downloads || 0) + '</span>' +
      '<span>' + (app.tamanho || '-') + '</span></div>' +
      '<span class="info-chip">' + (app.categoria || '') + '</span></div></div>' +
      '<p class="slide-desc">' + (app.descricao || '') + '</p>' +
      '<button class="btn btn-brand" onclick="baixarApp(\'' + app.id + '\', \'' + (app.link_download || '').replace(/'/g, "\\'") + '\')">Baixar Agora <i class="fas fa-download"></i></button>' +
      renderizarDots() + '</div>';
  }

  if (slide.tipo === 'noticia') {
    const n = slide.noticia;
    const data = new Date(n.data_publicacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    return '<div class="hero-slide">' +
      '<div class="slide-badge">Notícia</div>' +
      '<div class="slide-noticia-banner"><img src="' + n.imagem_url + '" onerror="this.style.display=\'none\'"></div>' +
      '<span class="info-chip">' + (n.categoria || '') + '</span>' +
      '<h2 style="margin-top:10px;">' + n.titulo + '</h2>' +
      '<p class="slide-desc">' + (n.subtitulo || '') + '</p>' +
      '<div class="slide-meta-row"><i class="far fa-clock"></i> ' + data + '</div>' +
      '<button class="btn btn-dark" onclick="abrirNoticia(\'' + n.id + '\')">Ler notícia <i class="fas fa-arrow-right"></i></button>' +
      renderizarDots() + '</div>';
  }

  if (slide.tipo === 'banner') {
    const b = slide.banner;
    const link = b.link || '#';
    return '<div class="hero-slide">' +
      '<div class="slide-badge">Promoção</div>' +
      '<a class="slide-banner-link" href="' + link + '" target="_blank"><img src="' + b.imagem_url + '"></a>' +
      renderizarDots() + '</div>';
  }

  // boas-vindas (fallback quando não há nada cadastrado ainda)
  return '<div class="hero-slide">' +
    '<div class="slide-badge">Bem-vindo</div>' +
    '<h2 style="font-size:44px;">Descubra. Baixe.<br><span class="text-brand">Aproveite.</span></h2>' +
    '<p class="slide-desc">O melhor lugar para descobrir e baixar aplicativos Android de forma segura e rápida.</p>' +
    '<a href="#aplicativos" class="btn btn-brand">Explorar Aplicativos <i class="fas fa-arrow-right"></i></a>' +
    '</div>';
}

function renderizarDots() {
  if (HERO_SLIDES.length <= 1) return '';
  return '<div class="hero-dots">' +
    HERO_SLIDES.map((_, i) => '<span class="' + (i === heroIndex ? 'active' : '') + '" onclick="heroSliderGoTo(' + i + ')"></span>').join('') +
    '</div>';
}

function heroSliderMove(direcao) {
  heroIndex = (heroIndex + direcao + HERO_SLIDES.length) % HERO_SLIDES.length;
  renderizarHeroSlide(false);
  reiniciarAutoplayHero();
}

function heroSliderGoTo(i) {
  heroIndex = i;
  renderizarHeroSlide(false);
  reiniciarAutoplayHero();
}

function iniciarAutoplayHero() {
  heroTimer = setInterval(() => { heroSliderMove(1); }, 5000);
}
function reiniciarAutoplayHero() {
  clearInterval(heroTimer);
  iniciarAutoplayHero();
}

// ============================================
// SLIDER DO TELEFONE (prévia do app)
// ============================================
const PHONE_SLIDES = [
  '<div class="phone-header"><i class="fas fa-robot"></i> BEUA14</div>' +
  '<div class="phone-welcome">Bem-vindo de volta!<span>Encontre os melhores aplicativos para seu Android</span></div>' +
  '<div class="phone-search"><i class="fas fa-search"></i> Buscar aplicativos...</div>' +
  '<div class="phone-categorias-label">Categorias <span>Ver todas</span></div>' +
  '<div class="phone-categorias-grid">' +
  '<div class="pc-item"><i class="fas fa-gamepad"></i>Jogos</div>' +
  '<div class="pc-item"><i class="fas fa-wrench"></i>Ferramentas</div>' +
  '<div class="pc-item"><i class="fas fa-film"></i>Entretenimento</div>' +
  '<div class="pc-item"><i class="fas fa-comments"></i>Comunicação</div>' +
  '<div class="pc-item"><i class="fas fa-wand-magic-sparkles"></i>Personalização</div>' +
  '<div class="pc-item"><i class="fas fa-chart-simple"></i>Produtividade</div></div>',

  '<div class="phone-header"><i class="fas fa-arrow-left"></i> Detalhes</div>' +
  '<div style="display:flex; gap:10px; align-items:center; margin-top:6px;">' +
  '<div style="width:44px; height:44px; border-radius:12px; background:linear-gradient(135deg, var(--brand), var(--brand-2));"></div>' +
  '<div><strong style="font-size:12px;">SnapTube</strong><div style="font-size:9px; color:var(--text-secondary);">Entretenimento</div></div></div>' +
  '<div style="display:flex; gap:6px; margin-top:8px;"><span class="info-chip" style="font-size:9px; padding:4px 8px;">v7.25</span>' +
  '<span class="info-chip" style="font-size:9px; padding:4px 8px;">23.5 MB</span></div>' +
  '<p style="font-size:9px; color:var(--text-secondary); margin-top:10px; line-height:1.5;">Baixe vídeos e músicas favoritas com apenas um toque.</p>' +
  '<div class="phone-search" style="justify-content:center; background:linear-gradient(135deg, var(--brand), var(--brand-2)); color:#05130a; font-weight:700; margin-top:14px;">Baixar agora</div>',

  '<div class="phone-header"><i class="fas fa-newspaper"></i> Notícias</div>' +
  '<div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">' +
  '<div style="background:var(--card); border-radius:8px; padding:8px;"><div style="font-size:8px; color:var(--brand); font-weight:700;">TECNOLOGIA</div><div style="font-size:10px; margin-top:3px;">WhatsApp lança nova função</div></div>' +
  '<div style="background:var(--card); border-radius:8px; padding:8px;"><div style="font-size:8px; color:var(--brand); font-weight:700;">SEGURANÇA</div><div style="font-size:10px; margin-top:3px;">Como manter seu Android seguro</div></div>' +
  '<div style="background:var(--card); border-radius:8px; padding:8px;"><div style="font-size:8px; color:var(--brand); font-weight:700;">DICAS</div><div style="font-size:10px; margin-top:3px;">5 apps essenciais pra você</div></div></div>',
];
let phoneSlideIndex = 0;
function iniciarSliderTelefone() {
  const tela = document.getElementById('phone-screen');
  if (!tela) return;
  tela.innerHTML = PHONE_SLIDES[0];
  setInterval(() => {
    tela.classList.add('fading');
    setTimeout(() => {
      phoneSlideIndex = (phoneSlideIndex + 1) % PHONE_SLIDES.length;
      tela.innerHTML = PHONE_SLIDES[phoneSlideIndex];
      tela.classList.remove('fading');
    }, 400);
  }, 4500);
}

// ============================================
// MODAL DE DETALHES DO APP
// ============================================
function abrirDetalhes(appId) {
  const app = TODOS_APPS.find(a => a.id === appId);
  if (!app) return;
  const mensagem = encodeURIComponent('Confira o app "' + app.nome + '" no BEUA14: ' + app.link_download);
  const linkCodificado = encodeURIComponent(app.link_download || '');
  const fallbackImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='76' height='76'%3E%3Crect width='76' height='76' rx='18' fill='%23161F2D'/%3E%3C/svg%3E";

  document.getElementById('modal-box').innerHTML =
    '<button class="modal-close" onclick="fecharModal()"><i class="fas fa-times"></i></button>' +
    '<img class="app-icon-lg" src="' + app.imagem_url + '" onerror="this.src=\'' + fallbackImg + '\'">' +
    '<h2>' + app.nome + '</h2>' +
    '<div style="color:var(--text-secondary); font-size:13px;">' + (app.categoria || '') + '</div>' +
    '<div class="info-chips">' + estrelasHtml(app) +
    '<span class="info-chip">v' + (app.versao || '-') + '</span>' +
    '<span class="info-chip">' + (app.tamanho || '-') + '</span>' +
    '<span class="info-chip">' + (app.downloads || 0) + ' downloads</span></div>' +
    '<p style="color:var(--text-secondary); font-size:14px; margin:14px 0;">' + (app.descricao || '') + '</p>' +
    '<button class="btn btn-brand" style="width:100%; justify-content:center;" onclick="baixarApp(\'' + app.id + '\', \'' + (app.link_download || '').replace(/'/g, "\\'") + '\')"><i class="fas fa-download"></i> Baixar</button>' +
    '<div class="progress-wrap" id="progress-wrap"><div class="progress-bar-bg"><div class="progress-bar-fill" id="progress-fill"></div></div><div class="progress-label" id="progress-label">Baixando...</div></div>' +
    '<div class="share-row">' +
    '<div class="share-btn" onclick="window.open(\'https://wa.me/?text=' + mensagem + '\')"><i class="fab fa-whatsapp"></i>WhatsApp</div>' +
    '<div class="share-btn" onclick="window.open(\'https://www.facebook.com/sharer/sharer.php?u=' + linkCodificado + '\')"><i class="fab fa-facebook"></i>Facebook</div>' +
    '<div class="share-btn" onclick="window.open(\'https://t.me/share/url?url=' + linkCodificado + '\')"><i class="fab fa-telegram"></i>Telegram</div>' +
    '<div class="share-btn" onclick="window.open(\'https://twitter.com/intent/tweet?text=' + mensagem + '\')"><i class="fab fa-x-twitter"></i>X</div>' +
    '<div class="share-btn" onclick="copiarLink(\'' + (app.link_download || '').replace(/'/g, "\\'") + '\')"><i class="fas fa-link"></i>Copiar</div></div>';
  document.getElementById('modal-overlay').classList.add('open');
}

function fecharModal() { document.getElementById('modal-overlay').classList.remove('open'); }
function copiarLink(link) { navigator.clipboard.writeText(link); alert('Link copiado!'); }
document.getElementById('modal-overlay').addEventListener('click', (e) => { if (e.target.id === 'modal-overlay') fecharModal(); });

// ============================================
// DOWNLOAD (fica na página com progresso quando possível)
// ============================================
async function baixarApp(appId, link) {
  db.rpc('increment_downloads', { app_id: appId }).then(() => {});
  db.from('downloads_log').insert({ app_id: appId }).then(() => {});

  const progressWrap = document.getElementById('progress-wrap');
  const progressFill = document.getElementById('progress-fill');
  const progressLabel = document.getElementById('progress-label');
  const ehApk = link.toLowerCase().includes('.apk');

  if (!ehApk) { window.location.href = link; return; }
  if (progressWrap) progressWrap.style.display = 'block';

  try {
    const resposta = await fetch(link, { mode: 'cors' });
    if (!resposta.ok || !resposta.body) throw new Error('sem CORS');
    const total = Number(resposta.headers.get('content-length')) || 0;
    const reader = resposta.body.getReader();
    const chunks = []; let recebido = 0;
    while (true) {
      const resultado = await reader.read();
      if (resultado.done) break;
      chunks.push(resultado.value);
      recebido += resultado.value.length;
      if (total > 0 && progressFill) {
        const pct = Math.round((recebido / total) * 100);
        progressFill.style.width = pct + '%';
        progressLabel.textContent = 'Baixando... ' + pct + '%';
      }
    }
    const blob = new Blob(chunks);
    const url = URL.createObjectURL(blob);
    const nomeArquivo = link.split('/').pop().split('?')[0] || 'app.apk';
    const a = document.createElement('a');
    a.href = url; a.download = nomeArquivo;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    if (progressLabel) progressLabel.textContent = 'Download concluído!';
  } catch (e) {
    if (progressLabel) progressLabel.textContent = 'Iniciando download...';
    const a = document.createElement('a');
    a.href = link; a.download = '';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => { if (progressWrap) progressWrap.style.display = 'none'; }, 1500);
  }
}

// ============================================
// NOTÍCIAS
// ============================================
async function carregarNoticias() {
  const agora = new Date().toISOString();
  const { data } = await db.from('noticias').select().eq('status', 'publicada').lte('data_publicacao', agora)
    .order('data_publicacao', { ascending: false }).limit(6);
  NOTICIAS_CACHE = data || [];
  const grid = document.getElementById('noticias-grid');
  if (NOTICIAS_CACHE.length === 0) { grid.innerHTML = '<div class="empty-state">Nenhuma notícia publicada ainda.</div>'; return; }

  grid.innerHTML = NOTICIAS_CACHE.map(n => {
    const data = new Date(n.data_publicacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    const views = n.visualizacoes || 0;
    return '<div class="noticia-card reveal">' +
      '<div class="img-wrap" onclick="abrirNoticia(\'' + n.id + '\')">' +
      '<img src="' + n.imagem_url + '" onerror="this.style.display=\'none\'">' +
      '<div class="noticia-tag">' + (n.categoria || '').toUpperCase() + '</div></div>' +
      '<div class="noticia-body">' +
      '<h3>' + n.titulo + '</h3>' +
      '<div class="noticia-meta"><span><i class="far fa-clock"></i> ' + data + '</span><span><i class="far fa-eye"></i> ' + views + '</span></div>' +
      '<button class="btn-ler-noticia" onclick="abrirNoticia(\'' + n.id + '\')">Ler notícia</button>' +
      '</div></div>';
  }).join('');

  observarNovosElementos('.noticia-card');
}

function abrirNoticia(id) {
  const n = NOTICIAS_CACHE.find(x => x.id === id);
  if (!n) return;
  db.rpc('increment_noticia_views', { noticia_id: id }).then(() => {});

  document.getElementById('modal-box').innerHTML =
    '<button class="modal-close" onclick="fecharModal()"><i class="fas fa-times"></i></button>' +
    '<img src="' + n.imagem_url + '" style="width:100%; border-radius:14px; margin-bottom:16px;" onerror="this.style.display=\'none\'">' +
    '<div class="noticia-tag" style="position:static; display:inline-block;">' + (n.categoria || '').toUpperCase() + '</div>' +
    '<h2 style="margin:8px 0;">' + n.titulo + '</h2>' +
    '<div style="color:var(--text-secondary); font-size:12px; margin-bottom:12px;">' + (n.autor || '') + '</div>' +
    '<p style="color:var(--text-secondary); font-style:italic; margin-bottom:12px;">' + (n.subtitulo || '') + '</p>' +
    '<p style="color:var(--text-primary); font-size:14px; line-height:1.7;">' + (n.conteudo || '') + '</p>';
  document.getElementById('modal-overlay').classList.add('open');
}

// ============================================
// RODAPÉ: ESTATÍSTICAS
// ============================================
function atualizarEstatisticasRodape() {
  document.getElementById('stat-apps').textContent = TODOS_APPS.length + '+';
  const totalDownloads = TODOS_APPS.reduce((soma, a) => soma + (a.downloads || 0), 0);
  document.getElementById('stat-downloads').textContent = totalDownloads.toLocaleString('pt-BR') + '+';
}
async function carregarDownloadsHoje() {
  const hoje = new Date();
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();
  const { data } = await db.from('downloads_log').select('id').gte('criado_em', inicioHoje);
  document.getElementById('stat-hoje').textContent = (data || []).length;
}

// ============================================
// MODAL DE DOAÇÃO
// ============================================
function abrirDoar() {
  document.getElementById('modal-box').innerHTML =
    '<button class="modal-close" onclick="fecharModal()"><i class="fas fa-times"></i></button>' +
    '<div style="width:56px; height:56px; border-radius:50%; background:linear-gradient(135deg, var(--brand), var(--brand-2)); display:flex; align-items:center; justify-content:center; margin-bottom:16px;"><i class="fas fa-heart" style="color:#05130a; font-size:22px;"></i></div>' +
    '<h2>Apoie o BEUA14</h2>' +
    '<p style="color:var(--text-secondary); font-size:14px; margin:10px 0 20px;">Se o BEUA14 te ajudou a encontrar bons apps, considere fazer uma doação. Isso ajuda a manter o projeto no ar.</p>' +
    '<div style="background:var(--card-hover); border-radius:14px; padding:18px; display:flex; flex-direction:column; gap:12px;">' +
    '<div><div style="font-size:11px; color:var(--text-secondary);">Transferência Express</div><div style="font-size:15px; font-weight:700;">934 821 771</div></div>' +
    '<div><div style="font-size:11px; color:var(--text-secondary);">IBAN (BFA)</div><div style="font-size:14px; font-weight:700; word-break:break-all;">AO06 0006 0000 7383 8891 3011 1</div></div>' +
    '<div><div style="font-size:11px; color:var(--text-secondary);">Titular</div><div style="font-size:14px; font-weight:600;">Luis Rodrigues Beua Manuel</div></div></div>' +
    '<button class="btn btn-brand" style="width:100%; justify-content:center; margin-top:18px;" onclick="copiarLink(\'AO06 0006 0000 7383 8891 3011 1\')"><i class="fas fa-copy"></i> Copiar IBAN</button>' +
    '<p style="color:var(--text-secondary); font-size:12px; margin-top:16px; text-align:center;">Dúvidas? <a href="mailto:rodrigsbeua@gmail.com" style="color:var(--brand);">rodrigsbeua@gmail.com</a> · <a href="tel:+244934821771" style="color:var(--brand);">+244 934 821 771</a></p>';
  document.getElementById('modal-overlay').classList.add('open');
}

// ============================================
// SISTEMA DE NOTIFICAÇÕES PUSH
// ============================================
const VAPID_PUBLIC_KEY = 'BKdmEM0HhtDftdLT0ktuw_m4jv2KpGVurmMRS9kxbOq_d13-RApE_lR2nN3inYcbVc3wyZmvKGXibs9JFRIV4-Q';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

function iniciarNotificacoes() {
  // Não oferece de novo se o usuário já decidiu antes (aceitou, recusou ou já está inscrito)
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (localStorage.getItem('beua14_notif_decidido') === '1') return;
  if (Notification.permission === 'denied') return;

  setTimeout(() => {
    const card = document.getElementById('notif-card');
    if (card) card.classList.add('visible');
  }, 10000);
}

document.getElementById('notif-close')?.addEventListener('click', () => {
  document.getElementById('notif-card').classList.remove('visible');
  localStorage.setItem('beua14_notif_decidido', '1');
});

document.getElementById('notif-ativar')?.addEventListener('click', async () => {
  const btn = document.getElementById('notif-ativar');
  btn.disabled = true;
  btn.textContent = 'Ativando...';

  try {
    const permissao = await Notification.requestPermission();
    localStorage.setItem('beua14_notif_decidido', '1');

    if (permissao !== 'granted') {
      document.getElementById('notif-card').classList.remove('visible');
      return;
    }

    const registro = await navigator.serviceWorker.register('service-worker.js');
    const subscription = await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    await db.from('push_subscriptions').upsert({
      endpoint: subscription.endpoint,
      subscription: subscription.toJSON(),
      ativo: true,
    }, { onConflict: 'endpoint' });

    btn.textContent = 'Notificações ativadas ✓';
    setTimeout(() => {
      document.getElementById('notif-card').classList.remove('visible');
    }, 1800);
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Ativar notificações';
    console.error('Erro ao ativar notificações:', e);
  }
});

iniciar();
iniciarNotificacoes();
