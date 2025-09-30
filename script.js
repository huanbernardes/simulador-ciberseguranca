// ===== Dados de exemplo para phishing =====
const emails = [
  { id:1, from: "Banco Seguro <suporte@bancoseguro.com>", subject: "Atualize seus dados de segurança", body: `Clique no link para atualizar suas informações: <a href="http://bancoseguro-login.fake" target="_blank">bancoseguro-login.fake</a>`, isPhish: true, explain: "O link parece real, mas leva para um domínio suspeito com 'fake'.", difficulty: 2 },
  { id:2, from: "Equipe RH rh@minhaempresa.com", subject: "Calendário de feriados", body: `Segue anexo o calendário oficial de 2025.<br><span style="color:green">[Anexo seguro: feriados2025.pdf]</span>`, isPhish: false, explain: "O remetente e o anexo são legítimos da empresa.", difficulty: 1 },
  { id:3, from: "Correios suporte@correios-br.com", subject: "Sua encomenda está aguardando retirada", body: `Clique aqui para liberar: <a href="http://correios-br.com/entrega" target="_blank">correios-br.com</a>`, isPhish: true, explain: "O domínio real dos Correios é correios.com.br, não correios-br.com.", difficulty: 3 },
  { id:4, from:"noreply@servicodeentrega.com", subject:"Rastreamento: pedido #12345", body:`Seu pacote está a caminho.<br>Acesse <a href="https://servicodeentrega.com/track/12345" target="_blank">servicodeentrega.com/track/12345</a> para ver detalhes.`, isPhish:false, explain:"Pareceu legítimo: domínio correto e sem urgência incomum.", difficulty: 1 },
  { id:5, from:"suporte@empresa.com.br", subject:"[URGENTE] Verifique sua fatura", body:`Abra o anexo para ver a fatura pendente.<br><span style="color:red">[fatura_pendente.pdf]</span>`, isPhish:true, explain:"Anexos inesperados são risco — remetente genérico e tom urgente.", difficulty: 2 },
  { id:6, from:"amigo@email.com", subject:"Confira essas fotos", body:`Oi, segue as fotos do evento!<br><a href="http://photos-free.ly/album" target="_blank">Clique aqui para ver</a>`, isPhish:true, explain:"Link estranho (domínio desconhecido) vindo de um contato — conta pode ter sido comprometida.", difficulty: 2 },
  { id:7, from:"contato@empresa-prevendas.com", subject:"Confirmação de reunião", body:`Confirmando reunião amanhã às 10h.<br>Não esqueça o link: <a href="https://meet.empresa-prevendas.com/abc" target="_blank">meet.empresa-prevendas.com/abc</a>`, isPhish:false, explain:"Conteúdo esperado e link com domínio plausível.", difficulty: 1 }
];

// ===== Utilitários =====
// Fisher-Yates shuffle — retorna uma cópia embaralhada
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ===== Estado =====
let currentEmailIndex = 0;
let shuffledEmails = emails.slice();
let score = Number(localStorage.getItem('sim_score') || 0);

// ===== Elementos do DOM =====
const scoreEl = document.getElementById('score');
scoreEl.textContent = score;

const sections = {
  home: document.getElementById('home'),
  phishing: document.getElementById('phishing'),
  senha: document.getElementById('senha'),
  tfa: document.getElementById('tfa'),
  results: document.getElementById('results')
};

const emailBox = document.getElementById('email-box');
const phishFeedback = document.getElementById('phish-feedback');
const nextEmailBtn = document.getElementById('next-email');
const trustBtn = document.getElementById('trust-btn');
const distrustBtn = document.getElementById('distrust-btn');

// ===== Navegação / seções =====
function hideAllSections() {
  Object.values(sections).forEach(s => {
    s.classList.add('d-none');
  });
}

// listeners dos botões do nav
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    // Remove active de todos os botões
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    // Adiciona active ao botão clicado
    e.target.classList.add('active');
    
    const module = e.target.getAttribute('data-module');
    openModule(module);
  });
});

