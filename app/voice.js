// Rheo v0.3.1 voice interface.
// OpenAI Realtime WebRTC is the preferred transcription transport.
// Browser speech recognition remains a visible fallback only.
(() => {
  const NativeRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const nativeRecognitionSupported = Boolean(NativeRecognition);
  const realtimeSupported = Boolean(window.RTCPeerConnection && navigator.mediaDevices?.getUserMedia);
  const synthesisSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  let active = null;
  let voiceGuideEnabled = false;
  let lastSpokenKey = '';

  const micIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/></svg>`;
  const volumeIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>`;
  const stopIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>`;

  function addStyles() {
    const style = document.createElement('style');
    style.id = 'rheoVoiceStyles';
    style.textContent = `
      .voiceControls{display:flex;align-items:center;gap:7px;margin-left:auto;margin-right:8px}
      .voiceGuideButton{display:inline-flex;align-items:center;gap:7px;padding:7px 9px;font-size:11px;white-space:nowrap}
      .voiceGuideButton.active{border-color:color-mix(in srgb,var(--brand) 50%,var(--line));background:color-mix(in srgb,var(--brand) 10%,var(--secondary));color:var(--brand)}
      .voiceGuideButton svg,.voiceIconButton svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}
      .voiceStatus{max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:500 10px var(--font-mono);color:var(--muted)}
      .voiceStatus[data-tone="listening"]{color:var(--brand)}.voiceStatus[data-tone="error"]{color:var(--ctos-rose)}
      .voiceFieldTools{display:flex;justify-content:flex-end;gap:4px;margin:-2px 0 5px;min-height:28px}
      .voiceIconButton{width:29px;height:29px;padding:0;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:var(--radius-button);background:var(--secondary);color:var(--muted);box-shadow:none}
      .voiceIconButton:hover:not(:disabled){color:var(--ink);border-color:color-mix(in srgb,var(--brand) 35%,var(--line));background:color-mix(in srgb,var(--brand) 6%,var(--secondary))}
      .voiceIconButton.listening{color:#fff;background:var(--brand);border-color:var(--brand);animation:voicePulse 1.25s ease-in-out infinite}
      .voiceListeningField{border-color:var(--brand)!important;box-shadow:0 0 0 2px rgba(102,126,234,.18)!important}
      .voicePrivacyNote{margin-top:10px!important}
      .hero .voiceIconButton{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.26);color:#fff}.hero .voiceIconButton:hover:not(:disabled){background:rgba(255,255,255,.20);border-color:rgba(255,255,255,.44);color:#fff}.hero .voiceIconButton.listening{background:#fff;color:#5868c9;border-color:#fff}
      @keyframes voicePulse{0%,100%{box-shadow:0 0 0 0 rgba(102,126,234,.22)}50%{box-shadow:0 0 0 5px rgba(102,126,234,0)}}
      @media(max-width:820px){.voiceStatus{display:none}.voiceControls{margin-right:5px}.voiceGuideButton span{display:none}.voiceGuideButton{width:34px;height:34px;padding:0;justify-content:center}.topbar #savedBtn{font-size:11px;padding:7px 9px}}
      @media(prefers-reduced-motion:reduce){.voiceIconButton.listening{animation:none}}
    `;
    document.head.appendChild(style);
  }

  function log(type, detail = {}) {
    try {
      if (typeof logEvent === 'function') logEvent(type, detail);
    } catch {}
  }

  function setStatus(message, tone = 'idle') {
    const el = document.getElementById('voiceStatus');
    if (!el) return;
    el.textContent = message;
    el.dataset.tone = tone;
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
    if (item) {
      const labels = [...item.querySelectorAll('label')];
      const preceding = labels.filter(l => l.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).at(-1);
      if (preceding) return preceding.textContent.trim();
    }
    return field.getAttribute('aria-label') || field.placeholder || 'Your answer';
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
      return [home.querySelector('h1')?.textContent.trim(), home.querySelector('.lead')?.textContent.trim(), home.querySelector('label')?.textContent.trim()].filter(Boolean).join('. ');
    }
    const panel = [...document.querySelectorAll('[data-step-panel]')].find(p => !p.classList.contains('hidden'));
    if (!panel) return '';
    return [panel.querySelector('h2')?.textContent.trim(), panel.querySelector(':scope > p, .card > p')?.textContent.trim()].filter(Boolean).join('. ');
  }

  function setButtonListening(button, listening) {
    if (!button) return;
    button.classList.toggle('listening', listening);
    button.setAttribute('aria-pressed', String(listening));
    button.innerHTML = listening ? stopIcon : micIcon;
    button.title = listening ? 'Stop listening' : 'Answer by voice';
  }

  function renderRealtimeField(session) {
    const live = [...session.itemDeltas.values()].join(' ').trim();
    const committed = session.committed.join(' ').trim();
    const spoken = [committed, live].filter(Boolean).join(' ').trim();
    session.field.value = [session.original, spoken].filter(Boolean).join(session.original && spoken ? ' ' : '');
    session.field.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function closeRealtime(session, reason = 'closed') {
    if (!session || session.closed) return;
    session.closed = true;
    clearTimeout(session.closeTimer);
    try { session.stream?.getTracks().forEach(t => t.stop()); } catch {}
    try { session.dc?.close(); } catch {}
    try { session.pc?.close(); } catch {}
    session.field?.classList.remove('voiceListeningField');
    setButtonListening(session.button, false);
    if (active === session) active = null;
    log('voice_transcription_ended', {
      field: session.field?.id || session.field?.className || 'unnamed',
      characters: session.field?.value?.length || 0,
      transport: 'openai_realtime_webrtc',
      reason
    });
  }

  function finishRealtime(session, reason = 'manual') {
    if (!session || session.closed || session.finishing) return;
    session.finishing = true;
    try { session.stream?.getTracks().forEach(t => t.stop()); } catch {}
    if (session.dc?.readyState === 'open') {
      try { session.dc.send(JSON.stringify({ type: 'input_audio_buffer.commit' })); } catch {}
    }
    setStatus('Finishing the transcription…', 'listening');
    session.closeTimer = setTimeout(() => {
      setStatus('Voice input finished. You can edit the transcription before continuing.', 'idle');
      closeRealtime(session, reason);
    }, 1800);
  }

  async function waitForIce(pc, timeoutMs = 1800) {
    if (pc.iceGatheringState === 'complete') return;
    await new Promise(resolve => {
      const timer = setTimeout(done, timeoutMs);
      function done() {
        clearTimeout(timer);
        pc.removeEventListener('icegatheringstatechange', onChange);
        resolve();
      }
      function onChange() { if (pc.iceGatheringState === 'complete') done(); }
      pc.addEventListener('icegatheringstatechange', onChange);
    });
  }

  function handleRealtimeEvent(session, event) {
    const type = event?.type || '';
    if (type === 'conversation.item.input_audio_transcription.delta') {
      const key = event.item_id || 'current';
      session.itemDeltas.set(key, `${session.itemDeltas.get(key) || ''}${event.delta || ''}`);
      renderRealtimeField(session);
      setStatus(`Listening… ${event.delta || ''}`.trim(), 'listening');
      return;
    }
    if (type === 'conversation.item.input_audio_transcription.completed') {
      const key = event.item_id || 'current';
      const finalText = String(event.transcript || session.itemDeltas.get(key) || '').trim();
      session.itemDeltas.delete(key);
      if (finalText) session.committed.push(finalText);
      renderRealtimeField(session);
      log('voice_transcription_segment_completed', { characters: finalText.length, transport:'openai_realtime_webrtc' });
      if (session.finishing) {
        clearTimeout(session.closeTimer);
        session.closeTimer = setTimeout(() => {
          setStatus('Voice input finished. You can edit the transcription before continuing.', 'idle');
          closeRealtime(session, 'completed');
        }, 300);
      } else {
        setStatus('Listening…', 'listening');
      }
      return;
    }
    if (type === 'input_audio_buffer.speech_started') setStatus('Listening…', 'listening');
    if (type === 'input_audio_buffer.speech_stopped') setStatus('Transcribing…', 'listening');
    if (type === 'error') {
      const message = event.error?.message || 'OpenAI Realtime reported an error.';
      setStatus(message, 'error');
      log('voice_transcription_error', { code:event.error?.code || 'realtime_event_error', transport:'openai_realtime_webrtc' });
    }
  }

  async function startRealtime(field, button) {
    if (!realtimeSupported) throw new Error('WebRTC microphone input is not supported in this browser.');
    if (active) {
      if (active.field === field) {
        if (active.kind === 'realtime') finishRealtime(active, 'manual');
        else stopNative(active, 'manual');
        return;
      }
      if (active.kind === 'realtime') closeRealtime(active, 'switch');
      else stopNative(active, 'switch');
    }
    if (synthesisSupported) speechSynthesis.cancel();

    setStatus('Connecting secure voice input…', 'listening');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation:true, noiseSuppression:true, autoGainControl:true }, video:false
    });
    const pc = new RTCPeerConnection();
    const dc = pc.createDataChannel('oai-events');
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    const session = {
      kind:'realtime', field, button, stream, pc, dc,
      original:field.value.trim(), committed:[], itemDeltas:new Map(),
      finishing:false, closed:false, closeTimer:null
    };
    active = session;
    setButtonListening(button, true);
    field.classList.add('voiceListeningField');
    field.focus();

    dc.onopen = () => {
      setStatus('Listening… your words will appear here.', 'listening');
      log('voice_transcription_started', { field:field.id || field.className || 'unnamed', transport:'openai_realtime_webrtc' });
    };
    dc.onmessage = message => {
      try { handleRealtimeEvent(session, JSON.parse(message.data)); } catch {}
    };
    dc.onerror = () => setStatus('The realtime voice connection hit an error.', 'error');
    pc.onconnectionstatechange = () => {
      if (['failed','disconnected'].includes(pc.connectionState) && !session.finishing) {
        setStatus('The realtime voice connection was interrupted.', 'error');
        closeRealtime(session, pc.connectionState);
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIce(pc);
    const sdp = pc.localDescription?.sdp;
    const response = await fetch('/api/realtime/call', {
      method:'POST',
      headers:{ 'content-type':'application/json' },
      body:JSON.stringify({ sdp })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not create the OpenAI Realtime voice connection.');
    await pc.setRemoteDescription({ type:'answer', sdp:result.sdp });
    log('voice_realtime_connected', {
      transcriptionModel:result.transcriptionModel || 'unknown',
      realtimeModel:result.realtimeModel || 'unknown'
    });
  }

  function stopNative(session, reason = 'manual') {
    if (!session) return;
    try { session.recognition.stop(); } catch {}
    session.field.classList.remove('voiceListeningField');
    setButtonListening(session.button, false);
    if (active === session) active = null;
    if (reason === 'manual') setStatus('Voice input finished. You can edit the transcription before continuing.', 'idle');
  }

  function startNative(field, button, fallbackReason = '') {
    if (!nativeRecognitionSupported) throw new Error(fallbackReason || 'No speech-recognition fallback is available in this browser.');
    const recognition = new NativeRecognition();
    recognition.lang = 'en-GB';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    const session = { kind:'native', recognition, field, button, original:field.value.trim(), finalText:'' };
    active = session;
    setButtonListening(button, true);
    field.classList.add('voiceListeningField');
    recognition.onstart = () => {
      setStatus('OpenAI Realtime was unavailable; using this browser’s speech service.', 'listening');
      log('voice_transcription_started', { field:field.id || field.className || 'unnamed', transport:'browser_fallback' });
    };
    recognition.onresult = event => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) session.finalText += `${text.trim()} `;
        else interim += text;
      }
      const spoken = `${session.finalText}${interim}`.trim();
      field.value = [session.original, spoken].filter(Boolean).join(session.original && spoken ? ' ' : '');
      field.dispatchEvent(new Event('input', { bubbles:true }));
    };
    recognition.onerror = event => {
      setStatus(`Voice input stopped: ${event.error || 'unknown error'}.`, 'error');
      log('voice_transcription_error', { code:event.error || 'unknown', transport:'browser_fallback' });
    };
    recognition.onend = () => stopNative(session, 'ended');
    recognition.start();
  }

  async function startListening(field, button) {
    if (active?.field === field) {
      if (active.kind === 'realtime') finishRealtime(active, 'manual');
      else stopNative(active, 'manual');
      return;
    }
    try {
      await startRealtime(field, button);
    } catch (err) {
      if (active?.kind === 'realtime') closeRealtime(active, 'connect_failed');
      log('voice_transcription_error', { code:'realtime_connect_failed', transport:'openai_realtime_webrtc' });
      if (nativeRecognitionSupported) {
        try { startNative(field, button, err.message); return; } catch {}
      }
      setStatus(`Could not start voice input: ${err.message}`, 'error');
    }
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
      b.disabled = !realtimeSupported && !nativeRecognitionSupported;
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
      if (!voiceGuideEnabled || !synthesisSupported || active?.field === field) return;
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
      <span id="voiceStatus" class="voiceStatus" role="status" aria-live="polite">${realtimeSupported ? 'OpenAI voice input ready' : nativeRecognitionSupported ? 'Browser voice fallback ready' : 'Voice input unavailable'}</span>`;
    const saved = document.getElementById('savedBtn');
    if (saved) topbar.insertBefore(controls, saved); else topbar.appendChild(controls);
    const btn = document.getElementById('voiceGuideBtn');
    btn.disabled = !synthesisSupported;
    btn.onclick = () => {
      voiceGuideEnabled = !voiceGuideEnabled;
      btn.setAttribute('aria-pressed', String(voiceGuideEnabled));
      btn.classList.toggle('active', voiceGuideEnabled);
      btn.querySelector('span').textContent = voiceGuideEnabled ? 'Voice guide on' : 'Voice guide';
      if (voiceGuideEnabled) {
        speak(visibleContextSpeech(), `context:${typeof step === 'number' ? step : 'home'}`);
        setStatus('Voice guide is on. Focus a question to hear it aloud.', 'idle');
      } else {
        if (synthesisSupported) speechSynthesis.cancel();
        setStatus(realtimeSupported ? 'OpenAI voice input ready' : nativeRecognitionSupported ? 'Browser voice fallback ready' : 'Voice input unavailable', 'idle');
      }
      log('voice_guide_toggled', { enabled:voiceGuideEnabled });
    };
  }

  function addPrivacyNote() {
    const home = document.getElementById('homeView');
    if (!home || document.getElementById('voicePrivacyNote')) return;
    const note = document.createElement('details');
    note.className = 'researchDetails voicePrivacyNote';
    note.id = 'voicePrivacyNote';
    note.innerHTML = `<summary>About voice input</summary><p class="muted">Voice input is optional. When OpenAI Realtime is available, your microphone audio is sent over an encrypted WebRTC connection for live transcription. Rheo’s permanent API key stays on the server and is not sent to your browser. The case record stores the resulting text, not an audio recording. If Realtime is unavailable, some browsers can fall back to their own speech-recognition service and Rheo will say so.</p>`;
    home.appendChild(note);
  }

  function watchDynamicFields() {
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) for (const node of m.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches?.('textarea,input[type="text"],input:not([type])')) enhanceField(node);
        enhanceAll(node);
      }
    });
    observer.observe(document.body, { childList:true, subtree:true });
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
    panels.forEach(p => observer.observe(p, { attributes:true, attributeFilter:['class'] }));
  }

  addStyles();
  makeGlobalControls();
  addPrivacyNote();
  enhanceAll();
  watchDynamicFields();
  watchSteps();
  window.addEventListener('pagehide', () => {
    if (active?.kind === 'realtime') closeRealtime(active, 'pagehide');
    else if (active) stopNative(active, 'pagehide');
  });
})();