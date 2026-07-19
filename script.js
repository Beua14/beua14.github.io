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

const LABELS_DESTAQUE = {
  app_do_dia: 'NOVO',
  app_da_semana: 'NOVO',
  recomendado: 'RECOMENDADO',
  patrocinado: 'PATROCINADO',
  mais_baixado: 'POPULAR',
  novo: 'NOVO',
};

// ============================================
// NAVBAR COM BLUR NO SCROLL
// ============================================
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 40);
});

// ============================================
// SCROLL REVEAL (fade up)
// ============================================
function iniciarScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// Reobserva elementos criados dinamicamente
function observarNovosElementos(seletor) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll(seletor).forEach(el => {
    el.classList.add('reveal');
    observer.observe(el);
  });
}

// ============================================
// INICIALIZAÇÃO
// ============================================
async function iniciar() {
  document.getElementById('ano-atual').textContent = new Date().getFullYear();
  iniciarScrollReveal();
  iniciarSliderTelefone();

  await Promise.all([
    carregarConfiguracoes(),
    carregarCategorias(),
    carregarApps(),
    carregarNoticias(),
  ]);
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
  redes.forEach(r => {
    if (r.url) social.innerHTML += '<a href="' + r.url + '" target="_blank"><i class="fab ' + r.icon + '"></i></a>';
  });

  if (data.telegram) {
    document.getElementById('telegram-link').href = data.telegram;
  }

  if (data.email) {
    document.getElementById('footer-contato-link').href = 'mailto:' + data.email;
  }
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

  if (CATEGORIAS.length === 0) {
    grid.innerHTML = '<div class="empty-state">Nenhuma categoria cadastrada ainda.</div>';
    return;
  }

  grid.innerHTML = CATEGORIAS.slice(0, 6).map(c => {
    const qtd = TODOS_APPS.filter(a => a.categoria === c.nome).length;
    return '<div class="categoria-card reveal" onclick="filtrarPorCategoria(\'' + c.nome.replace(/'/g, "\\'") + '\')">' +
      '<i class="fas ' + iconeFontAwesome(c.icone) + '"></i>' +
      '<h3>' + c.nome + '</h3>' +
      '<span>' + qtd + ' apps</span></div>';
  }).join('');

  footerCats.innerHTML = CATEGORIAS.slice(0, 5).map(c =>
    '<li><a href="#aplicativos" onclick="filtrarPorCategoria(\'' + c.nome.replace(/'/g, "\\'") + '\')">' + c.nome + '</a></li>'
  ).join('');

  observarNovosElementos('.categoria-card');
}

// Como as categorias no banco usam emojis como ícone, mapeamos para ícones
// de contorno (Font Awesome) pra manter a identidade visual "tech" do novo design
function iconeFontAwesome(emoji) {
  const mapa = {
    '🎮': 'fa-gamepad',
    '🛠️': 'fa-wrench',
    '💬': 'fa-comments',
    '🎬': 'fa-film',
    '🎵': 'fa-music',
    '📹': 'fa-video',
    '📚': 'fa-graduation-cap',
    '🔧': 'fa-screwdriver-wrench',
    '⚡': 'fa-bolt',
    '📦': 'fa-box',
    '💼': 'fa-briefcase',
    '📊': 'fa-chart-simple',
  };
  return mapa[emoji] || 'fa-shapes';
}

function filtrarPorCategoria(nome) {
  document.getElementById('aplicativos').scrollIntoView({ behavior: 'smooth' });
  // Realça os apps da categoria escolhida no carrossel (sem esconder as demais,
  // pra manter a navegação simples e sem paginação extra)
  const el = document.getElementById('search-input');
  if (el) { el.value = ''; }
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
}

function ehRecente(dataStr) {
  const data = new Date(dataStr);
  const dias = (Date.now() - data.getTime()) / (1000 * 60 * 60 * 24);
  return dias <= 7;
}

function renderizarNovidades(filtroCategoria) {
  const carousel = document.getElementById('novidades-carousel');
  let lista = TODOS_APPS;
  if (filtroCategoria) lista = lista.filter(a => a.categoria === filtroCategoria);

  if (lista.length === 0) {
    carousel.innerHTML = '<div class="empty-state">Nenhum aplicativo encontrado.</div>';
    return;
  }

  const fallbackImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56'%3E%3Crect width='56' height='56' rx='14' fill='%23161F2D'/%3E%3C/svg%3E";

  carousel.innerHTML = lista.map(app => {
    const tag = app.destaque
      ? '<div class="app-tag">' + (LABELS_DESTAQUE[app.tipo_destaque] || 'DESTAQUE') + '</div>'
      : (ehRecente(app.data_publicacao) ? '<div class="app-tag atualizado">NOVO</div>' : '');
    return '<div class="app-card reveal" onclick="abrirDetalhes(\'' + app.id + '\')">' +
      tag +
      '<img class="app-icon" src="' + app.imagem_url + '" onerror="this.src=\'' + fallbackImg + '\'">' +
      '<h3>' + app.nome + '</h3>' +
      '<div class="app-meta">v' + (app.versao || '-') + ' • ' + (app.tamanho || '-') + '</div>' +
      '<div class="app-rating"><span class="stars"><i class="fas fa-download"></i> ' + (app.downloads || 0) + '</span></div>' +
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
    TODOS_APPS_TEMP = filtrados;
    renderizarListaFiltrada(filtrados);
  }
  document.getElementById('aplicativos').scrollIntoView({ behavior: 'smooth' });
});

function renderizarListaFiltrada(lista) {
  const carousel = document.getElementById('novidades-carousel');
  const fallbackImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56'%3E%3Crect width='56' height='56' rx='14' fill='%23161F2D'/%3E%3C/svg%3E";
  carousel.innerHTML = lista.map(app => {
    return '<div class="app-card reveal visible" onclick="abrirDetalhes(\'' + app.id + '\')">' +
      '<img class="app-icon" src="' + app.imagem_url + '" onerror="this.src=\'' + fallbackImg + '\'">' +
      '<h3>' + app.nome + '</h3>' +
      '<div class="app-meta">v' + (app.versao || '-') + ' • ' + (app.tamanho || '-') + '</div>' +
      '<button class="btn-download-mini" onclick="event.stopPropagation(); baixarApp(\'' + app.id + '\', \'' + (app.link_download || '').replace(/'/g, "\\'") + '\')">Download</button>' +
      '</div>';
  }).join('');
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
    '<div class="info-chips">' +
    '<span class="info-chip">v' + (app.versao || '-') + '</span>' +
    '<span class="info-chip">' + (app.tamanho || '-') + '</span>' +
    '<span class="info-chip">' + (app.downloads || 0) + ' downloads</span>' +
    '</div>' +
    '<p style="color:var(--text-secondary); font-size:14px; margin:14px 0;">' + (app.descricao || '') + '</p>' +
    '<button class="btn btn-brand" style="width:100%; justify-content:center;" onclick="baixarApp(\'' + app.id + '\', \'' + (app.link_download || '').replace(/'/g, "\\'") + '\')"><i class="fas fa-download"></i> Baixar</button>' +
    '<div class="progress-wrap" id="progress-wrap">' +
    '<div class="progress-bar-bg"><div class="progress-bar-fill" id="progress-fill"></div></div>' +
    '<div class="progress-label" id="progress-label">Baixando...</div>' +
    '</div>' +
    '<div class="share-row">' +
    '<div class="share-btn" onclick="window.open(\'https://wa.me/?text=' + mensagem + '\')"><i class="fab fa-whatsapp"></i>WhatsApp</div>' +
    '<div class="share-btn" onclick="window.open(\'https://www.facebook.com/sharer/sharer.php?u=' + linkCodificado + '\')"><i class="fab fa-facebook"></i>Facebook</div>' +
    '<div class="share-btn" onclick="window.open(\'https://t.me/share/url?url=' + linkCodificado + '\')"><i class="fab fa-telegram"></i>Telegram</div>' +
    '<div class="share-btn" onclick="window.open(\'https://twitter.com/intent/tweet?text=' + mensagem + '\')"><i class="fab fa-x-twitter"></i>X</div>' +
    '<div class="share-btn" onclick="copiarLink(\'' + (app.link_download || '').replace(/'/g, "\\'") + '\')"><i class="fas fa-link"></i>Copiar</div>' +
    '</div>';
  document.getElementById('modal-overlay').classList.add('open');
}

function fecharModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function copiarLink(link) {
  navigator.clipboard.writeText(link);
  alert('Link copiado!');
}

document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'modal-overlay') fecharModal();
});

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
  if (!ehApk) {
    window.location.href = link;
    return;
  }

  if (progressWrap) progressWrap.style.display = 'block';

  try {
    const resposta = await fetch(link, { mode: 'cors' });
    if (!resposta.ok || !resposta.body) throw new Error('sem CORS');

    const total = Number(resposta.headers.get('content-length')) || 0;
    const reader = resposta.body.getReader();
    const chunks = [];
    let recebido = 0;

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
  const { data } = await db.from('noticias')
    .select()
    .eq('status', 'publicada')
    .lte('data_publicacao', agora)
    .order('data_publicacao', { ascending: false })
    .limit(6);

  NOTICIAS_CACHE = data || [];
  const grid = document.getElementById('noticias-grid');

  if (NOTICIAS_CACHE.length === 0) {
    grid.innerHTML = '<div class="empty-state">Nenhuma notícia publicada ainda.</div>';
    return;
  }

  grid.innerHTML = NOTICIAS_CACHE.map(n => {
    const data = new Date(n.data_publicacao);
    const dataFormatada = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    const views = n.visualizacoes || 0;
    return '<div class="noticia-card reveal" onclick="abrirNoticia(\'' + n.id + '\')">' +
      '<div class="img-wrap">' +
      '<img src="' + n.imagem_url + '" onerror="this.style.display=\'none\'">' +
      '<div class="noticia-tag">' + (n.categoria || '').toUpperCase() + '</div>' +
      '</div>' +
      '<div class="noticia-body">' +
      '<h3>' + n.titulo + '</h3>' +
      '<div class="noticia-meta"><span><i class="far fa-clock"></i> ' + dataFormatada + '</span><span><i class="far fa-eye"></i> ' + views + ' visualizações</span></div>' +
      '</div></div>';
  }).join('');

  observarNovosElementos('.noticia-card');
}

function abrirNoticia(id) {
  const n = NOTICIAS_CACHE.find(x => x.id === id);
  if (!n) return;

  // Contabiliza a visualização (função segura no banco, visitante não tem update direto)
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

const _carregarAppsOriginal = carregarApps;
carregarApps = async function() {
  await _carregarAppsOriginal();
  atualizarEstatisticasRodape();
  carregarDownloadsHoje();
};

async function carregarDownloadsHoje() {
  const hoje = new Date();
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();
  const { data } = await db.from('downloads_log').select('id').gte('criado_em', inicioHoje);
  document.getElementById('stat-hoje').textContent = (data || []).length;
}

// ============================================
// SLIDER AUTOMÁTICO DO TELEFONE (telefone / app / notícias)
// ============================================
const PHONE_SLIDES = [
  // Slide 1: Tela inicial
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
  '<div class="pc-item"><i class="fas fa-chart-simple"></i>Produtividade</div>' +
  '</div>',

  // Slide 2: Detalhes de um app
  '<div class="phone-header"><i class="fas fa-arrow-left"></i> Detalhes</div>' +
  '<div style="display:flex; gap:10px; align-items:center; margin-top:6px;">' +
  '<div style="width:44px; height:44px; border-radius:12px; background:linear-gradient(135deg, var(--brand), var(--brand-2));"></div>' +
  '<div><strong style="font-size:12px;">SnapTube</strong><div style="font-size:9px; color:var(--text-secondary);">Entretenimento</div></div>' +
  '</div>' +
  '<div style="display:flex; gap:6px; margin-top:8px;">' +
  '<span class="info-chip" style="font-size:9px; padding:4px 8px;">v7.25</span>' +
  '<span class="info-chip" style="font-size:9px; padding:4px 8px;">23.5 MB</span>' +
  '</div>' +
  '<p style="font-size:9px; color:var(--text-secondary); margin-top:10px; line-height:1.5;">Baixe vídeos e músicas favoritas com apenas um toque, direto no seu Android.</p>' +
  '<div class="phone-search" style="justify-content:center; background:linear-gradient(135deg, var(--brand), var(--brand-2)); color:#05130a; font-weight:700; margin-top:14px;">Baixar agora</div>',

  // Slide 3: Notícias
  '<div class="phone-header"><i class="fas fa-newspaper"></i> Notícias</div>' +
  '<div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">' +
  '<div style="background:var(--card); border-radius:8px; padding:8px;"><div style="font-size:8px; color:var(--brand); font-weight:700;">TECNOLOGIA</div><div style="font-size:10px; margin-top:3px;">WhatsApp lança nova função</div></div>' +
  '<div style="background:var(--card); border-radius:8px; padding:8px;"><div style="font-size:8px; color:var(--brand); font-weight:700;">SEGURANÇA</div><div style="font-size:10px; margin-top:3px;">Como manter seu Android seguro</div></div>' +
  '<div style="background:var(--card); border-radius:8px; padding:8px;"><div style="font-size:8px; color:var(--brand); font-weight:700;">DICAS</div><div style="font-size:10px; margin-top:3px;">5 apps essenciais pra você</div></div>' +
  '</div>',
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
  }, 4000);
}

// ============================================
// MODAL DE DOAÇÃO
// ============================================
function abrirDoar() {
  document.getElementById('modal-box').innerHTML =
    '<button class="modal-close" onclick="fecharModal()"><i class="fas fa-times"></i></button>' +
    '<div style="width:56px; height:56px; border-radius:50%; background:linear-gradient(135deg, var(--brand), var(--brand-2)); display:flex; align-items:center; justify-content:center; margin-bottom:16px;">' +
    '<i class="fas fa-heart" style="color:#05130a; font-size:22px;"></i></div>' +
    '<h2>Apoie o BEUA14</h2>' +
    '<p style="color:var(--text-secondary); font-size:14px; margin:10px 0 20px;">Se o BEUA14 te ajudou a encontrar bons apps, considere fazer uma doação. Isso ajuda a manter o projeto no ar.</p>' +
    '<div style="background:var(--card-hover); border-radius:14px; padding:18px; display:flex; flex-direction:column; gap:12px;">' +
    '<div><div style="font-size:11px; color:var(--text-secondary);">Transferência Express</div><div style="font-size:15px; font-weight:700;">934 821 771</div></div>' +
    '<div><div style="font-size:11px; color:var(--text-secondary);">IBAN (BFA)</div><div style="font-size:14px; font-weight:700; word-break:break-all;">AO06 0006 0000 7383 8891 3011 1</div></div>' +
    '<div><div style="font-size:11px; color:var(--text-secondary);">Titular</div><div style="font-size:14px; font-weight:600;">Luis Rodrigues Beua Manuel</div></div>' +
    '</div>' +
    '<button class="btn btn-brand" style="width:100%; justify-content:center; margin-top:18px;" onclick="copiarLink(\'AO06 0006 0000 7383 8891 3011 1\')"><i class="fas fa-copy"></i> Copiar IBAN</button>' +
    '<p style="color:var(--text-secondary); font-size:12px; margin-top:16px; text-align:center;">Dúvidas? <a href="mailto:rodrigsbeua@gmail.com" style="color:var(--brand);">rodrigsbeua@gmail.com</a> · <a href="tel:+244934821771" style="color:var(--brand);">+244 934 821 771</a></p>';
  document.getElementById('modal-overlay').classList.add('open');
}

iniciar();