// Botões do home
document.querySelectorAll('.module-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const target = e.currentTarget.getAttribute('data-target');
    // Ativa o botão correspondente na navegação
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-module="${target}"]`).classList.add('active');
    openModule(target);
  });
});

// ===== Função de feedback centralizado =====
function showFeedback(el, html) {
  el.innerHTML = html;
  el.classList.remove('d-none');
}

// ===== PHISHING =====
let emailAnswered = false;

function showEmail(i) {
  trustBtn.style.display = 'inline-block';
  distrustBtn.style.display = 'inline-block';
  nextEmailBtn.classList.add('d-none');

  const e = shuffledEmails[i];
  
  // ✅ CORREÇÃO: Atualiza contadores
  document.getElementById('current-email').textContent = i + 1;
  document.getElementById('total-emails').textContent = shuffledEmails.length;
  
  // ✅ CORREÇÃO: Progresso baseado no email ATUAL (não no próximo)
  const progressPercent = (i / shuffledEmails.length) * 100;
  document.getElementById('phishing-progress').style.width = `${progressPercent}%`;

  if (!e) {
    // ✅ Quando não há mais emails, mostra 100% de progresso
    document.getElementById('phishing-progress').style.width = '100%';
    document.getElementById('current-email').textContent = shuffledEmails.length;
    
    emailBox.innerHTML = '<div class="text-muted p-4 text-center">🎉 Parabéns! Você completou todos os e-mails de phishing!</div>';
    phishFeedback.textContent = '';
    phishFeedback.classList.add('d-none');
    emailAnswered = true;
    trustBtn.style.display = 'none';
    distrustBtn.style.display = 'none';
    nextEmailBtn.classList.add('d-none');
    return;
  }

  emailBox.innerHTML = `
    <div class="email-container rounded">
      <div class="email-header p-3">
        <div class="d-flex justify-content-between flex-wrap gap-2">
          <div class="email-from small">De: <span class="fw-semibold">${e.from}</span></div>
          <div class="email-date text-muted small">${new Date().toLocaleDateString()}</div>
        </div>
        <div class="email-subject small mt-2">Assunto: <span class="fw-semibold">${e.subject}</span></div>
      </div>
      <div class="email-body p-4">${e.body}</div>
    </div>
  `;
  phishFeedback.textContent = '';
  phishFeedback.classList.add('d-none');
  nextEmailBtn.classList.add('d-none');
  emailAnswered = false;
}

trustBtn.addEventListener('click', ()=>answerPhish(true));
distrustBtn.addEventListener('click', ()=>answerPhish(false));

nextEmailBtn.addEventListener('click', ()=>{
  currentEmailIndex++;
  showEmail(currentEmailIndex);
});

function answerPhish(chosenTrust) {
  if (emailAnswered) return;
  const e = shuffledEmails[currentEmailIndex];
  if (!e) return;

  const userCorrect = (chosenTrust !== e.isPhish);
  const userChoice = chosenTrust ? 'Confiar' : 'Desconfiar';
  const correctChoice = e.isPhish ? 'Desconfiar' : 'Confiar';

  let pointsWon = e.difficulty * 10;
  let pointsLost = e.difficulty * 5;

  if (userCorrect) {
    score += pointsWon;
    showFeedback(phishFeedback, `<div class="alert alert-success">
      ✅ Você escolheu <strong>${userChoice}</strong><br>
      Correto! A resposta certa é <strong>${correctChoice}</strong><br>
      +${pointsWon} pontos — ${e.explain}
    </div>`);
  } else {
    score -= pointsLost;
    showFeedback(phishFeedback, `<div class="alert alert-danger">
      ❌ Você escolheu <strong>${userChoice}</strong><br>
      Errado! A resposta certa é <strong>${correctChoice}</strong><br>
      -${pointsLost} pontos — ${e.explain}
    </div>`);
  }

  updateScore();
  saveHistory({ module: 'phishing', ok: userCorrect, explain: e.explain, id: e.id });
  nextEmailBtn.classList.remove('d-none');
  emailAnswered = true;
  
  // ✅ CORREÇÃO: Atualiza progresso APÓS responder (mostra que este email foi completado)
  const progressPercent = ((currentEmailIndex + 1) / shuffledEmails.length) * 100;
  document.getElementById('phishing-progress').style.width = `${progressPercent}%`;
  document.getElementById('current-email').textContent = currentEmailIndex + 1;
}

// ✅ CORREÇÃO: Na inicialização do módulo (na função openModule)
function openModule(mod) {
  hideAllSections();
  const target = sections[mod];
  if (!target) return;
  target.classList.remove('d-none');

  if (mod === 'phishing') {
    shuffledEmails = shuffleArray(emails);
    currentEmailIndex = 0;
    
    // ✅ INICIA COM 0% DE PROGRESSO
    document.getElementById('total-emails').textContent = shuffledEmails.length;
    document.getElementById('current-email').textContent = 1;
    document.getElementById('phishing-progress').style.width = '0%';
    
    showEmail(currentEmailIndex);
    nextEmailBtn.classList.add('d-none');
    trustBtn.style.display = 'inline-block';
    distrustBtn.style.display = 'inline-block';
    phishFeedback.textContent = '';
    phishFeedback.classList.add('d-none');
  
  } else if (mod === 'results') {
    renderHistory();
  }
}
// BOTÃO DE REINICIAR
document.getElementById('restart-phishing').addEventListener('click', restartPhishingModule);

function restartPhishingModule() {
  // Reseta o estado do módulo
  shuffledEmails = shuffleArray(emails);
  currentEmailIndex = 0;
  emailAnswered = false;
  
  // Reseta a interface
  document.getElementById('phishing-progress').style.width = '0%';
  document.getElementById('current-email').textContent = 1;
  document.getElementById('total-emails').textContent = shuffledEmails.length;
  
  // Mostra o primeiro email
  showEmail(currentEmailIndex);
  
  // Esconde feedback e botão próximo
  phishFeedback.classList.add('d-none');
  nextEmailBtn.classList.add('d-none');
  
  // Mostra os botões de ação
  trustBtn.style.display = 'inline-block';
  distrustBtn.style.display = 'inline-block';
  
  // Feedback visual
  showFeedback(phishFeedback, '<div class="alert alert-info">Módulo reiniciado! Começando do primeiro email.</div>');
  
  // Remove o feedback após 2 segundos
  setTimeout(() => {
    phishFeedback.classList.add('d-none');
  }, 2000);
}

// ===== SENHA =====
const pwdInput = document.getElementById('pwd-input');
const pwdMeter = document.getElementById('pwd-meter');
const pwdScoreEl = document.getElementById('pwd-score');
const pwdCatEl = document.getElementById('pwd-category');
const pwdCrackTimeEl = document.getElementById('pwd-crack-time');
const pwdExplain = document.getElementById('pwd-explain');
const pwdSaveBtn = document.getElementById('pwd-save');
const pwdToggle = document.getElementById('pwd-toggle');

let ultimaSenhaSalvaScore = null;
let ultimaSenhaSalvaCategory = null;
let assinaturasSalvas = new Set();

// ===== FUNÇÕES AUXILIARES =====
function pontosPorCategoria(category, score) {
  // ✅ CORREÇÃO: Sistema de pontos baseado em categoria E pontuação
  if (category === 'Fraca') {
    return score < 20 ? 0 : 2;
  }
  if (category === 'Média') {
    return score < 50 ? 5 : 8;
  }
  if (category === 'Forte') {
    return score < 75 ? 12 : 15;
  }
  if (category === 'Muito Forte') {
    return score < 90 ? 20 : 25;
  }
  return 0;
}

function assinaturaSenha(pwd, score) {
  if (!pwd) return '';
  return `${pwd.length}:${pwd[0]||''}:${pwd.slice(-1) || ''}:${score}`;
}

function calculateCrackTime(password, score) {
  if (!password) return '—';
  
  const length = password.length;
  let charsetSize = 0;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  
  if (hasLower) charsetSize += 26;
  if (hasUpper) charsetSize += 26;
  if (hasNumbers) charsetSize += 10;
  if (hasSpecial) charsetSize += 32;
  
  if (charsetSize === 0) charsetSize = 10;
  
  const combinations = Math.pow(charsetSize, length);
  
  let attemptsPerSecond;
  if (charsetSize <= 10) {
    attemptsPerSecond = 10000000000;
  } else if (charsetSize <= 36) {
    attemptsPerSecond = 1000000000;
  } else if (charsetSize <= 62) {
    attemptsPerSecond = 100000000;
  } else {
    attemptsPerSecond = 10000000;
  }
  
  const seconds = combinations / attemptsPerSecond;
  
  if (seconds < 1) return 'Menos de 1 segundo';
  if (seconds < 60) return `${Math.ceil(seconds)} segundos`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} minutos`;
  if (seconds < 86400) return `${Math.ceil(seconds / 3600)} horas`;
  if (seconds < 2592000) return `${Math.ceil(seconds / 86400)} dias`;
  if (seconds < 31536000) return `${Math.ceil(seconds / 2592000)} meses`;
  if (seconds < 315360000) return `${Math.ceil(seconds / 31536000)} anos`;
  if (seconds < 3153600000) return `${Math.ceil(seconds / 315360000)} décadas`;
  
  return 'Séculos';
}

