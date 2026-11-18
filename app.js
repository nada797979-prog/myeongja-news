/* 명자뉴스 채널 — app.js
   김포 날씨 + 연합뉴스 실시간 뉴스 + 집밥 추천요리
   백엔드 없이 브라우저에서만 동작합니다. */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * 0. 작은 도우미들
   * ------------------------------------------------------------------ */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function store(key, value) {
    try {
      if (value === undefined) {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      }
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* 저장이 막힌 브라우저는 무시 */ }
    return null;
  }

  function el(tag, opts, children) {
    var node = document.createElement(tag);
    opts = opts || {};
    Object.keys(opts).forEach(function (k) {
      if (k === "class") node.className = opts[k];
      else if (k === "text") node.textContent = opts[k];
      else if (k === "html") node.innerHTML = opts[k];
      else if (k === "dataset") Object.keys(opts[k]).forEach(function (d) { node.dataset[d] = opts[k][d]; });
      else if (k === "on") Object.keys(opts[k]).forEach(function (ev) { node.addEventListener(ev, opts[k][ev]); });
      else node.setAttribute(k, opts[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function fetchWithTimeout(url, ms) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, ms || 9000);
    return fetch(url, { signal: ctrl.signal, cache: "no-store" })
      .then(function (res) {
        clearTimeout(timer);
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      }, function (err) {
        clearTimeout(timer);
        throw err;
      });
  }

  /* ------------------------------------------------------------------ *
   * 1. 글자 크기 (보통 / 크게 / 아주 크게)
   * ------------------------------------------------------------------ */
  var SIZE_KEY = "mj_font_size_v1";
  function applySize(size) {
    if (["normal", "large", "xlarge"].indexOf(size) < 0) size = "normal";
    document.documentElement.setAttribute("data-size", size);
    $$(".fontsizer button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.sizeBtn === size));
    });
    store(SIZE_KEY, size);
  }
  $$(".fontsizer button").forEach(function (b) {
    b.addEventListener("click", function () { applySize(b.dataset.sizeBtn); });
  });
  applySize(store(SIZE_KEY) || "normal");

  /* 오늘 날짜 */
  (function () {
    var d = new Date();
    var label = d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
    var t = $("#todayLabel");
    if (t) t.textContent = label;
  })();

  /* ------------------------------------------------------------------ *
   * 2. 김포 날씨 + 미세먼지
   * ------------------------------------------------------------------ */
  var KIMPO = { lat: 37.6153, lon: 126.7156 };
  var WEATHER_CACHE = "mj_weather_v3";
  var WMO = {
    0: ["맑음", "☀️"], 1: ["대체로 맑음", "🌤️"], 2: ["구름 조금", "⛅"], 3: ["흐림", "☁️"],
    45: ["안개", "🌫️"], 48: ["짙은 안개", "🌫️"],
    51: ["약한 이슬비", "🌦️"], 53: ["이슬비", "🌦️"], 55: ["강한 이슬비", "🌦️"],
    56: ["어는 이슬비", "🌧️"], 57: ["어는 이슬비", "🌧️"],
    61: ["약한 비", "🌧️"], 63: ["비", "🌧️"], 65: ["강한 비", "🌧️"],
    66: ["어는 비", "🌧️"], 67: ["어는 비", "🌧️"],
    71: ["약한 눈", "🌨️"], 73: ["눈", "🌨️"], 75: ["많은 눈", "❄️"], 77: ["눈알갱이", "🌨️"],
    80: ["소나기", "🌦️"], 81: ["소나기", "🌦️"], 82: ["강한 소나기", "⛈️"],
    85: ["소낙눈", "🌨️"], 86: ["많은 소낙눈", "❄️"],
    95: ["천둥번개", "⛈️"], 96: ["우박 동반 뇌우", "⛈️"], 99: ["우박 동반 뇌우", "⛈️"]
  };

  function gradeDust(kind, value) {
    var v = Number(value);
    var levels = kind === "pm10"
      ? [[30, "좋음"], [80, "보통"], [150, "나쁨"], [Infinity, "매우나쁨"]]
      : [[15, "좋음"], [35, "보통"], [75, "나쁨"], [Infinity, "매우나쁨"]];
    for (var i = 0; i < levels.length; i++) {
      if (v <= levels[i][0]) return levels[i][1];
    }
    return "매우나쁨";
  }

  function dustAdvice(pm10Level, pm25Level) {
    var worst = [pm10Level, pm25Level];
    if (worst.indexOf("매우나쁨") >= 0) return "😷 오늘은 미세먼지가 매우 나빠요. 외출은 꼭 필요할 때만, KF94 마스크를 꼭 쓰세요.";
    if (worst.indexOf("나쁨") >= 0) return "😷 미세먼지가 나빠요. 마스크를 챙기고 오래 밖에 계시지 마세요.";
    if (worst.indexOf("보통") >= 0) return "🙂 공기는 보통이에요. 가벼운 산책은 괜찮습니다.";
    return "😊 공기가 깨끗해요. 산책하기 좋은 날입니다.";
  }

  function clothingAdvice(feels, rainProb) {
    var t = Number(feels);
    var msg;
    if (!isFinite(t)) msg = "오늘도 따뜻하게 입으세요.";
    else if (t <= -6) msg = "🧣 많이 추워요. 패딩에 목도리·장갑·모자까지 꼭 챙기세요.";
    else if (t <= 0) msg = "🧥 영하권 추위예요. 두꺼운 패딩과 목도리를 챙기세요.";
    else if (t <= 5) msg = "🧥 쌀쌀해요. 코트나 두꺼운 점퍼를 입으세요.";
    else if (t <= 10) msg = "🧶 서늘해요. 자켓이나 도톰한 가디건이 좋아요.";
    else if (t <= 15) msg = "👕 조금 쌀쌀해요. 얇은 겉옷을 걸치세요.";
    else if (t <= 21) msg = "👍 걷기 좋은 날씨예요. 가벼운 겉옷이면 충분합니다.";
    else if (t <= 27) msg = "🌞 따뜻해요. 반팔에 얇은 겉옷을 준비하세요.";
    else msg = "🥵 더워요. 시원한 옷차림에 물을 자주 드세요.";
    if (Number(rainProb) >= 60) msg += " ☔ 비 소식이 있으니 우산을 챙기세요.";
    return msg;
  }

  function setText(id, text) { var n = document.getElementById(id); if (n) n.textContent = text; }

  function renderWeather(data) {
    var cur = data.current || {}, daily = data.daily || {}, air = data.air || {};
    var code = Number(cur.weather_code);
    var info = WMO[code] || ["구름 많음", "🌤️"];
    setText("wTemp", "");
    var tempNode = $("#wTemp");
    if (tempNode) {
      tempNode.textContent = Math.round(Number(cur.temperature_2m)) + "";
      tempNode.appendChild(el("span", { class: "unit", text: "℃" }));
    }
    setText("wEmoji", info[1]);
    setText("wCond", info[0]);

    var tmax = daily.temperature_2m_max ? Math.round(daily.temperature_2m_max[0]) : null;
    var tmin = daily.temperature_2m_min ? Math.round(daily.temperature_2m_min[0]) : null;
    var feels = cur.apparent_temperature != null ? Math.round(Number(cur.apparent_temperature)) : null;
    var rainProb = daily.precipitation_probability_max ? daily.precipitation_probability_max[0] : null;

    var range = "오늘 최고 " + (tmax == null ? "-" : tmax) + "℃ · 최저 " + (tmin == null ? "-" : tmin) + "℃";
    if (feels != null) range += " · 체감 " + feels + "℃";
    setText("wRange", range);

    var pm10 = air.pm10, pm25 = air.pm2_5;
    var l10 = pm10 != null ? gradeDust("pm10", pm10) : null;
    var l25 = pm25 != null ? gradeDust("pm25", pm25) : null;

    var advice = clothingAdvice(feels, rainProb);
    if (l10 || l25) advice += "\n" + dustAdvice(l10 || "보통", l25 || "보통");
    var advNode = $("#wAdvice");
    if (advNode) {
      advNode.textContent = "";
      advice.split("\n").forEach(function (line, i) {
        if (i) advNode.appendChild(document.createElement("br"));
        advNode.appendChild(document.createTextNode(line));
      });
    }

    fillAir("pm10", pm10, l10, 150);
    fillAir("pm25", pm25, l25, 75);

    setText("wHumid", "습도 " + (cur.relative_humidity_2m != null ? Math.round(cur.relative_humidity_2m) + "%" : "-"));
    setText("wRain", "강수확률 " + (rainProb != null ? Math.round(rainProb) + "%" : "-"));
    var now = new Date();
    setText("wUpdated", "업데이트 " + String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0"));
  }

  function fillAir(kind, value, level, maxBar) {
    var isPm10 = kind === "pm10";
    var box = document.getElementById(isPm10 ? "airPm10" : "airPm25");
    var valNode = document.getElementById(isPm10 ? "pm10Value" : "pm25Value");
    var stateNode = document.getElementById(isPm10 ? "pm10State" : "pm25State");
    var barNode = document.getElementById(isPm10 ? "pm10Bar" : "pm25Bar");
    if (!box) return;
    if (value == null || !isFinite(Number(value))) {
      if (valNode) valNode.innerHTML = "--<small>㎍/㎥</small>";
      if (stateNode) stateNode.textContent = "확인 중";
      box.setAttribute("data-level", "보통");
      if (barNode) barNode.style.width = "0%";
      return;
    }
    box.setAttribute("data-level", level);
    if (valNode) {
      valNode.textContent = Math.round(Number(value) * 10) / 10;
      valNode.appendChild(el("small", { text: "㎍/㎥" }));
    }
    if (stateNode) stateNode.textContent = level;
    if (barNode) barNode.style.width = Math.min(100, Math.round((Number(value) / maxBar) * 100)) + "%";
  }

  var weatherLoading = false;
  function loadWeather(force) {
    if (weatherLoading) return;
    var cached = store(WEATHER_CACHE);
    if (!force && cached && cached.ts && Date.now() - cached.ts < 10 * 60 * 1000) {
      renderWeather(cached.data);
      return;
    }
    weatherLoading = true;
    var wUrl = "https://api.open-meteo.com/v1/forecast?latitude=" + KIMPO.lat + "&longitude=" + KIMPO.lon +
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&" +
      "daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FSeoul&forecast_days=1";
    var aUrl = "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=" + KIMPO.lat + "&longitude=" + KIMPO.lon +
      "&current=pm10,pm2_5&timezone=Asia%2FSeoul";

    var weatherP = fetchWithTimeout(wUrl, 9000).then(function (t) { return JSON.parse(t); });
    var airP = fetchWithTimeout(aUrl, 9000).then(function (t) { return JSON.parse(t); })
      .catch(function () { return null; });

    Promise.all([weatherP, airP]).then(function (res) {
      var data = {
        current: res[0].current || {},
        daily: res[0].daily || {},
        air: res[1] ? (res[1].current || {}) : {}
      };
      renderWeather(data);
      store(WEATHER_CACHE, { ts: Date.now(), data: data });
    }).catch(function () {
      var old = store(WEATHER_CACHE);
      if (old && old.data) {
        renderWeather(old.data);
        var adv = $("#wAdvice");
        if (adv) adv.textContent = "⚠️ 지금은 날씨를 새로 받지 못했어요. 지난번 날씨를 보여드려요.";
      } else {
        setText("wCond", "날씨를 못 받았어요");
        setText("wAdvice", "인터넷 연결을 확인하고 ↻ 새로고침을 눌러 주세요.");
      }
    }).then(function () { weatherLoading = false; });
  }

  var refreshBtn = $("#weatherRefresh");
  if (refreshBtn) refreshBtn.addEventListener("click", function () {
    refreshBtn.textContent = "불러오는 중…";
    loadWeather(true);
    setTimeout(function () { refreshBtn.textContent = "↻ 새로고침"; }, 2500);
  });

  /* ------------------------------------------------------------------ *
   * 3. 뉴스
   * ------------------------------------------------------------------ */
  var YNA = "https://www.yna.co.kr/rss/";
  var TABS = {
    all: { label: "전체", emoji: "📰", feed: YNA + "news.xml", title: "오늘의 뉴스" },
    economy: { label: "경제", emoji: "💰", feed: YNA + "economy.xml", title: "경제 뉴스" },
    politics: { label: "정치", emoji: "🏛️", feed: YNA + "politics.xml", title: "정치 뉴스" },
    celeb: { label: "연예", emoji: "🎬", feed: YNA + "entertainment.xml", title: "연예 뉴스" }
  };
  var NEWS_TTL = 20 * 60 * 1000;
  var PAGE = 12;
  var state = { tab: "all", items: [], shown: PAGE, note: null, reqId: 0 };

  function cacheKey(tab) { return "mj_news_v2_" + tab; }

  function parseRss2Json(text) {
    var d = JSON.parse(text);
    if (!d || d.status !== "ok" || !d.items) throw new Error(d && d.message ? d.message : "empty");
    return d.items.map(function (it) {
      var img = (it.enclosure && it.enclosure.link) || it.thumbnail || firstImage(it.content) || "";
      var stamp = it.pubDate ? new Date(String(it.pubDate).replace(" ", "T") + "Z") : null;
      return {
        title: clean(it.title),
        link: it.link,
        img: img,
        desc: clean(it.description || ""),
        source: "연합뉴스",
        date: stamp && !isNaN(stamp.getTime()) ? stamp.getTime() : null
      };
    });
  }

  function parseXmlFeed(text) {
    var doc = new DOMParser().parseFromString(text, "text/xml");
    if (doc.getElementsByTagName("parsererror").length) throw new Error("xml parse error");
    var nodes = Array.prototype.slice.call(doc.getElementsByTagName("item"));
    return nodes.map(function (n) {
      function txt(tag) {
        var t = n.getElementsByTagName(tag)[0];
        return t ? (t.textContent || "").trim() : "";
      }
      var media = n.getElementsByTagName("media:content")[0] || n.getElementsByTagName("media:thumbnail")[0];
      var encl = n.getElementsByTagName("enclosure")[0];
      var img = (media && (media.getAttribute("url") || "")) || (encl && (encl.getAttribute("url") || "")) || "";
      if (!img) img = firstImage(txt("description"));
      var stamp = txt("pubDate") ? new Date(txt("pubDate")) : null;
      return {
        title: clean(txt("title")),
        link: txt("link"),
        img: img,
        desc: clean(txt("description")),
        source: "연합뉴스",
        date: stamp && !isNaN(stamp.getTime()) ? stamp.getTime() : null
      };
    });
  }

  function firstImage(html) {
    if (!html || html.indexOf("<img") < 0) return "";
    var m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
    return m ? m[1] : "";
  }

  function clean(s) {
    if (!s) return "";
    var div = document.createElement("div");
    div.innerHTML = s;
    var t = (div.textContent || "").replace(/\s+/g, " ").trim();
    return t.length > 160 ? t.slice(0, 158) + "…" : t;
  }

  var PROVIDERS = [
    function (feed) {
      return fetchWithTimeout("https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(feed) + "&count=30", 8000)
        .then(parseRss2Json);
    },
    function (feed) {
      return fetchWithTimeout("https://api.allorigins.win/raw?url=" + encodeURIComponent(feed), 7000)
        .then(parseXmlFeed);
    },
    function (feed) {
      return fetchWithTimeout("https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(feed), 7000)
        .then(parseXmlFeed);
    },
    function (feed) {
      return fetchWithTimeout("https://api.cors.lol/?url=" + encodeURIComponent(feed), 7000)
        .then(parseXmlFeed);
    }
  ];

  /* 여러 통로에 동시에 물어보고 가장 먼저 온 것을 씁니다. */
  function fetchFeed(feed) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var fails = 0;
      PROVIDERS.forEach(function (provider) {
        provider(feed).then(function (items) {
          if (!items || !items.length) throw new Error("empty feed");
          if (settled) return;
          settled = true;
          resolve(items);
        }).catch(function () {
          fails += 1;
          if (!settled && fails === PROVIDERS.length) reject(new Error("all providers failed"));
        });
      });
    });
  }

  function normalize(items) {
    var seen = {};
    var out = [];
    items.forEach(function (it) {
      if (!it.title || !it.link) return;
      var key = it.link.split("?")[0] + it.title.slice(0, 20);
      if (seen[key]) return;
      seen[key] = 1;
      if (it.img && it.img.indexOf("//") === 0) it.img = "https:" + it.img;
      if (it.img && !/^https?:/.test(it.img)) it.img = "";
      out.push(it);
    });
    out.sort(function (a, b) { return (b.date || 0) - (a.date || 0); });
    return out.slice(0, 40);
  }

  function timeAgo(ts) {
    if (!ts) return "";
    var diff = Date.now() - ts;
    var min = Math.floor(diff / 60000);
    if (min < 1) return "방금 전";
    if (min < 60) return min + "분 전";
    var hour = Math.floor(min / 60);
    if (hour < 24) return hour + "시간 전";
    var day = Math.floor(hour / 24);
    if (day === 1) return "어제";
    if (day < 7) return day + "일 전";
    var dt = new Date(ts);
    return (dt.getMonth() + 1) + "월 " + dt.getDate() + "일";
  }

  function thumbNode(item, tab) {
    var fig = el("figure", { class: "thumb" });
    var info = TABS[tab] || TABS.all;
    function fallback() {
      fig.textContent = "";
      fig.appendChild(el("div", { class: "thumb-fallback" }, [
        el("span", { class: "tf-emoji", text: info.emoji }),
        el("span", { class: "tf-text", text: info.label + " 뉴스" })
      ]));
    }
    if (!item.img) { fallback(); return fig; }
    var img = el("img", { alt: "", loading: "lazy", decoding: "async" });
    img.addEventListener("error", fallback);
    img.addEventListener("load", function () { fig.classList.add("loaded"); });
    img.src = item.img;
    fig.appendChild(img);
    return fig;
  }

  function newsCard(item, tab) {
    var info = TABS[tab] || TABS.all;
    var card = el("article", { class: "news-card" });
    var a = el("a", { href: item.link, target: "_blank", rel: "noopener noreferrer" });
    a.appendChild(thumbNode(item, tab));
    var meta = el("div", { class: "news-meta" }, [
      el("span", { text: item.source || "연합뉴스" }),
      el("span", { class: "dot", text: "·" }),
      el("span", { text: timeAgo(item.date) }),
      el("span", { class: "open-hint", text: "기사 보기 ▶" })
    ]);    a.appendChild(el("div", { class: "news-body" }, [
      el("span", { class: "badge", dataset: { cat: info.label }, text: info.label }),
      el("h3", { class: "news-title", text: item.title }),
      meta
    ]));
    card.appendChild(a);
    return card;
  }

  function renderSkeleton(tab) {
    var list = $("#newsList");
    if (!list) return;
    setText("newsTitle", (TABS[tab] || TABS.all).title);
    list.textContent = "";
    for (var i = 0; i < 3; i++) {
      list.appendChild(el("div", { class: "skeleton" }, [
        el("div", { class: "sk-img" }),
        el("div", { class: "sk-line" }),
        el("div", { class: "sk-line short" })
      ]));
    }
    var more = $("#newsMore");
    if (more) more.textContent = "";
    setText("newsCount", "불러오는 중…");
  }

  function renderNews() {
    var list = $("#newsList");
    var more = $("#newsMore");
    if (!list) return;
    list.textContent = "";
    if (more) more.textContent = "";

    var items = state.items;
    setText("newsTitle", (TABS[state.tab] || TABS.all).title);
    setText("newsCount", items.length ? items.length + "건" : "");

    items.slice(0, state.shown).forEach(function (item) {
      list.appendChild(newsCard(item, state.tab));
    });

    if (state.note) {
      list.insertBefore(el("div", { class: "offline-note", text: state.note }), list.firstChild);
    }

    if (more && items.length > state.shown) {
      more.appendChild(el("button", {
        type: "button", class: "btn ghost wide",
        text: "기사 더 보기 (" + (items.length - state.shown) + "건)",
        on: { click: function () { state.shown += PAGE; renderNews(); } }
      }));
    }
  }

  function renderNewsError(message, link) {
    var list = $("#newsList");
    var more = $("#newsMore");
    if (!list) return;
    list.textContent = "";
    if (more) more.textContent = "";
    setText("newsCount", "");
    var kids = [
      el("span", { class: "big-emoji", text: "📡" }),
      el("p", { text: "뉴스를 불러오지 못했어요" }),
      el("p", { class: "sub", text: message || "인터넷 연결을 확인한 뒤 다시 눌러 주세요." }),
      el("button", {
        type: "button", class: "btn", text: "다시 불러오기",
        on: { click: function () { loadNews(state.tab, true); } }
      })
    ];
    if (link) {
      kids.push(el("a", {
        class: "btn ghost wide", href: link.url, target: "_blank", rel: "noopener noreferrer",
        text: link.label, style: "margin-top:0.55rem;display:block;line-height:3.1rem;text-decoration:none;text-align:center"
      }));
    }
    list.appendChild(el("div", { class: "status-box" }, kids));
  }

  function loadNews(tab, force) {
    var cfg = TABS[tab];
    if (!cfg) return;
    state.tab = tab;
    var reqId = ++state.reqId;

    var cached = store(cacheKey(tab));
    var hasCache = !!(cached && cached.items && cached.items.length);
    var fresh = hasCache && (Date.now() - (cached.ts || 0) < NEWS_TTL);

    if (hasCache) {
      state.items = cached.items;
      state.shown = PAGE;
      state.note = fresh ? null : "📡 새 뉴스를 받지 못해 지난번에 받아둔 기사를 보여드려요.";
      renderNews();
      if (fresh && !force) return;
    } else {
      state.items = [];
      state.shown = PAGE;
      state.note = null;
      renderSkeleton(tab);
    }

    fetchFeed(cfg.feed).then(function (items) {
      if (reqId !== state.reqId) return; /* 다른 탭으로 옮겨감 */
      state.items = normalize(items);
      state.shown = PAGE;
      state.note = null;
      store(cacheKey(tab), { ts: Date.now(), items: state.items });
      renderNews();
    }).catch(function () {
      if (reqId !== state.reqId) return;
      var old = store(cacheKey(tab));
      if (old && old.items && old.items.length) {
        state.items = old.items;
        state.note = "📡 새 뉴스를 받지 못해 지난번에 받아둔 기사를 보여드려요.";
        renderNews();
        return;
      }
      /* 전용 소식통이 막혔을 때: 오늘의 기사에서 그 분야만 골라 보여드립니다 */
      var picked = pickByKeywords(tab);
      if (picked) {
        state.items = picked;
        state.shown = PAGE;
        state.note = "🔎 " + cfg.label + " 전용 소식이 지금 막혀서, 오늘의 기사 중 " + cfg.label + " 소식을 골라 보여드려요.";
        renderNews();
        return;
      }
      renderNewsError("잠시 뒤 ‘다시 불러오기’를 눌러 주세요.", SECTION_LINKS[tab]);
    });
  }

  var SECTION_LINKS = {
    all: { url: "https://www.yna.co.kr/news", label: "연합뉴스에서 직접 보기" },
    economy: { url: "https://www.yna.co.kr/economy/all", label: "연합뉴스 경제면에서 보기" },
    politics: { url: "https://www.yna.co.kr/politics/all", label: "연합뉴스 정치면에서 보기" },
    celeb: { url: "https://www.yna.co.kr/entertainment/all", label: "연합뉴스 연예면에서 보기" }
  };

  var PICK_WORDS = {
    economy: ["주가", "증시", "코스피", "코스닥", "환율", "금리", "물가", "수출", "수입", "기업", "반도체", "부동산", "은행", "투자", "경제", "매출", "영업이익", "원화", "유가", "무역", "세금", "예산", "고용", "소비", "가격"],
    politics: ["대통령", "국회", "정부", "여당", "야당", "장관", "국무", "의원", "선거", "외교", "국방", "경찰", "검찰", "법원", "청문", "북한", "통일", "정당", "대변인", "정치", "특검", "개각"],
    celeb: ["배우", "가수", "아이돌", "드라마", "영화", "예능", "방송", "컴백", "콘서트", "앨범", "시청률", "연기", "오디션", "뮤지컬", "그룹", "K팝", "케이팝", "팬", "연예", "스타", "감독", "출연", "무대", "투어"]
  };

  function pickByKeywords(tab) {
    var words = PICK_WORDS[tab];
    var all = store(cacheKey("all"));
    if (!words || !all || !all.items || !all.items.length) return null;
    var picked = all.items.filter(function (it) {
      var t = it.title || "";
      return words.some(function (w) { return t.indexOf(w) >= 0; });
    });
    return picked.length >= 3 ? picked : null;
  }

  /* 탭을 눌렀을 때 바로 보이도록 다른 분야 기사를 미리 조용히 받아 둡니다. */
  function prefetchFeeds() {
    var queue = ["celeb", "economy", "politics"];
    var i = 0;
    function next() {
      if (i >= queue.length) return;
      var tab = queue[i++];
      var c = store(cacheKey(tab));
      if (c && c.items && c.items.length && Date.now() - (c.ts || 0) < NEWS_TTL) {
        setTimeout(next, 1500);
        return;
      }
      fetchFeed(TABS[tab].feed).then(function (items) {
        var cur = store(cacheKey(tab));
        if (!cur || !cur.items || !cur.items.length) {
          store(cacheKey(tab), { ts: Date.now(), items: normalize(items) });
        }
      }).catch(function () { /* 미리 받기는 실패해도 괜찮습니다 */ })
        .then(function () { setTimeout(next, 12000); });
    }
    setTimeout(next, 7000);
  }

  /* 탭 */
  var newsRefreshBtn = $("#newsRefresh");
  if (newsRefreshBtn) newsRefreshBtn.addEventListener("click", function () {
    newsRefreshBtn.textContent = "불러오는 중…";
    loadNews(state.tab, true);
    setTimeout(function () { newsRefreshBtn.textContent = "↻ 새로고침"; }, 2200);
  });

  $$("#tabs button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var tab = btn.dataset.tab;
      $$("#tabs button").forEach(function (b) { b.setAttribute("aria-selected", String(b === btn)); });
      var newsPanel = $("#newsPanel");
      var recipePanel = $("#recipePanel");
      var weatherCard = $("#weatherCard");
      var ytBanner = $("#ytBanner");
      if (tab === "recipe") {
        if (newsPanel) newsPanel.hidden = true;
        if (recipePanel) recipePanel.hidden = false;
        if (weatherCard) weatherCard.hidden = true;
        if (ytBanner) ytBanner.hidden = true;
        renderRecipes();
        var input = $("#recipeInput");
        if (input) { try { input.focus({ preventScroll: true }); } catch (e) {} }
      } else {
        if (recipePanel) recipePanel.hidden = true;
        if (newsPanel) newsPanel.hidden = false;
        if (weatherCard) weatherCard.hidden = false;
        if (ytBanner) ytBanner.hidden = false;
        loadNews(tab, false);
      }
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { window.scrollTo(0, 0); }
    });
  });

  /* ------------------------------------------------------------------ *
   * 4. 추천요리
   * ------------------------------------------------------------------ */
  var recipes = window.RECIPES || [];
  var rState = { query: "", kind: "" };

  function norm(s) { return String(s || "").replace(/\s+/g, "").toLowerCase(); }

  function matchRecipe(r, q) {
    if (!q) return true;
    var nq = norm(q);
    if (norm(r.name).indexOf(nq) >= 0) return true;
    if (norm(r.kind).indexOf(nq) >= 0) return true;
    if ((r.tags || []).some(function (t) { return norm(t).indexOf(nq) >= 0; })) return true;
    if ((r.season || []).some(function (t) { return norm(t).indexOf(nq) >= 0; })) return true;
    if ((r.ingredients || []).some(function (t) { return norm(t).indexOf(nq) >= 0; })) return true;
    return false;
  }

  var MANGO = "https://www.10000recipe.com/recipe/list.html?q=";
  var YOUTUBE = "https://www.youtube.com/results?search_query=";

  function updateExternalLinks(q) {
    var box = $("#recipeExternal");
    if (!box) return;
    var word = (q || "").trim();
    box.hidden = !word;
    if (!word) return;
    var note = box.querySelector(".ext-note");
    if (note) note.textContent = "‘" + word + "’을 다른 곳에서도 찾아보세요";
    var mango = $("#extMango");
    var yt = $("#extYoutube");
    if (mango) {
      mango.href = MANGO + encodeURIComponent(word);
      mango.textContent = "🟠 만개의레시피에서 찾기";
    }
    if (yt) {
      yt.href = YOUTUBE + encodeURIComponent(word + " 레시피");
      yt.textContent = "▶️ 유튜브에서 영상 찾기";
    }
  }

  function recipeCard(r) {
    return el("button", {
      type: "button", class: "recipe-card",
      on: { click: function () { openRecipe(r); } }
    }, [
      el("span", { class: "r-emoji", text: r.emoji, "aria-hidden": "true" }),
      el("span", { class: "r-body" }, [
        el("h3", { text: r.name }),
        el("div", { class: "r-meta", text: r.kind + " · " + r.time + " · " + r.level + " · " + r.serving }),
        el("div", { class: "r-tags", text: (r.tags || []).slice(0, 5).join(" · ") })
      ])
    ]);
  }

  function renderRecipes() {
    var list = $("#recipeList");
    if (!list) return;
    list.textContent = "";
    var q = rState.query;
    var kind = rState.kind;
    var shown = recipes.filter(function (r) {
      if (kind && r.kind !== kind) return false;
      return matchRecipe(r, q);
    });

    setText("recipeCount", shown.length + "가지");
    setText("recipeTitle", q ? "‘" + q + "’ 검색 결과" : (kind || "오늘 뭐 해 먹지?"));
    updateExternalLinks(q);

    if (!shown.length) {
      list.appendChild(el("div", { class: "recipe-empty" }, [
        el("span", { class: "big-emoji", text: "🔎" }),
        el("p", { text: "‘" + q + "’ 요리는 앱 목록에 없어요" }),
        el("p", { class: "sub", text: "위의 주황색 버튼으로 만개의레시피나 유튜브에서 찾아보세요." }),
        el("button", {
          type: "button", class: "btn ghost", style: "margin-top:0.7rem", text: "전체 요리 보기",
          on: {
            click: function () {
              rState.query = ""; rState.kind = "";
              var input = $("#recipeInput"); if (input) input.value = "";
              $$("#recipeChips button").forEach(function (b) { b.setAttribute("aria-pressed", String(!b.dataset.kind)); });
              renderRecipes();
            }
          }
        })
      ]));
      return;
    }
    shown.forEach(function (r) { list.appendChild(recipeCard(r)); });
  }

  var searchBtn = $("#recipeSearchBtn");
  var input = $("#recipeInput");
  function doSearch() {
    rState.query = input ? input.value.trim() : "";
    renderRecipes();
    if (rState.query) updateExternalLinks(rState.query);
  }
  if (searchBtn) searchBtn.addEventListener("click", doSearch);
  if (input) {
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); doSearch(); } });
    input.addEventListener("search", function () { rState.query = input.value.trim(); renderRecipes(); });
  }
  $$("#recipeChips button").forEach(function (b) {
    b.addEventListener("click", function () {
      rState.kind = b.dataset.kind || "";
      $$("#recipeChips button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      renderRecipes();
    });
  });

  /* 레시피 상세 */
  function openRecipe(r) {
    var sheet = $("#sheet");
    var inner = $("#sheetInner");
    if (!sheet || !inner) return;
    setText("sheetTitle", r.name);
    inner.textContent = "";

    inner.appendChild(el("div", { class: "r-hero" }, [
      el("span", { class: "big", text: r.emoji, "aria-hidden": "true" }),
      el("div", {}, [
        el("h3", { text: r.name }),
        el("div", { class: "meta", text: r.time + " · " + r.level + " · " + r.serving }),
        el("div", { class: "meta", text: (r.season || []).join("·") + "에 좋아요" })
      ])
    ]));

    inner.appendChild(el("div", { class: "sec-title" }, [el("span", { text: "🧺" }), el("span", { text: "재료" })]));
    inner.appendChild(el("div", { class: "ing-box" }, [
      el("ul", {}, (r.ingredients || []).map(function (i) { return el("li", { text: i }); }))
    ]));

    inner.appendChild(el("div", { class: "sec-title" }, [el("span", { text: "👩‍🍳" }), el("span", { text: "만드는 순서" })]));
    inner.appendChild(el("div", { class: "steps" }, (r.steps || []).map(function (s) {
      return el("div", { class: "step", text: s });
    })));

    if (r.tip) inner.appendChild(el("div", { class: "tip-box", text: "💡 " + r.tip }));

    inner.appendChild(el("div", { class: "sheet-actions" }, [
      el("a", {
        class: "ext-btn mango", href: MANGO + encodeURIComponent(r.name), target: "_blank", rel: "noopener",
        text: "🟠 만개의레시피에서 더 보기"
      }),
      el("a", {
        class: "ext-btn youtube", href: YOUTUBE + encodeURIComponent(r.name + " 레시피"), target: "_blank", rel: "noopener",
        text: "▶️ 유튜브 영상으로 보기"
      }),
      el("button", { type: "button", class: "btn wide", text: "닫기", on: { click: closeSheet } })
    ]));

    sheet.hidden = false;
    document.body.style.overflow = "hidden";
    var panel = $("#sheetPanel");
    if (panel) panel.scrollTop = 0;
    var closeBtn = $("#sheetClose");
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  function closeSheet() {
    var sheet = $("#sheet");
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true;
    document.body.style.overflow = "";
  }

  var sheetCloseBtn = $("#sheetClose");
  if (sheetCloseBtn) sheetCloseBtn.addEventListener("click", closeSheet);
  var sheet = $("#sheet");
  if (sheet) {
    sheet.addEventListener("click", function (e) { if (e.target === sheet) closeSheet(); });
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });

  /* ------------------------------------------------------------------ *
   * 5. 시작
   * ------------------------------------------------------------------ */
  loadWeather(false);
  loadNews("all", false);
  if (recipes.length) renderRecipes();
  prefetchFeeds();

  /* 서비스 워커 (홈 화면 앱처럼 열기 · 인터넷이 끊겨도 화면 유지) */
  if ("serviceWorker" in navigator) {
    var okProto = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (okProto) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").catch(function () { /* 등록 실패는 조용히 넘어감 */ });
      });
    }
  }
})();
