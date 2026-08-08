// ===== UI text in Arabic and English =====
const STRINGS = {
  'ar-SA': {
    title: 'تحكم بالروبوت',
    subtitle: 'اضغط أو تكلم',
    ready: 'جاهز',
    sending: 'جاري الإرسال...',
    updated: (btn, letter) => 'تم تحديث الجدول: ' + btn + ' -> "' + letter + '"',
    error: (msg) => 'خطأ: ' + msg,
    connFail: 'فشل الاتصال بالسيرفر',
    notSupported: 'المتصفح لا يدعم التعرف على الصوت (استخدم Chrome)',
    recError: (err) => 'خطأ في التعرف الصوتي: ' + err,
    listening: 'جار الاستماع...',
    heard: (text) => 'سمعت: ' + text
  },
  'en-US': {
    title: 'Robot Control',
    subtitle: 'Tap or speak',
    ready: 'Ready',
    sending: 'Sending...',
    updated: (btn, letter) => 'Table updated: ' + btn + ' -> "' + letter + '"',
    error: (msg) => 'Error: ' + msg,
    connFail: 'Failed to connect to server',
    notSupported: 'Your browser doesn\'t support voice recognition (use Chrome)',
    recError: (err) => 'Voice recognition error: ' + err,
    listening: 'Listening...',
    heard: (text) => 'Heard: ' + text
  }
};

function t() {
  return STRINGS[currentLang];
}

function sendCommand(cmd) {
  document.getElementById('status').innerText = t().sending;

  fetch('update_command.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'command=' + encodeURIComponent(cmd)
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'success') {
      document.getElementById('status').innerText = t().updated(data.button, data.stored_as);
    } else {
      document.getElementById('status').innerText = t().error(data.message);
    }
  })
  .catch(err => {
    document.getElementById('status').innerText = t().connFail;
  });
}

// ===== Voice control =====
const commandKeywords = {
  forward:  ['forward', 'go', 'قدام', 'أمام', 'امام', 'للأمام', 'تقدم'],
  backward: ['backward', 'back', 'ورا', 'خلف', 'للخلف', 'تراجع'],
  left:     ['left', 'يسار', 'شمال', 'لليسار'],
  right:    ['right', 'يمين', 'لليمين'],
  stop:     ['stop', 'قف', 'توقف', 'وقف', 'استوب']
};

let recognition = null;
let isListening = false;
let currentLang = 'ar-SA';

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

function setLang(lang) {
  currentLang = lang;
  document.getElementById('langAr').classList.toggle('active', lang === 'ar-SA');
  document.getElementById('langEn').classList.toggle('active', lang === 'en-US');
  if (recognition) {
    recognition.lang = lang;
  }

  const isAr = lang === 'ar-SA';
  document.documentElement.setAttribute('lang', isAr ? 'ar' : 'en');
  document.documentElement.setAttribute('dir', isAr ? 'rtl' : 'ltr');
  document.getElementById('title').innerText = t().title;
  document.getElementById('subtitle').innerText = t().subtitle;

  if (!isListening) {
    document.getElementById('status').innerText = t().ready;
  }
  document.getElementById('heard').innerText = '';
}

function matchCommand(text) {
  const normalized = text.trim().toLowerCase();
  for (const cmd in commandKeywords) {
    for (const kw of commandKeywords[cmd]) {
      if (normalized.includes(kw)) {
        return cmd;
      }
    }
  }
  return null;
}

function initRecognition() {
  if (!SpeechRecognitionAPI) {
    document.getElementById('status').innerText = t().notSupported;
    return null;
  }

  const rec = new SpeechRecognitionAPI();
  rec.lang = currentLang;
  rec.continuous = false;
  rec.interimResults = true;

  rec.onresult = (event) => {
    const lastResult = event.results[event.results.length - 1];
    const heardText = lastResult[0].transcript;
    document.getElementById('heard').innerText = t().heard(heardText);

    const cmd = matchCommand(heardText);
    if (cmd) {
      sendCommand(cmd);
      rec.abort();
    }
  };

  rec.onerror = (event) => {
    if (event.error === 'aborted') return;
    document.getElementById('status').innerText = t().recError(event.error);
  };

  rec.onend = () => {
    if (isListening) {
      rec.start();
    } else {
      document.getElementById('micBtn').classList.remove('listening');
    }
  };

  return rec;
}

function toggleListening() {
  if (!isListening) {
    recognition = initRecognition();
    if (!recognition) return;
    isListening = true;
    recognition.start();
    document.getElementById('micBtn').classList.add('listening');
    document.getElementById('status').innerText = t().listening;
  } else {
    isListening = false;
    if (recognition) recognition.stop();
    document.getElementById('micBtn').classList.remove('listening');
    document.getElementById('status').innerText = t().ready;
  }
}