function updateRequirements(pwd) {
  const requirements = {
    'req-length': pwd.length >= 8,
    'req-uppercase': /[A-Z]/.test(pwd),
    'req-lowercase': /[a-z]/.test(pwd),
    'req-numbers': /[0-9]/.test(pwd),
    'req-special': /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)
  };
  
  Object.entries(requirements).forEach(([id, met]) => {
    const element = document.getElementById(id);
    if (element) {
      element.classList.toggle('met', met);
    }
  });
}

function evaluatePassword(pwd) {
  const explain = [];
  let sc = 0;
  
  // Avaliação da senha
  if (pwd.length >= 8) sc += 25; else explain.push('Use pelo menos 8 caracteres');
  if (pwd.length >= 12) sc += 15;
  if (/[a-z]/.test(pwd)) sc += 10; else explain.push('Use letras minúsculas');
  if (/[A-Z]/.test(pwd)) sc += 10; else explain.push('Use letras maiúsculas');
  if (/[0-9]/.test(pwd)) sc += 15; else explain.push('Adicione números');
  
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) {
    sc += 15;
  } else {
    explain.push('Use símbolos (ex: !@#$%)');
  }
  
  // Bônus por combinação de tipos
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) {
    sc += 10;
  }
  
  // Penalidades
  if (/^(password|123456|senha|qwerty|admin|12345678|123456789|123123)/i.test(pwd)) { 
    explain.push('Senha muito comum — evite padrões'); 
    sc = Math.max(0, sc - 20);
  }
  
  // Penalidade por sequências
  if (/(123|234|345|456|567|678|789|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(pwd)) {
    explain.push('Evite sequências óbvias');
    sc = Math.max(0, sc - 10);
  }
  
  sc = Math.max(0, Math.min(100, sc));
  
  // Categoria
  let category;
  if (sc < 40) category = 'Fraca';
  else if (sc < 60) category = 'Média';
  else if (sc < 80) category = 'Forte';
  else category = 'Muito Forte';
  
  const crackTime = calculateCrackTime(pwd, sc);
  updateRequirements(pwd);
  
  if (explain.length === 0) explain.push('Senha parece boa — use gerenciador de senhas e 2FA sempre que possível');
  
  return { 
    score: sc, 
    category, 
    explain, 
    crackTime
  };
}

