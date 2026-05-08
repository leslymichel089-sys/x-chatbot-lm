window.addEventListener("DOMContentLoaded", function () {
  const chat = document.getElementById("chat");
  const form = document.getElementById("form");
  const input = document.getElementById("messageInput");
  const clearBtn = document.getElementById("clearBtn");
  const themeBtn = document.getElementById("themeBtn");
  const statusLine = document.getElementById("statusLine");
  const presenceDot = document.getElementById("presenceDot");
  const netDisplay = document.getElementById("netDisplay");
  const scrollBottomBtn = document.getElementById("scrollBottomBtn");
  const attachBtn = document.getElementById("attachBtn");
  const mediaInput = document.getElementById("mediaInput");
  const menuBtn = document.getElementById("menuBtn");
  const sidePanel = document.getElementById("sidePanel");
  const closePanelBtn = document.getElementById("closePanelBtn");
  const shareBtn = document.getElementById("shareBtn");
  const copyLinkBtn = document.getElementById("copyLinkBtn");
  const copyAllBtn = document.getElementById("copyAllBtn");
  const exportBtn = document.getElementById("exportBtn");
  const adminBtn = document.getElementById("adminBtn");
  const timeDisplay = document.getElementById("timeDisplay");
  const dateDisplay = document.getElementById("dateDisplay");
  const weatherDisplay = document.getElementById("weatherDisplay");

  if (
    !chat ||
    !form ||
    !input ||
    !clearBtn ||
    !themeBtn ||
    !statusLine ||
    !presenceDot ||
    !netDisplay ||
    !scrollBottomBtn ||
    !attachBtn ||
    !mediaInput ||
    !menuBtn ||
    !sidePanel ||
    !closePanelBtn ||
    !shareBtn ||
    !copyLinkBtn ||
    !copyAllBtn ||
    !exportBtn ||
    !adminBtn ||
    !timeDisplay ||
    !dateDisplay ||
    !weatherDisplay
  ) {
    console.error("Éléments HTML introuvables");
    return;
  }

  const STORAGE_KEY = "golyat_chat_history";
  const THEME_KEY = "golyat_theme";
  const ADMIN_CODE_KEY = "golyat_admin_code";
  const APP_NAME_KEY = "golyat_app_name";
  const APP_IMAGE_KEY = "golyat_app_image";
  const APP_COLOR_KEY = "golyat_app_color";
  const APP_ACTIVE_KEY = "golyat_app_active";
  const INTERNET_KEY = "golyat_internet_enabled";
  const MAX_MESSAGES = 30;

  let messages = loadMessages();
  let typingEl = null;

  applySavedTheme();
  applySavedAppSettings();
  updateNetState();
  updatePresenceFromNet();
  updateDateTime();
  setInterval(updateDateTime, 1000);

  if (messages.length === 0) {
    appendMessage("Le chatbot X est prêt.", "bot");
  } else {
    renderMessages();
  }

  window.addEventListener("online", function () {
    updateNetState();
    updatePresenceFromNet();
    loadWeather();
  });

  window.addEventListener("offline", function () {
    updateNetState();
    updatePresenceFromNet();
    weatherDisplay.textContent = "Météo : hors ligne";
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    sendMessage();
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  chat.addEventListener("scroll", function () {
    const nearBottom = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 120;
    scrollBottomBtn.style.display = nearBottom ? "none" : "flex";
  });

  scrollBottomBtn.addEventListener("click", function () {
    chat.scrollTop = chat.scrollHeight;
  });

  attachBtn.addEventListener("click", function () {
    mediaInput.click();
  });

  mediaInput.addEventListener("change", function () {
    const file = mediaInput.files && mediaInput.files[0];
    if (!file) return;

    const fileURL = URL.createObjectURL(file);
    const type = file.type || "";
    const name = file.name || "fichier";

    if (type.startsWith("image/")) {
      addMediaMessage("image", fileURL, name);
    } else if (type.startsWith("audio/")) {
      addMediaMessage("audio", fileURL, name);
    } else if (type.startsWith("video/")) {
      addMediaMessage("video", fileURL, name);
    } else {
      addFileMessage(name, fileURL);
    }

    mediaInput.value = "";
  });

  clearBtn.addEventListener("click", function () {
    if (!confirm("Effacer toute la conversation ?")) return;
    messages = [];
    localStorage.removeItem(STORAGE_KEY);
    chat.innerHTML = "";
    appendMessage("Conversation effacée.", "bot");
    saveMessages();
  });

  themeBtn.addEventListener("click", function () {
    const isLight = document.body.classList.toggle("light");
    localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
    themeBtn.textContent = isLight ? "Mode sombre" : "Mode clair";
  });

  menuBtn.addEventListener("click", function () {
    sidePanel.classList.add("open");
  });

  closePanelBtn.addEventListener("click", function () {
    sidePanel.classList.remove("open");
  });

  document.addEventListener("click", function (e) {
    const clickedInsidePanel = sidePanel.contains(e.target);
    const clickedMenuButton = menuBtn.contains(e.target);

    if (!clickedInsidePanel && !clickedMenuButton) {
      sidePanel.classList.remove("open");
    }
  });

  shareBtn.addEventListener("click", function () {
    if (navigator.share) {
      navigator.share({
        title: getAppName(),
        text: "Découvre " + getAppName(),
        url: window.location.href
      }).catch(function () {});
    } else {
      alert("Le partage n’est pas disponible sur ce navigateur.");
    }
  });

  copyLinkBtn.addEventListener("click", async function () {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("Lien copié !");
    } catch {
      alert("Impossible de copier le lien.");
    }
  });

  copyAllBtn.addEventListener("click", async function () {
    try {
      const allText = messages.map(function (m) {
        return (m.role === "user" ? "Moi" : "X") + " : " + m.text;
      }).join("\n");
      await navigator.clipboard.writeText(allText);
      alert("Tout le chat a été copié !");
    } catch {
      alert("Impossible de copier le chat.");
    }
  });

  exportBtn.addEventListener("click", function () {
    const data = {
      messages: messages,
      theme: localStorage.getItem(THEME_KEY),
      appName: localStorage.getItem(APP_NAME_KEY),
      appImage: localStorage.getItem(APP_IMAGE_KEY),
      appColor: localStorage.getItem(APP_COLOR_KEY),
      appActive: localStorage.getItem(APP_ACTIVE_KEY),
      internetEnabled: localStorage.getItem(INTERNET_KEY)
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "x-export.json";
    a.click();

    URL.revokeObjectURL(url);
  });

  adminBtn.addEventListener("click", function () {
    openAdminMenu();
  });

  function openAdminMenu() {
    let storedCode = localStorage.getItem(ADMIN_CODE_KEY);

    if (!storedCode) {
      const newCode = prompt("Premier lancement : crée ton code secret admin.");
      if (!newCode || newCode.trim() === "") {
        alert("Aucun code créé.");
        return;
      }

      localStorage.setItem(ADMIN_CODE_KEY, newCode.trim());
      alert("Code secret enregistré.");
      return;
    }

    const enteredCode = prompt("Entrez le code secret admin :");
    if (enteredCode !== storedCode) {
      alert("Code incorrect.");
      return;
    }

    showAdminScreen();
  }

  function showAdminScreen() {
    const oldContent = sidePanel.querySelector(".side-panel-content");
    if (!oldContent) return;

    oldContent.innerHTML = `
      <button id="adminBackBtn" class="btn secondary" type="button">Retour</button>
      <button id="renameAppBtn" class="btn secondary" type="button">Changer le nom de l’app</button>
      <button id="changeImageBtn" class="btn secondary" type="button">Changer l’image de l’app</button>
      <button id="changeColorBtn" class="btn secondary" type="button">Changer les couleurs</button>
      <button id="toggleAppBtn" class="btn secondary" type="button">Activer / désactiver</button>
      <button id="internetToggleBtn" class="btn secondary" type="button">Internet on / off</button>
      <button id="resetAppBtn" class="btn secondary" type="button">Réinitialiser</button>
    `;

    const adminBackBtn = document.getElementById("adminBackBtn");
    const renameAppBtn = document.getElementById("renameAppBtn");
    const changeImageBtn = document.getElementById("changeImageBtn");
    const changeColorBtn = document.getElementById("changeColorBtn");
    const toggleAppBtn = document.getElementById("toggleAppBtn");
    const internetToggleBtn = document.getElementById("internetToggleBtn");
    const resetAppBtn = document.getElementById("resetAppBtn");

    if (adminBackBtn) {
      adminBackBtn.addEventListener("click", function () {
        location.reload();
      });
    }

    if (renameAppBtn) {
      renameAppBtn.addEventListener("click", function () {
        const newName = prompt("Nouveau nom de l’app :", getAppName());
        if (!newName || newName.trim() === "") return;
        localStorage.setItem(APP_NAME_KEY, newName.trim());
        applySavedAppSettings();
        alert("Nom modifié.");
      });
    }

    if (changeImageBtn) {
      changeImageBtn.addEventListener("click", function () {
        const newImage = prompt("Colle l’URL de la nouvelle image de l’app :", localStorage.getItem(APP_IMAGE_KEY) || "");
        if (newImage === null) return;
        localStorage.setItem(APP_IMAGE_KEY, newImage.trim());
        applySavedAppSettings();
        alert("Image modifiée.");
      });
    }

    if (changeColorBtn) {
      changeColorBtn.addEventListener("click", function () {
        const newColor = prompt("Couleur principale (ex: #2563eb) :", localStorage.getItem(APP_COLOR_KEY) || "#2563eb");
        if (!newColor || newColor.trim() === "") return;
        localStorage.setItem(APP_COLOR_KEY, newColor.trim());
        applySavedAppSettings();
        alert("Couleur modifiée.");
      });
    }

    if (toggleAppBtn) {
      toggleAppBtn.addEventListener("click", function () {
        const current = localStorage.getItem(APP_ACTIVE_KEY);
        const next = current === "off" ? "on" : "off";
        localStorage.setItem(APP_ACTIVE_KEY, next);
        applySavedAppSettings();
        alert("Application : " + next);
      });
    }

    if (internetToggleBtn) {
      internetToggleBtn.addEventListener("click", function () {
        const current = localStorage.getItem(INTERNET_KEY);
        const next = current === "off" ? "on" : "off";
        localStorage.setItem(INTERNET_KEY, next);
        updateNetState();
        updatePresenceFromNet();
        loadWeather();
        alert("Internet : " + next);
      });
    }

    if (resetAppBtn) {
      resetAppBtn.addEventListener("click", function () {
        if (!confirm("Réinitialiser toutes les préférences ?")) return;

        localStorage.removeItem(APP_NAME_KEY);
        localStorage.removeItem(APP_IMAGE_KEY);
        localStorage.removeItem(APP_COLOR_KEY);
        localStorage.removeItem(APP_ACTIVE_KEY);
        localStorage.removeItem(INTERNET_KEY);
        localStorage.removeItem(THEME_KEY);
        location.reload();
      });
    }
  }

  function applySavedAppSettings() {
    const appName = localStorage.getItem(APP_NAME_KEY) || "X";
    const appImage = localStorage.getItem(APP_IMAGE_KEY) || "";
    const appColor = localStorage.getItem(APP_COLOR_KEY) || "#2563eb";
    const appActive = localStorage.getItem(APP_ACTIVE_KEY) || "on";

    const brandTitle = document.querySelector(".brand-text h1");
    const brandMark = document.querySelector(".brand-mark");

    if (brandTitle) {
      brandTitle.textContent = appName;
    }

    if (brandMark) {
      if (appImage && appImage.trim() !== "") {
        brandMark.style.backgroundImage = "url('" + appImage + "')";
        brandMark.style.backgroundSize = "cover";
        brandMark.style.backgroundPosition = "center";
        brandMark.textContent = "";
      } else {
        brandMark.style.backgroundImage = "";
        brandMark.style.background = "linear-gradient(135deg, " + appColor + ", #22c55e)";
        brandMark.textContent = appName.charAt(0).toUpperCase();
      }
    }

    if (appActive === "off") {
      chat.style.opacity = "0.5";
      form.querySelector("button[type='submit']").disabled = true;
      input.disabled = true;
      setPresence(false);
    } else {
      chat.style.opacity = "1";
      form.querySelector("button[type='submit']").disabled = false;
      input.disabled = false;
      updatePresenceFromNet();
    }
  }

  function setPresence(isOnline) {
    if (isOnline) {
      presenceDot.classList.remove("offline");
      presenceDot.classList.add("online");
      statusLine.textContent = "En ligne";
    } else {
      presenceDot.classList.remove("online");
      presenceDot.classList.add("offline");
      statusLine.textContent = "Hors ligne";
    }
  }

  function updatePresenceFromNet() {
    const internetEnabled = localStorage.getItem(INTERNET_KEY) !== "off";
    const browserOnline = navigator.onLine;

    if (internetEnabled && browserOnline) {
      setPresence(true);
    } else {
      setPresence(false);
    }
  }

  function updateNetState() {
    const internetEnabled = localStorage.getItem(INTERNET_KEY) !== "off";
    const browserOnline = navigator.onLine;

    if (internetEnabled && browserOnline) {
      netDisplay.textContent = "Internet : actif";
    } else if (!browserOnline) {
      netDisplay.textContent = "Internet : hors ligne";
    } else {
      netDisplay.textContent = "Internet : désactivé";
    }
  }

  function getAppName() {
    return localStorage.getItem(APP_NAME_KEY) || "X";
  }

  function updateDateTime() {
    const now = new Date();

    timeDisplay.textContent = now.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit"
    });

    dateDisplay.textContent = now.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function loadWeather() {
    const internetEnabled = localStorage.getItem(INTERNET_KEY) !== "off";
    if (!internetEnabled || !navigator.onLine) {
      weatherDisplay.textContent = "Météo : hors ligne";
      return;
    }

    if (!navigator.geolocation) {
      weatherDisplay.textContent = "Météo : localisation indisponible";
      return;
    }

    navigator.geolocation.getCurrentPosition(function (position) {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      const url =
        "https://api.open-meteo.com/v1/forecast?latitude=" +
        lat +
        "&longitude=" +
        lon +
        "&current=temperature_2m&timezone=auto";

      fetch(url)
        .then(function (response) {
          return response.json();
        })
        .then(function (data) {
          if (data && data.current) {
            weatherDisplay.textContent = "Météo : " + data.current.temperature_2m + "°C";
          } else {
            weatherDisplay.textContent = "Météo : indisponible";
          }
        })
        .catch(function () {
          weatherDisplay.textContent = "Météo : erreur";
        });
    }, function () {
      weatherDisplay.textContent = "Météo : localisation refusée";
    });
  }

  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    if (localStorage.getItem(APP_ACTIVE_KEY) === "off") {
      alert("L’application est désactivée.");
      return;
    }

    addMessage("user", text);
    input.value = "";
    saveMessages();

    showTyping();

    setTimeout(function () {
      removeTyping();
      const reply = generateReply(text);
      addMessage("bot", reply);
      saveMessages();
    }, 400);
  }

  function addMessage(role, text) {
    messages.push({ role, text });
    appendMessage(text, role);
  }

  function addMediaMessage(kind, fileURL, name) {
    const div = document.createElement("div");
    div.className = "message user";

    const title = document.createElement("div");
    title.textContent = name;
    div.appendChild(title);

    const preview = document.createElement("div");
    preview.className = "media-preview";

    if (kind === "image") {
      const img = document.createElement("img");
      img.src = fileURL;
      img.alt = name;
      preview.appendChild(img);
    } else if (kind === "audio") {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.src = fileURL;
      preview.appendChild(audio);
    } else if (kind === "video") {
      const video = document.createElement("video");
      video.controls = true;
      video.src = fileURL;
      preview.appendChild(video);
    }

    div.appendChild(preview);
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }

  function addFileMessage(name, fileURL) {
    const div = document.createElement("div");
    div.className = "message user";

    const label = document.createElement("div");
    label.textContent = "Fichier : " + name;
    div.appendChild(label);

    const chip = document.createElement("a");
    chip.className = "file-chip";
    chip.href = fileURL;
    chip.target = "_blank";
    chip.rel = "noopener";
    chip.textContent = "Ouvrir le fichier";
    div.appendChild(chip);

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }

  function appendMessage(text, role) {
    const div = document.createElement("div");
    div.className = "message " + role;
    div.textContent = text;

    if ((role === "bot" || role === "user") && text.length > 120) {
      const copyBtn = document.createElement("button");
      copyBtn.className = "message-copy-btn";
      copyBtn.type = "button";
      copyBtn.textContent = "□";
      copyBtn.title = "Copier ce message";
      copyBtn.addEventListener("click", async function (e) {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(text);
          copyBtn.textContent = "✓";
          setTimeout(function () {
            copyBtn.textContent = "□";
          }, 800);
        } catch {
          alert("Impossible de copier ce message.");
        }
      });
      div.appendChild(copyBtn);
    }

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }

  function renderMessages() {
    chat.innerHTML = "";
    messages.forEach(function (msg) {
      appendMessage(msg.text, msg.role);
    });
  }

  function saveMessages() {
    messages = messages.slice(-MAX_MESSAGES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }

  function loadMessages() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error("Erreur de chargement:", error);
      return [];
    }
  }

  function applySavedTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light") {
      document.body.classList.add("light");
      themeBtn.textContent = "Mode sombre";
    } else {
      document.body.classList.remove("light");
      themeBtn.textContent = "Mode clair";
    }
  }

  function showTyping() {
    typingEl = document.createElement("div");
    typingEl.className = "message bot typing";
    typingEl.textContent = "Le chatbot réfléchit...";
    chat.appendChild(typingEl);
    chat.scrollTop = chat.scrollHeight;
  }

  function removeTyping() {
    if (typingEl) {
      typingEl.remove();
      typingEl = null;
    }
  }

  function randomChoice(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function generateReply(text) {
    const lower = text.toLowerCase();

    const internetEnabled = localStorage.getItem(INTERNET_KEY) !== "off";
    const browserOnline = navigator.onLine;

    if (!internetEnabled || !browserOnline) {
      return randomChoice([
        "Je suis en mode hors ligne, mais je peux encore répondre localement.",
        "Internet n’est pas disponible. Je continue en mode local.",
        "Mode hors ligne activé : je reste fonctionnel."
      ]);
    }

    const greetings = ["bonjour", "salut", "bonsoir"];
    const nameQuestions = ["comment t'appelles", "comment tu t'appelles", "ton nom", "qui es-tu", "qui tu es"];
    const thanks = ["merci", "merci beaucoup", "thx"];
    const helpWords = ["aide", "peux-tu", "peux tu", "help"];
    const createWords = ["crée", "cree", "créer", "fabrique", "construis"];

    if (greetings.some(function (word) { return lower.includes(word); })) {
      return randomChoice([
        "Bonjour ! Comment puis-je t’aider aujourd’hui ?",
        "Salut ! Que puis-je faire pour toi ?",
        "Bonjour, je suis là pour t’aider."
      ]);
    }

    if (nameQuestions.some(function (word) { return lower.includes(word); })) {
      return "Je m’appelle " + getAppName() + ".";
    }

    if (thanks.some(function (word) { return lower.includes(word); })) {
      return randomChoice([
        "Avec plaisir !",
        "Je t’en prie.",
        "Content d’avoir pu aider."
      ]);
    }

    if (helpWords.some(function (word) { return lower.includes(word); })) {
      return "Oui. Je peux répondre à des questions simples, reformuler et t’aider à organiser tes idées.";
    }

    if (createWords.some(function (word) { return lower.includes(word); })) {
      return "Je peux t’aider à créer une structure, du texte ou un plan de projet.";
    }

    if (lower.includes("?")) {
      return randomChoice([
        "Bonne question. Donne-moi un peu plus de contexte et je te répondrai mieux.",
        "Je peux t’aider à préciser ça si tu veux.",
        "Dis-m’en un peu plus et je te répondrai de façon plus utile."
      ]);
    }

    return randomChoice([
      "Je t’ai lu. Si tu veux une réponse plus précise, donne-moi plus de détails.",
      "D’accord. Tu peux préciser ta demande ?",
      "Je suis prêt à continuer."
    ]);
  }
});