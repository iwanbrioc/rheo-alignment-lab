// Rheo v0.3.1 voice interface.
// Progressive enhancement only: the research case representation is unchanged.
(() => {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognitionSupported = Boolean(Recognition);
  const synthesisSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  let activeRecognition = null;
  let activeField = null;
  let activeButton = null;
  let voiceGuideEnabled = false;
  let lastSpokenKey = '';

  const micIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/></svg>`;
  const volumeIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>`;
  const stopIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>`;

  function log(type, detail = {}) {
    if (typeof window.logEvent === 'function') window.logEvent(type, detail);
    else if (typeof logEvent === 'function') logEvent(type, detail);
  }

  function fieldLabel(field) {
    if (!field) return '';
    if (field.id) {
      const explicit = document.querySelector(`label[for="${CSS.escape(field.id)}"]`);
      if (explicit) return explicit.textContent.trim();
    }
    const parent = field.parentElement;
    const local = parent?.querySelector(':scope > label');
    if (local) return local.textContent.trim();
    const item = field.closest('.evidenceItem,.move,.horizon,.card');
    const preceding = [...(item?.querySelectorAll('label') || [])].find(l => l.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING);
    return preceding?.textContent.trim() || field.getAttribute('aria-label') || field.placeholder || 'Your answer';
  }

  function spokenQuestion(field) {
    const horizon = field.closest('.horizon');
    if (horizon && field.id?.endsWith('Notes')) {
      const title = horizon.querySelector('h3')?.textContent.trim() || '';
      const qs = [...horizon.querySelectorAll('.questions li')].map(li => li.textContent.trim()).join(' ');
      return [title, qs, fieldLabel(field)].filter(Boolean).join('. ');
    }
    const label = fieldLabel(field);
    const placeholder = field.placeholder?.trim();
    if (/^Statement \d+$/i.test(label) && placeholder) return `${label}. ${placeholder}`;
    return label || placeholder || 'Your answer';
  }

  function chooseVoice() {
    const voices = speechSynthesis.getVoices();
    return voices.find(v => /^en-GB$/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang)) || voices[0] || null;
  }

  function speak(text, key = text) {
    if (!synthesisSupported || !text) return;
    if (lastSpokenKey === key && speechSynthesis.speaking) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-GB';
    u.rate = 0.96;
    u.pitch = 1;
    const voice = chooseVoice();
    if (voice) u.voice = voice;
    lastSpokenKey = key;
    speechSynthesis.speak(u);
    log('voice_question_spoken', { key: String(key).slice(0, 120) });
  }

  function visibleContextSpeech() {
    const home = document.getElementById('homeView');
    if (home && !home.classList.contains('hidden')) {
      const h = home.querySelector('h1')?.textContent.trim();
      const lead = home.querySelector('.lead')?.textContent.trim();
      const first = home.querySelector('label')?.textContent.trim();
      return [h, lead, first].filter(Boolean).join('. ');
    }
    const panel = [...document.querySelectorAll('[data-step-panel]')].find(p => !p.classList.contains('hidden'));
    if (!panel) return '';
    const heading = panel.querySelector('h2')?.textContent.trim();
    const intro = panel.querySelector(':scope > p, .card > p')?.textContent.trim();
    return [heading, intro].filter(Boolean).join('. ');
  }

  function setStatus(message, tone = 'idle') {
    const el = document.getElementById('voiceStatus');
    if (!el) return;
    el.textContent = message;
    el.dataset.tone = tone;
  }

  function stopListening(reason = 'manual') {
    if (activeRecognition) {
      try { activeRecognition.stop(); } catch {}
    }
    if (activeButton) {
      activeButton.classList.remove('listening');
      activeButton.setAttribute('aria-pressed', 'false');
      activeButton.innerHTML = micIcon;
      activeButton.title = 'Answer by voice';
    }
    if (activeField) activeField.classList.remove('voiceListeningField');
    if (reason === 'manual') setStatus('Voice input stopped. You can edit the text normally.', 'idle');
    activeRecognition = null;
    activeField = null;
    activeButton = null;
  }

  function startListening(field, button) {
    if (!recognitionSupported) {
      setStatus('Live speech-to-text is not available in this browser.', 'error');
      return;
    }
    if (activeField === field && activeRecognition) {
      stopListening('manual');
      return;
    }
    stopListening('switch');
    if (synthesisSupported) speechSynthesis.cancel();

    const recognition = new Recognition();
    recognition.lang = 'en-GB';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const original = field.value.trim();
    let finalText = '';
    let manuallyStopped = false;

    activeRecognition = recognition;
    activeField = field;
    activeButton = button;
    button.classList.add('listening');
    button.setAttribute('aria-pressed', 'true');
    button.innerHTML = stopIcon;
    button.title = 'Stop listening';
    field.classList.add('voiceListeningField');
    field.focus();

    recognition.onstart = () => {
      setStatus('Listening… your words will appear as you speak.', 'listening');
      log('voice_transcription_started', { field: field.id || field.className || 'unnamed' });
    };

    recognition.onresult = event => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) finalText += `${text.trim()} `;
        else interim += text;
      }
      const spoken = `${finalText}${interim}`.trim();
      field.value = [original, spoken].filter(Boolean).join(original && spoken ? ' ' : '');
      field.dispatchEvent(new Event('input', { bubbles: true }));
      setStatus(interim ? `Listening… ${interim.trim()}` : 'Listening…', 'listening');
    };

    recognition.onerror = event => {
      const map = {
        'not-allowed':'Microphone permission is blocked. Allow microphone access and try again.',
        'service-not-allowed':'Speech recognition is not available on this device or browser.',
        'audio-capture':'No microphone was found.',
        'no-speech':'I did not hear any speech. Tap the microphone and try again.',
        'network':'The browser speech service could not be reached.'
      };
      setStatus(map[event.error] || `Voice input stopped: ${event.error}.`, 'error');
      log('voice_transcription_error', { code: event.error || 'unknown' });
    };

    recognition.onend = () => {
      const fieldName = field.id || field.className || 'unnamed';
      if (activeRecognition === recognition) {
        activeRecognition = null;
        activeField = null;
        if (activeButton === button) activeButton = null;
        button.classList.remove('listening');
        button.setAttribute('aria-pressed', 'false');
        button.innerHTML = micIcon;
        button.title = 'Answer by voice';
        field.classList.remove('voiceListeningField');
        if (!manuallyStopped) setStatus('Voice input finished. You can edit the transcription before continuing.', 'idle');
        log('voice_transcription_ended', { field: fieldName, characters: field.value.length });
      }
    };

    try {
      recognition.start();
    } catch (err) {
      setStatus(`Could not start voice input: ${err.message}`, 'error');
      stopListening('error');
    }

    button.addEventListener('click', () => { manuallyStopped = true; }, { once: true });
  }

  function makeIconButton(kind, field) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `voiceIconButton ${kind === 'mic' ? 'voiceMic' : 'voiceSpeak'}`;
    if (kind === 'mic') {
      b.innerHTML = micIcon;
      b.title = 'Answer by voice';
      b.setAttribute('aria-label', `Answer “${fieldLabel(field)}” by voice`);
      b.setAttribute('aria-pressed', 'false');
      b.disabled = !recognitionSupported;
      b.onclick = () => startListening(field, b);
    } else {
      b.innerHTML = volumeIcon;
      b.title = 'Read this question aloud';
      b.setAttribute('aria-label', `Read “${fieldLabel(field)}” aloud`);
      b.disabled = !synthesisSupported;
      b.onclick = () => speak(spokenQuestion(field), `field:${field.id || field.className}:${spokenQuestion(field)}`);
    }
    return b;
  }

  function enhanceField(field) {
    if (!field || field.dataset.voiceEnhanced === 'true') return;
    if (field.type && ['checkbox','radio','button','submit','file','hidden'].includes(field.type)) return;
    if (field.closest('.voiceControls')) return;
    field.dataset.voiceEnhanced = 'true';

    const tools = document.createElement('div');
    tools.className = 'voiceFieldTools';
    tools.append(makeIconButton('speak', field), makeIconButton('mic', field));
    field.insertAdjacentElement('beforebegin', tools);

    field.addEventListener('focus', () => {
      if (!voiceGuideEnabled || !synthesisSupported || activeField === field) return;
      speak(spokenQuestion(field), `focus:${field.id || field.className}:${spokenQuestion(field)}`);
    });
  }

  function enhanceAll(root = document) {
    root.querySelectorAll('textarea,input[type="text"],input:not([type])').forEach(enhanceField);
  }

  function makeGlobalControls() {
    const topbar = document.querySelector('.topbar');
    if (!topbar || document.getElementById('voiceGuideBtn')) return;
    const controls = document.createElement('div');
    controls.className = 'voiceControls';
    controls.innerHTML = `
      <button type="button" class="ghost voiceGuideButton" id="voiceGuideBtn" aria-pressed="false">${volumeIcon}<span>Voice guide</span></button>
      <span id="voiceStatus" class="voiceStatus" role="status" aria-live="polite">${recognitionSupported ? 'Voice input ready' : 'Voice input unavailable in this browser'}</span>`;
    const saved = document.getElementById('savedBtn');
    if (saved) topbar.insertBefore(controls, saved);
    else topbar.appendChild(controls);

    const btn = document.getElementById('voiceGuideBtn');
    btn.disabled = !synthesisSupported;
    btn.onclick = () => {
      voiceGuideEnabled = !voiceGuideEnabled;
      btn.setAttribute('aria-pressed', String(voiceGuideEnabled));
      btn.classList.toggle('active', voiceGuideEnabled);
      btn.querySelector('span').textContent = voiceGuideEnabled ? 'Voice guide on' : 'Voice guide';
      if (voiceGuideEnabled) {
        speak(visibleContextSpeech(), `context:${step || 'home'}`);
        setStatus('Voice guide is on. Focus a question to hear it aloud.', 'idle');
      } else {
        if (synthesisSupported) speechSynthesis.cancel();
        setStatus(recognitionSupported ? 'Voice input ready' : 'Voice input unavailable in this browser', 'idle');
      }
      log('voice_guide_toggled', { enabled: voiceGuideEnabled });
    };
  }

  function addPrivacyNote() {
    const home = document.getElementById('homeView');
    if (!home || document.getElementById('voicePrivacyNote')) return;
    const note = document.createElement('details');
    note.className = 'researchDetails voicePrivacyNote';
    note.id = 'voicePrivacyNote';
    note.innerHTML = `<summary>About voice input</summary><p class="muted">Voice input is optional. Live transcription uses the speech-recognition service provided by your browser or device, so audio handling and availability can vary by browser. Rheo stores the resulting text in the same way as text you type; this feature does not add audio recordings to the case record.</p>`;
    home.appendChild(note);
  }

  function watchDynamicFields() {
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches?.('textarea,input[type="text"],input:not([type])')) enhanceField(node);
          enhanceAll(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function watchSteps() {
    const panels = document.querySelectorAll('[data-step-panel]');
    const observer = new MutationObserver(() => {
      if (!voiceGuideEnabled || !synthesisSupported) return;
      const text = visibleContextSpeech();
      const visible = [...panels].find(p => !p.classList.contains('hidden'));
      const key = `step:${visible?.dataset.stepPanel || 'home'}:${text}`;
      if (text) speak(text, key);
    });
    panels.forEach(p => observer.observe(p, { attributes: true, attributeFilter: ['class'] }));
  }

  makeGlobalControls();
  addPrivacyNote();
  enhanceAll();
  watchDynamicFields();
  watchSteps();
  window.addEventListener('pagehide', () => stopListening('exit'));
})();