// ===== EVENT LISTENERS =====

// Toggle visibilidade da senha
pwdToggle.addEventListener('click', () => {
  const type = pwdInput.getAttribute('type') === 'password' ? 'text' : 'password';
  pwdInput.setAttribute('type', type);
  pwdToggle.textContent = type === 'password' ? '👁' : '👁‍🗨';
});

// Avaliação em tempo real
pwdInput.addEventListener('input', () => {
  const pwd = pwdInput.value;
  const res = evaluatePassword(pwd);
  const sig = assinaturaSenha(pwd, res.score);
  
  pwdScoreEl.textContent = res.score;
  pwdCatEl.textContent = res.category;
  pwdCrackTimeEl.textContent = res.crackTime;
  
  // Atualizar barra de força
  pwdMeter.style.width = `${res.score}%`;
  pwdMeter.setAttribute('data-strength', Math.floor(res.score / 25));
  
  // Atualizar dicas
  pwdExplain.innerHTML = res.explain.map(x => `<li>${x}</li>`).join('');
  pwdExplain.classList.toggle('d-none', res.explain.length === 0);
  
  // Controlar botão salvar
  pwdSaveBtn.disabled = !pwd || assinaturasSalvas.has(sig);
});

// Gerar senha segura
document.getElementById('pwd-generate').addEventListener('click', () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  pwdInput.value = password;
  pwdInput.dispatchEvent(new Event('input'));
});

// ✅ CORREÇÃO: Salvar senha com sistema de pontos funcional
pwdSaveBtn.addEventListener('click', () => {
  const pwd = pwdInput.value;
  if (!pwd) {
    showFeedback(pwdExplain, '<div class="alert alert-warning">⚠️ Digite uma senha primeiro.</div>');
    return;
  }
  
  const res = evaluatePassword(pwd);
  const sig = assinaturaSenha(pwd, res.score);
  
  if (assinaturasSalvas.has(sig)) {
    showFeedback(pwdExplain, '<div class="alert alert-warning">⚠️ Esta senha já foi avaliada anteriormente.</div>');
    return;
  }

  // ✅ CORREÇÃO: Usa a nova função de pontos
  const pts = pontosPorCategoria(res.category, res.score);
  
  // ✅ CORREÇÃO: Só aplica pontos se a senha for aceitável
  if (res.category === 'Fraca' && res.score < 30) {
    showFeedback(pwdExplain, '<div class="alert alert-warning">⚠️ Senha muito fraca. Melhore-a para ganhar pontos.</div>');
    return;
  }

  score += pts;
  
  saveHistory({ 
    module: 'senha', 
    ok: res.category !== 'Fraca', 
    score: res.score,
    points: pts,
  });
  
  updateScore();
  assinaturasSalvas.add(sig);
  pwdSaveBtn.disabled = true;
  
  // Feedback claro dos pontos
  showFeedback(pwdExplain, `<div class="alert alert-success">✅ +${pts} pontos aplicados!<br></div>`);
});

// Reset senha
document.getElementById('pwd-reset').addEventListener('click', () => {
  pwdInput.value = '';
  pwdMeter.style.width = '0%';
  pwdScoreEl.textContent = '0';
  pwdCatEl.textContent = '—';
  pwdCrackTimeEl.textContent = '—';
  pwdExplain.classList.add('d-none');
  pwdSaveBtn.disabled = true;
  
  // Reset requisitos
  document.querySelectorAll('.requirement').forEach(req => {
    req.classList.remove('met');
  });
});

// ✅ CORREÇÃO: Reset do módulo quando abrir
function resetPasswordModule() {
  ultimaSenhaSalvaScore = null;
  ultimaSenhaSalvaCategory = null;
  assinaturasSalvas.clear();
  pwdSaveBtn.disabled = true;
}
// ===== 2FA =====
let currentOtp = null;
let tfaMethod = 'sms';
let tfaTries = 0;
const TFA_MAX_TRIES = 3;
let tfaBlockedUntil = null;

const tfaFeedback = document.getElementById('tfa-feedback');
const tfaStep1 = document.getElementById('tfa-step1');
const tfaStep2 = document.getElementById('tfa-step2');
const tfaStep3 = document.getElementById('tfa-step3');
const attemptsRemaining = document.getElementById('attempts-remaining');
const generatedCode = document.getElementById('generated-code');
const selectedMethod = document.getElementById('selected-method');
const countdown = document.getElementById('countdown');
const copyCode = document.getElementById('copy-code');

let countdownInterval = null;

// Seleção do método
document.querySelectorAll('input[name="tfa-method"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    tfaMethod = e.target.value;
    selectedMethod.textContent = tfaMethod.toUpperCase();
  });
});

// ===== CONTROLE DOS PASSOS DO 2FA =====
function updateTfaSteps(currentStep) {
  // Remove active de todos os passos
  document.querySelectorAll('.tfa-steps .step').forEach(step => {
    step.classList.remove('active');
    step.classList.remove('completed');
  });
  
  // Adiciona active ao passo atual e completed aos anteriores
  document.querySelectorAll('.tfa-steps .step').forEach(step => {
    const stepNumber = parseInt(step.getAttribute('data-step'));
    
    if (stepNumber < currentStep) {
      step.classList.add('completed');
    } else if (stepNumber === currentStep) {
      step.classList.add('active');
    }
  });
}
// Login
document.getElementById('tfa-login').addEventListener('click', () => {
  const user = document.getElementById('tfa-user').value;
  const pass = document.getElementById('tfa-pass').value;
  
  if (user === 'aluno' && pass === 'senha123') {
    tfaTries = 0;
    currentOtp = null;
    tfaStep1.classList.add('d-none');
    tfaStep2.classList.remove('d-none');
    updateTfaSteps(2); // ✅ Muda para o passo 2
    showTfaFeedback('Escolha o método de 2FA e clique em "Gerar código".', 'info');
  } else {
    showTfaFeedback('Usuário ou senha incorretos.', 'danger');
  }
});

// Gerar código
document.getElementById('tfa-generate').addEventListener('click', () => {
  if (tfaBlockedUntil && new Date() < tfaBlockedUntil) {
    const seconds = Math.ceil((tfaBlockedUntil - new Date()) / 1000);
    showTfaFeedback(`⛔ Bloqueado temporariamente. Tente novamente em ${seconds}s`, 'danger');
    return;
  }
  
  currentOtp = Math.floor(100000 + Math.random() * 900000).toString();
  tfaTries = 0;
  attemptsRemaining.textContent = TFA_MAX_TRIES;
  
  tfaStep2.classList.add('d-none');
  tfaStep3.classList.remove('d-none');
  updateTfaSteps(3); // ✅ Muda para o passo 3
  
  generatedCode.textContent = currentOtp;
  selectedMethod.textContent = tfaMethod.toUpperCase();
  
  startCountdown();
  showTfaFeedback(`Código gerado para ${tfaMethod.toUpperCase()}`, 'success');
});

// Copiar código
copyCode.addEventListener('click', () => {
  navigator.clipboard.writeText(currentOtp).then(() => {
    showTfaFeedback('Código copiado!', 'success');
  });
});

// Verificar código
document.getElementById('tfa-verify').addEventListener('click', () => {
  if (!currentOtp) return;
  
  const code = document.getElementById('tfa-code').value;
  
  if (tfaBlockedUntil && new Date() < tfaBlockedUntil) {
    const seconds = Math.ceil((tfaBlockedUntil - new Date()) / 1000);
    showTfaFeedback(`⛔ Bloqueado temporariamente. Tente novamente em ${seconds}s`, 'danger');
    return;
  }

  tfaTries++;
  attemptsRemaining.textContent = TFA_MAX_TRIES - tfaTries;
  
  if (code === currentOtp) {
    score += 15;
    saveHistory({ 
      module: 'tfa', 
      ok: true, 
      method: tfaMethod, 
      explain: 'Autenticação 2FA bem-sucedida' 
    });
    showTfaFeedback('✅ Código correto! +15 pontos', 'success');
    updateScore();
    resetTfa();
  } else {
    score -= 5;
    saveHistory({ 
      module: 'tfa', 
      ok: false, 
      method: tfaMethod, 
      explain: 'Código 2FA incorreto' 
    });
    showTfaFeedback(`❌ Código incorreto. -5 pontos — tentativa ${tfaTries} de ${TFA_MAX_TRIES}`, 'danger');
    updateScore();

    if (tfaTries >= TFA_MAX_TRIES) {
      tfaBlockedUntil = new Date(new Date().getTime() + 30000);
      showTfaFeedback('⛔ Muitas tentativas! Bloqueado por 30 segundos.', 'danger');
    }
  }
});

// Regenerar código
document.getElementById('tfa-regenerate').addEventListener('click', () => {
  document.getElementById('tfa-generate').click();
});

// Reset TFA
document.getElementById('tfa-reset').addEventListener('click', resetTfa);

function resetTfa() {
  tfaStep1.classList.remove('d-none');
  tfaStep2.classList.add('d-none');
  tfaStep3.classList.add('d-none');
  document.getElementById('tfa-user').value = '';
  document.getElementById('tfa-pass').value = '';
  document.getElementById('tfa-code').value = '';
  currentOtp = null;
  tfaTries = 0;
  tfaBlockedUntil = null;
  if (countdownInterval) clearInterval(countdownInterval);
  updateTfaSteps(1); // ✅ Volta para o passo 1
  showTfaFeedback('', 'info');
}

function startCountdown() {
  let timeLeft = 300; // 5 minutos
  if (countdownInterval) clearInterval(countdownInterval);
  
  countdownInterval = setInterval(() => {
    timeLeft--;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    countdown.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      showTfaFeedback('⏰ Código expirado! Gere um novo código.', 'warning');
      currentOtp = null;
    }
  }, 1000);
}

function showTfaFeedback(message, type = 'info') {
  if (!message) {
    tfaFeedback.classList.add('d-none');
    return;
  }
  
  tfaFeedback.className = `alert alert-${type} feedback-box`;
  tfaFeedback.innerHTML = message;
  tfaFeedback.classList.remove('d-none');
}
// Exportar resultados
document.getElementById('export-results').addEventListener('click', () => {
  const hist = JSON.parse(localStorage.getItem('sim_history') || '[]');
  const data = {
    score: score,
    history: hist,
    exportDate: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `resultados-ciberseguranca-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// ===== ATUALIZAR ESTATÍSTICAS DOS RESULTADOS =====
function updateResultsStats() {
  const hist = JSON.parse(localStorage.getItem('sim_history') || '[]');
  
  // Filtrar por módulo
  const phishingAttempts = hist.filter(h => h.module === 'phishing');
  const senhaAttempts = hist.filter(h => h.module === 'senha');
  const tfaAttempts = hist.filter(h => h.module === 'tfa');
  
  // PHISHING - Acertos, Erros e Total
  const phishingCorrect = phishingAttempts.filter(h => h.ok).length;
  const phishingWrong = phishingAttempts.filter(h => !h.ok).length;
  const phishingTotal = phishingAttempts.length;

  document.getElementById('phishing-correct').textContent = phishingCorrect;
  document.getElementById('phishing-wrong').textContent = phishingWrong;
  document.getElementById('phishing-total').textContent = phishingTotal;
  
  // SENHA
  const senhaScores = senhaAttempts.map(h => h.score || 0);
  const senhaBest = senhaScores.length > 0 ? Math.max(...senhaScores) : 0;
  document.getElementById('senha-best').textContent = senhaBest;
  document.getElementById('senha-attempts').textContent = senhaAttempts.length;
  
  // 2FA
  const tfaSuccess = tfaAttempts.filter(h => h.ok).length;
  document.getElementById('tfa-success').textContent = tfaSuccess;
  document.getElementById('tfa-attempts-count').textContent = tfaAttempts.length;
  
  // RESUMO GERAL
  document.getElementById('total-score').textContent = score;
  
  // Taxa de conclusão
  const totalAttempts = hist.length;
  const totalSuccess = hist.filter(h => h.ok).length;
  const completionRate = totalAttempts > 0 ? Math.round((totalSuccess / totalAttempts) * 100) : 0;
  document.getElementById('completion-rate').textContent = `${completionRate}%`;
}

// ===== Histórico e Pontuação =====
function saveHistory(entry) {
  const hist = JSON.parse(localStorage.getItem('sim_history') || '[]');
  entry.ts = new Date().toISOString();
  hist.unshift(entry);
  localStorage.setItem('sim_history', JSON.stringify(hist.slice(0, 200)));
  localStorage.setItem('sim_score', score);
}

function renderHistory() {
  const hist = JSON.parse(localStorage.getItem('sim_history') || '[]');
  const container = document.getElementById('history-list');
  
  // ✅ CHAMA A ATUALIZAÇÃO DAS ESTATÍSTICAS
  updateResultsStats();
  
  if (!hist.length) {
    container.innerHTML = '<div class="text-muted p-3 text-center">Nenhuma atividade registrada ainda.</div>';
    return;
  }
  
  container.innerHTML = hist.map(h => `
    <div class="attempt-item p-3 border-bottom">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <strong class="text-uppercase">${h.module}</strong>
          <small class="text-muted ms-2">${new Date(h.ts).toLocaleString()}</small>
        </div>
        <span class="attempt-status badge bg-${h.ok ? 'success' : 'danger'}">
          ${h.ok ? 'CERTO' : 'ERRADO'}
        </span>
      </div>
      ${h.explain ? `<div class="text-muted small mt-1">${h.explain}</div>` : ''}
    </div>
  `).join('');
}

// Exportar resultados
document.getElementById('export-results').addEventListener('click', () => {
  const hist = JSON.parse(localStorage.getItem('sim_history') || '[]');
  const data = {
    score: score,
    history: hist,
    exportDate: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `resultados-ciberseguranca-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// Reset histórico - ✅ REMOVE A CHAMADA DUPLICADA
document.getElementById('reset-history').addEventListener('click', () => {
  if (confirm('Tem certeza que deseja zerar todo o histórico e pontuação?')) {
    localStorage.removeItem('sim_history');
    localStorage.removeItem('sim_score');
    score = 0;
    updateScore();
    renderHistory(); // Isso já chama updateResultsStats() internamente
    assinaturasSalvas.clear();
  }
});

function updateScore() {
  scoreEl.textContent = score;
  localStorage.setItem('sim_score', score);
}

// ===== Estatísticas da Home =====
function updateHomeStats() {
  const hist = JSON.parse(localStorage.getItem('sim_history') || '[]');
  
  // Tentativas totais
  document.getElementById('total-attempts').textContent = hist.length;
  
  // Taxa de acerto
  const successes = hist.filter(h => h.ok).length;
  const successRate = hist.length > 0 ? Math.round((successes / hist.length) * 100) : 0;
  document.getElementById('success-rate').textContent = `${successRate}%`;
  
  // Módulos concluídos
  const modules = new Set(hist.map(h => h.module));
  document.getElementById('modules-completed').textContent = modules.size;
}

// ===== Inicialização =====
document.addEventListener('DOMContentLoaded', function() {
  hideAllSections();
  sections.home.classList.remove('d-none');
  updateScore();
  updateHomeStats();
  renderHistory();
  
  // Atualizar stats quando voltar para home
  document.getElementById('btn-home').addEventListener('click', updateHomeStats);
});