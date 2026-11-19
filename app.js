/* 명자채널 — app.js
   김포 날씨(오늘 + 7일 예보) + 여러 언론사 실시간 뉴스(사회·경제·정치·미국·연예)
   + 코뿔소 TV 최신 영상 + 유튜브 인기 요리 영상
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

  function fetchWithTimeout(url, ms, opts) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, ms || 9000);
    var init = { signal: ctrl.signal, cache: "no-store" };
    if (opts) Object.keys(opts).forEach(function (k) { init[k] = opts[k]; });
    return fetch(url, init)
      .then(function (res) {
        clearTimeout(timer);
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      }, function (err) {
        clearTimeout(timer);
        throw err;
      });
  }

  function hhmm(ts) {
    var d = new Date(ts || Date.now());
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
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
   * 2. 김포 날씨 + 미세먼지 + 일주일 예보
   * ------------------------------------------------------------------ */
  var KIMPO = { lat: 37.6153, lon: 126.7156 };
  var WEATHER_CACHE = "mj_weather_v6";
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

  /* 일주일 예보 칸에 넣을 짧은 날씨 이름 */
  var SHORT_COND = {
    "대체로 맑음": "맑음", "구름 조금": "구름", "짙은 안개": "안개", "약한 이슬비": "이슬비",
    "강한 이슬비": "이슬비", "어는 이슬비": "이슬비", "약한 비": "비", "강한 비": "비",
    "어는 비": "비", "약한 눈": "눈", "많은 눈": "눈", "눈알갱이": "눈", "강한 소나기": "소나기",
    "소낙눈": "눈", "많은 소낙눈": "눈", "천둥번개": "천둥", "우박 동반 뇌우": "우박"
  };
  function shortCond(name) { return SHORT_COND[name] || name; }

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

  /* 5일 예보 (5칸) */
  function renderWeek(daily) {
    var row = document.getElementById("wWeekRow");
    if (!row) return;
    row.textContent = "";
    var dates = daily.time || [];
    if (!dates.length) return;

    dates.slice(0, 5).forEach(function (dateStr, i) {
      var code = daily.weather_code ? Number(daily.weather_code[i]) : NaN;
      var info = WMO[code] || ["", "🌡️"];
      var hi = daily.temperature_2m_max && daily.temperature_2m_max[i] != null ? Math.round(daily.temperature_2m_max[i]) : null;
      var lo = daily.temperature_2m_min && daily.temperature_2m_min[i] != null ? Math.round(daily.temperature_2m_min[i]) : null;
      var rain = daily.precipitation_probability_max && daily.precipitation_probability_max[i] != null
        ? Math.round(daily.precipitation_probability_max[i]) : null;

      var d = new Date(dateStr + "T00:00:00");
      var dayName = i === 0 ? "오늘" : d.toLocaleDateString("ko-KR", { weekday: "short" }).replace("요일", "");
      var monthDay = (d.getMonth() + 1) + "/" + d.getDate();

      var cell = el("div", { class: "wd" + (i === 0 ? " today" : "") }, [
        el("span", { class: "wd-day", text: dayName }),
        el("span", { class: "wd-date", text: monthDay }),
        el("span", { class: "wd-ico", text: info[1], "aria-hidden": "true" }),
        el("span", { class: "wd-cond", text: shortCond(info[0]) }),
        el("span", { class: "wd-temp" }, [
          el("b", { text: (hi == null ? "-" : hi) + "°" }),
          el("i", { text: (lo == null ? "-" : lo) + "°" })
        ]),
        el("span", {
          class: "wd-rain" + (rain != null && rain >= 60 ? " wet" : ""),
          text: rain == null ? "비 -" : (rain >= 60 ? "비 " : "") + rain + "%"
        })
      ]);
      row.appendChild(cell);
    });
  }

  /* 내일 날씨 자세히 — 오전·오후·밤 날씨, 최저·최고, 비, 바람, 체감 */
  function numAt(arr, i) {
    if (!arr || arr[i] == null || !isFinite(Number(arr[i]))) return null;
    return Number(arr[i]);
  }

  function hourIndex(hourly, dateStr, hour) {
    var times = (hourly && hourly.time) || [];
    for (var i = 0; i < times.length; i++) {
      var t = String(times[i]);
      if (t.slice(0, 10) === dateStr && Number(t.slice(11, 13)) === hour) return i;
    }
    return -1;
  }

  function tomorrowNote(rainProb, rainSum, lo, wind) {
    var msg = [];
    if (rainProb != null && rainProb >= 60) msg.push("☔ 내일은 비 소식이 많아요. 우산을 꼭 챙기세요.");
    else if (rainSum != null && rainSum >= 1) msg.push("🌧️ 내일 비가 조금 내려요. 작은 우산이 좋아요.");
    else if (rainProb != null && rainProb >= 30) msg.push("🌂 내일 비가 올 수 있어요. 우산을 챙기면 좋아요.");
    else msg.push("☀️ 내일은 비 소식이 거의 없어요.");
    if (lo != null && lo <= 0) msg.push("🧣 아침이 영하예요. 따뜻하게 입으세요.");
    else if (lo != null && lo <= 5) msg.push("🧥 아침은 쌀쌀해요. 겉옷을 챙기세요.");
    if (wind != null && wind >= 9) msg.push("💨 바람이 세게 불어요.");
    return msg.join(" ");
  }

  function renderTomorrow(daily, hourly) {
    var dates = daily.time || [];
    if (dates.length < 2) return;
    var dateStr = dates[1];
    var d = new Date(dateStr + "T00:00:00");
    var wd = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
    setText("wtomTitle", "내일 " + (d.getMonth() + 1) + "월 " + d.getDate() + "일 (" + wd + ")");

    var hi = numAt(daily.temperature_2m_max, 1);
    var lo = numAt(daily.temperature_2m_min, 1);
    var rainProb = numAt(daily.precipitation_probability_max, 1);
    var rainSum = numAt(daily.precipitation_sum, 1);
    var wind = numAt(daily.wind_speed_10m_max, 1);
    var feelsHi = numAt(daily.apparent_temperature_max, 1);
    var feelsLo = numAt(daily.apparent_temperature_min, 1);

    var temps = document.getElementById("wtomTemps");
    if (temps) {
      temps.textContent = "";
      temps.appendChild(document.createTextNode("최저 "));
      temps.appendChild(el("b", { text: lo == null ? "-" : Math.round(lo) + "°" }));
      temps.appendChild(document.createTextNode(" · 최고 "));
      temps.appendChild(el("b", { text: hi == null ? "-" : Math.round(hi) + "°" }));
    }

    var facts = document.getElementById("wtomFacts");
    if (facts) {
      facts.textContent = "";
      var list = [];
      var code = numAt(daily.weather_code, 1);
      if (code != null) {
        var info = WMO[code] || ["", "🌡️"];
        list.push(info[1] + " " + shortCond(info[0]));
      }
      list.push("☔ 강수확률 " + (rainProb == null ? "-" : Math.round(rainProb) + "%"));
      if (rainSum != null) list.push("💧 비 " + (Math.round(rainSum * 10) / 10) + "mm");
      if (wind != null) list.push("💨 바람 " + (Math.round(wind * 10) / 10) + "m/s");
      if (feelsLo != null || feelsHi != null) {
        list.push("🌡️ 체감 " + (feelsLo == null ? "-" : Math.round(feelsLo) + "°") +
          "~" + (feelsHi == null ? "-" : Math.round(feelsHi) + "°"));
      }
      list.forEach(function (t) { facts.appendChild(el("span", { text: t })); });
    }

    var hoursBox = document.getElementById("wtomHours");
    if (hoursBox) {
      hoursBox.textContent = "";
      [{ h: 9, label: "오전 9시" }, { h: 15, label: "오후 3시" }, { h: 21, label: "밤 9시" }].forEach(function (slot) {
        var i = hourIndex(hourly, dateStr, slot.h);
        if (i < 0) return;
        var hCode = numAt(hourly.weather_code, i);
        var hInfo = hCode == null ? ["", "🌡️"] : (WMO[hCode] || ["", "🌡️"]);
        var hTemp = numAt(hourly.temperature_2m, i);
        var hRain = numAt(hourly.precipitation_probability, i);
        hoursBox.appendChild(el("div", { class: "wtom-h" }, [
          el("span", { class: "h-label", text: slot.label }),
          el("span", { class: "h-emoji", text: hInfo[1], "aria-hidden": "true" }),
          el("span", { class: "h-temp", text: hTemp == null ? "-" : Math.round(hTemp) + "°" }),
          el("span", { class: "h-cond", text: shortCond(hInfo[0]) }),
          el("span", { class: "h-rain" + (hRain != null && hRain >= 60 ? " wet" : ""), text: hRain == null ? "비 -" : "비 " + Math.round(hRain) + "%" })
        ]));
      });
    }

    setText("wtomNote", tomorrowNote(rainProb, rainSum, lo, wind));
  }

  function renderWeather(data) {
    var cur = data.current || {}, daily = data.daily || {}, air = data.air || {};
    var code = Number(cur.weather_code);
    var info = WMO[code] || ["구름 많음", "🌤️"];
    var tempNode = $("#wTemp");
    if (tempNode) {
      tempNode.textContent = isFinite(Number(cur.temperature_2m)) ? Math.round(Number(cur.temperature_2m)) + "" : "--";
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

    renderTomorrow(daily, data.hourly || {});
    renderWeek(daily);

    setText("wHumid", "습도 " + (cur.relative_humidity_2m != null ? Math.round(cur.relative_humidity_2m) + "%" : "-"));
    setText("wRain", "강수확률 " + (rainProb != null ? Math.round(rainProb) + "%" : "-"));
    setText("wUpdated", "업데이트 " + hhmm());
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
      "&hourly=temperature_2m,weather_code,precipitation_probability,precipitation&" +
      "daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max," +
      "precipitation_sum,wind_speed_10m_max,apparent_temperature_max,apparent_temperature_min" +
      "&wind_speed_unit=ms&timezone=Asia%2FSeoul&forecast_days=5";
    var aUrl = "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=" + KIMPO.lat + "&longitude=" + KIMPO.lon +
      "&current=pm10,pm2_5&timezone=Asia%2FSeoul";

    var weatherP = fetchWithTimeout(wUrl, 9000).then(function (t) { return JSON.parse(t); });
    var airP = fetchWithTimeout(aUrl, 9000).then(function (t) { return JSON.parse(t); })
      .catch(function () { return null; });

    Promise.all([weatherP, airP]).then(function (res) {
      var data = {
        current: res[0].current || {},
        daily: res[0].daily || {},
        hourly: res[0].hourly || {},
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
   * 2-1. 삼성전자·SK하이닉스 시세 (날씨 카드 바로 위 · 오르면 빨강 / 내리면 파랑)
   *    · 네이버 금융·다음 금융이 가장 빠르지만, 브라우저에서는 그대로 부를 수
   *      없어(CORS 막음) 통로(프록시)를 거칩니다. 통로가 막혀도 화면이 비지 않게
   *      트레이딩뷰 공개 시세를 먼저 받습니다.
   *      (2026-11-19 브라우저에서 하나씩 받아 보고 되는 길만 넣었습니다)
   * ------------------------------------------------------------------ */
  var STOCKS = [
    { code: "005930", name: "삼성전자", tv: "KRX:005930", yahoo: "005930.KS" },
    { code: "000660", name: "SK하이닉스", tv: "KRX:000660", yahoo: "000660.KS" }
  ];
  var STOCK_CACHE = "mj_stocks_v1";
  var STOCK_TTL = 2 * 60 * 1000;   /* 2분마다 새 시세 */
  var stockLoading = false;
  var stockPrio = 99;              /* 작을수록 더 좋은 자료 (1 실시간, 2~3 지연) */

  function stockNumber(v) {
    if (v == null) return null;
    var s = String(v).trim();
    if (!s) return null;
    var n = Number(s.replace(/[^0-9.\-]/g, ""));
    return isFinite(n) ? n : null;
  }

  function fmtWon(n) {
    if (n == null || !isFinite(n)) return "--";
    return String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  /* 가격·등빽폭·등락률을 한 줄로 맞춥니다 (하나라도 비면 나머지로 계산) */
  function quoteOf(code, price, abs, pct) {
    if (price == null || price <= 0) return null;
    if (abs == null && pct != null && pct !== 0) {
      var prev = price / (1 + pct / 100);
      abs = Math.round(price - prev);
    }
    return { code: code, price: price, abs: abs == null ? 0 : Math.round(abs), pct: pct == null ? null : pct };
  }

  /* 네이버·다음은 CORS가 없어 통로를 거칩니다. 막힌 통로는 건너뜁니다. */
  var STOCK_PROXIES = [
    function (u) { return "https://api.cors.lol/?url=" + encodeURIComponent(u); },
    function (u) { return "https://api.allorigins.win/raw?url=" + encodeURIComponent(u); },
    function (u) { return "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(u); }
  ];
  function viaStockProxy(url, ms, limit) {
    var list = STOCK_PROXIES.slice(0, limit || STOCK_PROXIES.length);
    return list.reduce(function (chain, wrap) {
      return chain.catch(function () { return fetchWithTimeout(wrap(url), ms || 8000); });
    }, Promise.reject(new Error("start")));
  }

  function fetchTradingViewQuotes() {
    /* GET 한 번에 종목 하나 — 브라우저가 바로 부를 수 있는 유일한 길(2026-11-19 확인) */
    return Promise.all(STOCKS.map(function (s) {
      var api = "https://scanner.tradingview.com/symbol?symbol=" + encodeURIComponent(s.tv) +
        "&fields=close,change,change_abs";
      return fetchWithTimeout(api, 8000).then(function (txt) {
        var d = JSON.parse(txt);
        if (!d) throw new Error("tv empty");
        return quoteOf(s.code, stockNumber(d.close), stockNumber(d.change_abs), stockNumber(d.change));
      });
    })).then(function (rows) {
      rows = rows.filter(function (r) { return !!r; });
      if (rows.length !== STOCKS.length) throw new Error("tv partial");
      return { rows: rows, source: "트레이딩뷰", delayed: true, prio: 2 };
    });
  }

  function fetchNaverQuotes(limit) {
    var api = "https://polling.finance.naver.com/api/realtime/domestic/stock/" +
      STOCKS.map(function (s) { return s.code; }).join(",");
    return viaStockProxy(api, 8000, limit).then(function (txt) {
      var d = JSON.parse(txt);
      if (!d || !d.datas || !d.datas.length) throw new Error("naver empty");
      var rows = [];
      STOCKS.forEach(function (s) {
        var hit = null;
        d.datas.forEach(function (it) { if (it.itemCode === s.code) hit = it; });
        if (!hit) return;
        var dirName = hit.compareToPreviousPrice ? String(hit.compareToPreviousPrice.name) : "";
        var sign = /RISE|UPPER/.test(dirName) ? 1 : (/FALL|LOWER/.test(dirName) ? -1 : 0);
        var abs = stockNumber(hit.compareToPreviousClosePrice);
        var pct = stockNumber(hit.fluctuationsRatio);
        var row = quoteOf(s.code, stockNumber(hit.closePrice),
          abs == null ? null : abs * sign, pct == null ? null : pct * sign);
        if (row) rows.push(row);
      });
      if (rows.length !== STOCKS.length) throw new Error("naver partial");
      /* 장 시작 전(PREOPEN)의 네이버 자료는 전일 종가를 '보합 0%'로 보여 주어
         어제 오르고 내린 폭을 가립니다. 그래서 그때는 뒤 순서로 미룹니다. */
      var pre = String((d.datas[0] || {}).marketStatus || "") === "PREOPEN";
      return { rows: rows, source: "네이버 금융", delayed: false, prio: pre ? 4 : 1 };
    });
  }

  function fetchDaumQuotes() {
    return Promise.all(STOCKS.map(function (s) {
      return viaStockProxy("https://finance.daum.net/api/quotes/A" + s.code + "?summary=false", 8000)
        .then(function (txt) { return { s: s, d: JSON.parse(txt) }; });
    })).then(function (list) {
      var rows = [];
      list.forEach(function (o) {
        var d = o.d || {};
        var sign = /RISE|UPPER/.test(String(d.change)) ? 1 : (/FALL|LOWER/.test(String(d.change)) ? -1 : 0);
        var abs = stockNumber(d.changePrice);
        var pct = stockNumber(d.changeRate);
        var row = quoteOf(o.s.code, stockNumber(d.tradePrice),
          abs == null ? null : abs * sign, pct == null ? null : pct * sign);
        if (row) rows.push(row);
      });
      if (rows.length !== STOCKS.length) throw new Error("daum partial");
      return { rows: rows, source: "다음 금융", delayed: false, prio: 1 };
    });
  }

  function fetchYahooQuotes() {
    return Promise.all(STOCKS.map(function (s) {
      var api = "https://query1.finance.yahoo.com/v8/finance/chart/" + s.yahoo + "?interval=1d&range=1d";
      return viaStockProxy(api, 8000).then(function (txt) {
        var meta = JSON.parse(txt).chart.result[0].meta || {};
        var price = stockNumber(meta.regularMarketPrice);
        var prev = stockNumber(meta.chartPreviousClose != null ? meta.chartPreviousClose : meta.previousClose);
        var abs = (price != null && prev != null) ? price - prev : null;
        var pct = (abs != null && prev) ? (abs / prev) * 100 : null;
        return quoteOf(s.code, price, abs, pct);
      });
    })).then(function (rows) {
      rows = rows.filter(function (r) { return !!r; });
      if (rows.length !== STOCKS.length) throw new Error("yahoo partial");
      return { rows: rows, source: "야후 파이낸스", delayed: true, prio: 3 };
    });
  }

  function renderStocks(data) {
    if (!data || !data.rows || !data.rows.length) return;
    data.rows.forEach(function (r) {
      var row = document.getElementById("stock" + r.code);
      var priceNode = document.getElementById("price" + r.code);
      var changeNode = document.getElementById("change" + r.code);
      if (!row || !priceNode || !changeNode) return;
      var dir = r.abs > 0 ? "up" : (r.abs < 0 ? "down" : "even");
      row.setAttribute("data-dir", dir);
      priceNode.textContent = fmtWon(r.price);
      priceNode.appendChild(el("span", { class: "won", text: "원" }));
      changeNode.textContent = "";
      if (dir === "even") {
        changeNode.appendChild(el("span", { class: "s-pct", text: "보합 (0.00%)" }));
      } else {
        var sign = dir === "up" ? "+" : "-";
        changeNode.appendChild(el("span", {
          class: "s-diff",
          text: (dir === "up" ? "▲ " : "▼ ") + fmtWon(r.abs) + "원"
        }));
        if (r.pct != null) {
          changeNode.appendChild(el("span", {
            class: "s-pct",
            text: "(" + sign + Math.abs(r.pct).toFixed(2) + "%)"
          }));
        }
      }
    });
    setText("stockTime", "🕘 " + hhmm(data.ts || Date.now()) + " 기준 · " + data.source +
      (data.delayed ? " (장중 20분 지연)" : ""));
  }

  function acceptStock(data) {
    if (!data || !data.rows || !data.rows.length) return;
    if (data.prio >= stockPrio) return;
    stockPrio = data.prio;
    data.ts = Date.now();
    renderStocks(data);
    store(STOCK_CACHE, data);
  }

  function loadStocks(force) {
    var cached = store(STOCK_CACHE);
    if (cached && cached.rows) renderStocks(cached);
    if (!force && cached && cached.ts && Date.now() - cached.ts < STOCK_TTL) return;
    if (stockLoading) return;
    stockLoading = true;
    stockPrio = 99;

    function finish() {
      stockLoading = false;
      if (stockPrio === 99) {
        setText("stockTime", cached && cached.rows
          ? "지난번 시세를 보여드려요 · " + hhmm(cached.ts) + " 기준"
          : "⚠️ 지금은 시세를 못 받았어요. 잠시 뒤 ↻ 새로고침을 눌러 주세요.");
      }
    }

    /* 1) 트레이딩뷰: 브라우저에서 바로 받아지는 가장 확실한 길 */
    fetchTradingViewQuotes().then(acceptStock).catch(function () {
      /* 2) 막히면 통로를 거쳐 네이버 → 다음 → 야후 */
      return fetchNaverQuotes().then(acceptStock)
        .catch(function () { return fetchDaumQuotes().then(acceptStock); })
        .catch(function () { return fetchYahooQuotes().then(acceptStock); });
    }).then(function () {
      /* 3) 숫자가 보이는 동안, 실시간(네이버) 시세를 뒤에서 한 번 더 시도 */
      if (stockPrio > 1) return fetchNaverQuotes(1).then(acceptStock).catch(function () { /* 통로가 막혔으면 그대로 */ });
    }).then(finish, finish);
  }

  var stockRefreshBtn = $("#stockRefresh");
  if (stockRefreshBtn) stockRefreshBtn.addEventListener("click", function () {
    stockRefreshBtn.textContent = "불러오는 중…";
    loadStocks(true);
    setTimeout(function () { stockRefreshBtn.textContent = "↻ 새로고침"; }, 2500);
  });

  setInterval(function () {          /* 화면을 보고 있을 때 1분마다 확인, 2분 지났으면 새로 받기 */
    if (document.hidden) return;
    var c = store(STOCK_CACHE);
    if (!c || !c.ts || Date.now() - c.ts >= STOCK_TTL) loadStocks(false);
  }, 60 * 1000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) loadStocks(false); });

  /* ------------------------------------------------------------------ *
   * 3. 뉴스 (여러 언론사 RSS · 사진 있는 기사만 · 스포츠 제외 · 5분마다 새 속보)
   *    · SBS·매일경제·동아일보·한겨레·머니투데이·연합뉴스의 공개 RSS를 함께 씁니다.
   *    · 사진(썸네일)이 없는 기사는 목록에 넣지 않고, 사진이 깨진 카드도 지웁니다.
   *    · 발행 시각(pubDate) 내림차순으로 최신 속보부터 보여 주고,
   *      전체 탭은 사회(속보·사건사고·생활) 기사 위주로 채웁니다.
   * ------------------------------------------------------------------ */
  var YNA_RSS = "https://www.yna.co.kr/rss/";
  var MK_RSS = "https://www.mk.co.kr/rss/";
  var SBS_RSS = "https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=";

  var TABS = {
    all: { label: "전체", emoji: "📰", title: "오늘의 속보" },
    society: { label: "사회", emoji: "🏙️", title: "사회 뉴스" },
    economy: { label: "경제", emoji: "💰", title: "경제 뉴스" },
    politics: { label: "정치", emoji: "🏛️", title: "정치 뉴스" },
    usa: { label: "미국", emoji: "🇺🇸", title: "미국 주요 뉴스" },
    celeb: { label: "연예", emoji: "🎬", title: "연예 뉴스" }
  };

  /* 언론사별 공개 RSS (2026-11-19에 하나씩 받아 확인).
     - 사진이 함께 오는 곳: 연합뉴스·SBS·매일경제·동아일보·한겨레·머니투데이
     - 한국경제·경향신문 RSS에는 기사 사진이 아예 없고, 조선일보 사진 주소는
       다른 사이트에서 열면 막혀(403) 사진이 깨지므로 넣지 않았습니다. */
  var SOURCES = {
    yna: {
      name: "연합뉴스",
      feeds: {
        all: YNA_RSS + "news.xml", society: YNA_RSS + "society.xml", economy: YNA_RSS + "economy.xml",
        politics: YNA_RSS + "politics.xml", usa: YNA_RSS + "international.xml", celeb: YNA_RSS + "entertainment.xml"
      }
    },
    sbs: {
      name: "SBS",
      feeds: {
        society: SBS_RSS + "03&plink=RSSREADER", economy: SBS_RSS + "02&plink=RSSREADER",
        politics: SBS_RSS + "01&plink=RSSREADER", usa: SBS_RSS + "07&plink=RSSREADER",
        celeb: SBS_RSS + "14&plink=RSSREADER"
      }
    },
    mk: {
      name: "매일경제",
      feeds: {
        all: MK_RSS + "40300001/", society: MK_RSS + "50400012/", economy: MK_RSS + "30100041/",
        politics: MK_RSS + "30200030/", usa: MK_RSS + "30300018/", celeb: MK_RSS + "30000023/"
      }
    },
    donga: {
      name: "동아일보",
      feeds: {
        all: "https://rss.donga.com/total.xml", society: "https://rss.donga.com/national.xml",
        economy: "https://rss.donga.com/economy.xml", politics: "https://rss.donga.com/politics.xml",
        usa: "https://rss.donga.com/international.xml", celeb: "https://rss.donga.com/entertainment.xml"
      }
    },
    hani: {
      name: "한겨레",
      feeds: {
        society: "https://www.hani.co.kr/rss/society", economy: "https://www.hani.co.kr/rss/economy",
        politics: "https://www.hani.co.kr/rss/politics", usa: "https://www.hani.co.kr/rss/international"
      }
    },
    mt: {
      name: "머니투데이",
      feeds: { all: "https://rss.mt.co.kr/mt_news.xml" }
    }
  };

  /* 탭마다 3~4개 언론사를 섞습니다 (한 번에 너무 많이 받지 않게). */
  var TAB_FEEDS = {
    /* 전체 탭은 사회(속보·사건사고·생활) 기사를 넉넉히 받아 사회 위주로 보여 줍니다. */
    all: [["yna", "society"], ["sbs", "society"], ["donga", "society"], ["yna", "all"], ["mt", "all"]],
    society: [["yna", "society"], ["sbs", "society"], ["donga", "society"], ["hani", "society"]],
    economy: [["yna", "economy"], ["mk", "economy"], ["sbs", "economy"], ["hani", "economy"]],
    politics: [["yna", "politics"], ["sbs", "politics"], ["donga", "politics"], ["hani", "politics"]],
    usa: [["yna", "usa"], ["sbs", "usa"], ["donga", "usa"]],
    celeb: [["yna", "celeb"], ["sbs", "celeb"], ["mk", "celeb"], ["donga", "celeb"]]
  };

  var NEWS_TTL = 5 * 60 * 1000;        /* 5분마다 새 속보 */
  var RESUME_TTL = 3 * 60 * 1000;      /* 화면으로 돌아오면 3분 지났을 때 바로 */
  var FRESH_LIMIT = 75 * 60 * 1000;    /* 75분 넘게 묵은 응답은 '서버 캐시'로 보고 한 번 더 시도 */
  var PAGE = 12;
  var MAX_ITEMS = 60;
  var NEWS_KEY = "mj_feed_v7_";
  var state = { tab: "all", items: [], shown: PAGE, note: null, reqId: 0, lastFetch: 0 };

  function feedCacheKey(src, feed) { return NEWS_KEY + src + "_" + feed; }

  /* 탭에 필요한 피드 중 가장 오래된(또는 아직 못 받은) 것의 시각 — 5분마다 새로 받을 때 씁니다. */
  function oldestFeedTs(tab) {
    var feeds = TAB_FEEDS[tab] || [];
    var min = 0;
    feeds.forEach(function (f) {
      var c = store(feedCacheKey(f[0], f[1]));
      var ts = c && c.items && c.items.length ? (c.ts || 0) : 0;
      if (!min || ts < min) min = ts;
    });
    return min;
  }

  /* --- 스포츠 기사 거르기 --------------------------------------------- */
  /* 연합뉴스 기사 주소 끝 4자리가 분야 코드입니다. 0007·1007 이 스포츠입니다. */
  var SPORTS_CODES = { "0007": 1, "1007": 1, "2007": 1 };
  var SPORTS_WORDS = [
    "야구", "축구", "농구", "배구", "골프", "올림픽", "패럴림픽", "월드컵", "K리그", "KBO", "MLB", "NBA", "EPL",
    "챔피언스리그", "프로야구", "프로농구", "프로배구", "프로축구", "홈런", "타율", "타점", "선발승", "완투", "세이브",
    "리그", "구단", "코치", "선수단", "선수", "우승", "준우승", "결승", "4강", "8강", "16강", "토너먼트",
    "경기장", "구장", "야구장", "축구장", "배드민턴", "탁구", "테니스", "수영", "양궁", "펜싱", "유도", "태권도",
    "역도", "마라톤", "스케이팅", "피겨", "쇼트트랙", "컬링", "핸드볼", "럭비", "볼링", "당구", "체조", "사격",
    "경마", "씨름", "승마", "대회 우승", "손흥민", "이강인", "김민재", "김하성", "이정후", "류현진", "홈런왕"
  ];

  /* --- 미국 관련 기사인지 ---------------------------------------------- */
  var US_WORDS = [
    "미국", "美", "워싱턴", "백악관", "트럼프", "바이든", "해리스", "연준", "월가", "월스트리트", "뉴욕",
    "나스닥", "다우", "실리콘밸리", "하원", "상원", "민주당", "공화당", "국무부", "펜타곤", "연방", "캘리포니아",
    "텍사스", "플로리다", "시카고", "보스턴", "로스앤젤레스", "LA", "관세", "달러", "USTR", "미중", "한미",
    "주미", "미국인", "뉴저지", "워싱턴포스트", "뉴욕타임스", "매그니피센트7", "엔비디아", "마이크로소프트",
    "테슬라", "애플", "아마존", "구글", "메타", "오픈AI", "월러", "파월", "JP모건", "골드만", "하원의장",
    "중간선거", "미시간", "오하이오", "조지아주", "애리조나", "네바다", "펜실베이니아", "일론 머스크", "머스크"
  ];

  /* 설명글에서만 확인할 때 쓰는 확실한 미국 표지 */
  var US_STRONG_WORDS = ["미국", "美", "워싱턴", "백악관", "트럼프", "연준", "뉴욕", "월가", "하원", "상원"];

  /* --- 미국이 아닌 다른 나라 기사(전체 탭에서 줄임) --------------------- */
  var FOREIGN_WORDS = [
    "일본", "중국", "러시아", "우크라이나", "이란", "이스라엘", "가자", "팔레스타인", "유럽", "프랑스",
    "독일", "영국", "이탈리아", "스페인", "인도", "파키스탄", "브라질", "멕시코", "캐나다", "호주",
    "뉴질랜드", "대만", "홍콩", "태국", "베트남", "필리핀", "인도네시아", "말레이시아", "싱가포르", "미얀마",
    "캄보디아", "북한", "중동", "사우디", "이집트", "튀르키예", "터키", "그리스", "폴란드", "네덜란드",
    "스웨덴", "노르웨이", "핀란드", "덴마크", "스위스", "오스트리아", "벨기에", "포르투갈", "아르헨티나",
    "칠레", "콜롬비아", "페루", "남아공", "나이지리아", "케냐", "교황", "바티칸", "아프가니스탄", "시리아",
    "이라크", "레바논", "예멘", "카타르", "쿠웨이트", "쿠바", "베네수엘라", "하마스", "헤즈볼라", "나토",
    "EU", "유엔", "도쿄", "베이징", "상하이", "모스크바", "파리", "베를린", "런던", "키이우", "가자지구",
    "푸틴", "시진핑", "젤렌스키", "네타냐후", "마크롱", "다카이치", "크렘린", "트뤼도", "이시바", "모디",
    "에르도안", "오르반", "하토야마", "아세안", "동남아", "IAEA", "영변", "평양"
  ];

  function titleOf(it) { return (it && it.title) || ""; }
  function textOf(it) { return titleOf(it) + " " + ((it && it.desc) || ""); }

  function codeOf(item) {
    var m = /([A-Za-z0-9]{4})$/.exec((item && item.link) || "");
    return m ? m[1] : "";
  }

  function hasWord(text, words) {
    for (var i = 0; i < words.length; i++) {
      if (text.indexOf(words[i]) >= 0) return true;
    }
    return false;
  }

  function isSports(item) {
    if (SPORTS_CODES[codeOf(item)]) return true;
    return hasWord(titleOf(item), SPORTS_WORDS);
  }

  function isUS(item) {
    var t = titleOf(item);
    if (hasWord(t, US_WORDS)) return true;
    /* 제목에 없으면 설명까지 살펴봅니다(미국 기사만 놓치지 않게) */
    return hasWord((item.desc || "").slice(0, 120), US_STRONG_WORDS) && !hasWord(t, FOREIGN_WORDS);
  }

  /* 한자로 쓴 나라 이름(中·日)은 낱말로 쓰였을 때만 봅니다 */
  function hasHanjaCountry(t) { return /[中北日]/.test(t); }

  function isForeignOnly(item) {
    var t = titleOf(item);
    if (hasWord(t, US_WORDS)) return false;
    return hasWord(t, FOREIGN_WORDS) || hasHanjaCountry(t);
  }

  /* 탭에 맞게 기사 거르기: 사진 없는 기사·스포츠는 어디에도 안 나옵니다. */
  var NOTICE_RE = /^\s*\[(알림|안내|게시판|정정)/;

  function shapeFor(tab, items) {
    return items.filter(function (it) {
      if (!it.title || !it.link) return false;
      if (!it.img) return false;                    /* 사진 없는 기사는 빼기 */
      if (NOTICE_RE.test(titleOf(it))) return false; /* 공지·사설 기사는 빼고 */
      if (isSports(it)) return false;
      if (tab === "usa") return isUS(it);
      if (tab === "all") return !isForeignOnly(it);
      return true;
    });
  }

  /* --- RSS 읽기 -------------------------------------------------------- */
  function parseTime(s) {
    if (!s) return null;
    var t = Date.parse(String(s).trim());
    return isNaN(t) ? null : t;
  }

  function firstImage(html) {
    if (!html) return "";
    var m = /<img[^>]+src\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i.exec(html);
    if (!m) return "";
    return m[1] || m[2] || m[3] || "";
  }

  function decodeText(s) {
    var div = document.createElement("div");
    div.innerHTML = s;
    return div.textContent || "";
  }

  /* &amp;#039; 처럼 두 번 감싸인 글자도 풀어서 보여줍니다 */
  function clean(s) {
    if (!s) return "";
    var t = String(s);
    for (var i = 0; i < 3 && /&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/.test(t); i++) {
      var next = decodeText(t);
      if (next === t) break;
      t = next;
    }
    t = t.replace(/\s+/g, " ").trim();
    return t.length > 160 ? t.slice(0, 158) + "…" : t;
  }

  function fixImg(url) {
    var u = String(url || "").trim();
    if (!u) return "";
    if (u.indexOf("//") === 0) u = "https:" + u;
    if (!/^https?:/i.test(u)) return "";
    return u;
  }

  function makeItem(title, link, img, desc, source, date, pos, now, cat) {
    return {
      title: clean(title),
      link: String(link || "").trim(),
      img: fixImg(img),
      desc: clean(desc).slice(0, 120),
      source: source,
      cat: cat || "",
      date: date || null,
      rank: date || 0
    };
  }

  function parseXmlFeed(text, source, cat) {
    var doc = new DOMParser().parseFromString(text, "text/xml");
    if (doc.getElementsByTagName("parsererror").length) throw new Error("xml parse error");
    var nodes = Array.prototype.slice.call(doc.getElementsByTagName("item"));
    if (!nodes.length) throw new Error("empty feed");
    var now = Date.now();
    /* 한겨레 RSS처럼 기사마다 시각이 없으면 채널의 만든 시각(lastBuildDate)을 씁니다. */
    var buildNode = doc.getElementsByTagName("lastBuildDate")[0];
    var buildDate = buildNode ? parseTime(buildNode.textContent) : null;
    return nodes.map(function (n, idx) {
      function txt(tag) {
        var t = n.getElementsByTagName(tag)[0];
        return t ? (t.textContent || "").trim() : "";
      }
      var media = n.getElementsByTagName("media:content")[0] || n.getElementsByTagName("media:thumbnail")[0];
      var encl = n.getElementsByTagName("enclosure")[0];
      var img = (media && (media.getAttribute("url") || "")) || (encl && (encl.getAttribute("url") || "")) || "";
      var desc = txt("description");
      if (!img) img = firstImage(desc);
      var date = parseTime(txt("pubDate")) || parseTime(txt("dc:date")) || parseTime(txt("date"));
      if (!date && buildDate) date = buildDate - idx * 2 * 60 * 1000;   /* 목록 순서대로 조금씩 앞당김이 */
      return makeItem(txt("title"), txt("link"), img, desc, source, date, idx, now, cat);
    });
  }

  function parseRss2Json(text, source, cat) {
    var d = JSON.parse(text);
    if (!d || d.status !== "ok" || !d.items) throw new Error(d && d.message ? d.message : "empty");
    var now = Date.now();
    return d.items.map(function (it, idx) {
      var img = (it.thumbnail || "") || (it.enclosure && it.enclosure.link) || "";
      var desc = it.description || it.content || "";
      if (!img) img = firstImage(desc);
      /* rss2json 은 시각을 세계표준시(UTC) 형식으로 줍니다 */
      var stamp = it.pubDate ? new Date(String(it.pubDate).replace(" ", "T") + "Z") : null;
      var date = stamp && !isNaN(stamp.getTime()) ? stamp.getTime() : null;
      return makeItem(it.title, it.link, img, desc, source, date, idx, now, cat);
    });
  }

  /* 여러 통로에 차례로 물어봅니다.
     - rss2json이 가끔 몇 시간 전에 받아 둔 것을 돌려줘서, 그럴 때는 새 표시(sb=)를
       붙여 한 번 더 요청합니다. 그래도 모두 낡았을 때만 다른 중계 서버를 씁니다. */
  function fetchFeed(url, source, opts) {
    opts = opts || {};
    var cat = opts.cat || "";
    var knownNewest = opts.knownNewest || 0;
    function bustOf(salt) {
      return url + (url.indexOf("?") >= 0 ? "&" : "?") + "sb=" + (Date.now() + salt);
    }
    var firstEnc = encodeURIComponent(bustOf(0));
    var secondEnc = encodeURIComponent(bustOf(2711));
    var thirdEnc = encodeURIComponent(bustOf(5323));
    var providers = [
      function () {
        return fetchWithTimeout("https://api.rss2json.com/v1/api.json?rss_url=" + firstEnc + "&count=50", 8000)
          .then(function (text) { return parseRss2Json(text, source, cat); });
      },
      function () {
        return fetchWithTimeout("https://api.rss2json.com/v1/api.json?rss_url=" + secondEnc + "&count=50", 8000)
          .then(function (text) { return parseRss2Json(text, source, cat); });
      },
      function () {
        return fetchWithTimeout("https://api.allorigins.win/raw?url=" + thirdEnc, 7000)
          .then(function (text) { return parseXmlFeed(text, source, cat); });
      },
      function () {
        return fetchWithTimeout("https://api.codetabs.com/v1/proxy?quest=" + thirdEnc, 7000)
          .then(function (text) { return parseXmlFeed(text, source, cat); });
      },
      function () {
        return fetchWithTimeout("https://api.cors.lol/?url=" + thirdEnc, 7000)
          .then(function (text) { return parseXmlFeed(text, source, cat); });
      }
    ];
    var stale = null;
    function attempt(i) {
      if (i >= providers.length) {
        return stale ? Promise.resolve(stale) : Promise.reject(new Error("all providers failed"));
      }
      return providers[i]().then(function (items) {
        if (!items || !items.length) return null;
        var newest = 0;
        items.forEach(function (it) { if (it.date && it.date > newest) newest = it.date; });
        var tooOld = newest && Date.now() - newest > FRESH_LIMIT && (!knownNewest || newest < knownNewest);
        if (tooOld) {
          if (!stale || newest > staleNewest) { stale = items; staleNewest = newest; }
          return null;
        }
        return items;
      }).catch(function () { return null; }).then(function (got) {
        if (got) return got;
        /* 받아 둔 낡은 기사가 있으면 중계 서버가 죽었는지 오래 기다리지 않고 그걸 씁니다. */
        if (stale && i >= 1) return stale;
        return attempt(i + 1);
      });
    }
    var staleNewest = 0;
    return attempt(0);
  }

  /* 한 번에 너무 많이 받지 않게 두 개씩만 받아 옵니다. */
  function runQueue(items, limit, worker) {
    var i = 0;
    function next() {
      if (i >= items.length) return Promise.resolve();
      var item = items[i++];
      return Promise.resolve(worker(item)).catch(function () { }).then(next);
    }
    var chains = [];
    for (var n = 0; n < Math.min(limit, items.length); n++) chains.push(next());
    return Promise.all(chains);
  }

  /* --- 모아 둔 기사 읽기 ------------------------------------------------ */
  function readCaches(tab) {
    var feeds = TAB_FEEDS[tab] || [];
    var out = [];
    feeds.forEach(function (f) {
      var c = store(feedCacheKey(f[0], f[1]));
      if (c && c.items && c.items.length) out.push({ key: f[0] + "_" + f[1], ts: c.ts || 0, items: c.items });
    });
    if (tab === "usa") {
      /* 미국 기사가 적을 때: 전체 탭에서 받아 둔 기사에서도 골라 옵니다 */
      [["yna", "all"], ["mt", "all"]].forEach(function (f) {
        var key = f[0] + "_" + f[1];
        if (out.some(function (o) { return o.key === key; })) return;
        var c = store(feedCacheKey(f[0], f[1]));
        if (!c || !c.items || !c.items.length) return;
        /* 전체 뉴스에서 가져올 때는 제목에 미국 얘기가 있는 기사만 (엉뚱한 기사 방지) */
        var only = c.items.filter(function (it) { return hasWord(titleOf(it), US_WORDS); });
        if (only.length) out.push({ key: key, ts: c.ts || 0, items: only });
      });
    }
    return out;
  }

  /* --- 전체 탭: 사회 기사 위주로 --------------------------------------- */
  /* 사회면·속보·사건사고·생활 기사에 자주 나오는 낱말 (다른 분야 기사와 가릴 때만 씀) */
  var SOCIETY_WORDS = [
    "경찰", "검찰", "법원", "재판", "판결", "선고", "구속", "영장", "기소", "법정", "고소", "고발",
    "사건", "사고", "화재", "폭발", "붕괴", "추락", "전복", "충돌", "실종", "구조", "숨져", "숨진",
    "사망", "부상", "중상", "위독", "폭행", "성폭행", "성범죄", "마약", "음주", "만취", "뺑소니",
    "교통사고", "지하철", "버스", "시내버스", "병원", "응급실", "의료진", "간호", "학교", "학생",
    "교사", "교권", "교육청", "수능", "입시", "학원", "아동", "청소년", "노인", "복지", "장애",
    "아파트", "전세", "월세", "임대", "소방", "119", "112", "산불", "태풍", "폭우", "한파", "폭설",
    "지진", "실업", "구직", "노숙", "기부", "봉사", "시민", "유기견", "절도", "강도", "사기", "도박",
    "보이스피싱", "스토킹", "데이트폭력", "가정폭력", "아동학대", "음주운전", "적발", "단속", "체포",
    "피해자", "가해자", "유족", "시신", "사망자", "부상자", "누출", "가스", "정전", "단수",
    "집회", "시위", "징계", "해임", "파면", "퇴출"
  ];

  /* 사회 기사인지: 사회 피드에서 온 기사이거나, 제목에 사회 낱말이 있는 기사 */
  function isSocietyNews(it) {
    if (!it) return false;
    if (it.cat === "society") return true;
    return hasWord(titleOf(it), SOCIETY_WORDS);
  }

  function latestFirst(a, b) {
    return (b.date || b.rank || 0) - (a.date || a.rank || 0);
  }

  /* 최신순 그대로 보되, 사회 기사 3건마다 다른 분야 1건만 섞습니다(전체 탭). */
  function societyFirst(items, limit) {
    var social = [];
    var others = [];
    items.forEach(function (it) { (isSocietyNews(it) ? social : others).push(it); });
    social.sort(latestFirst);
    others.sort(latestFirst);
    var out = [];
    var s = 0;
    var o = 0;
    while (out.length < limit && (s < social.length || o < others.length)) {
      var took = 0;
      while (took < 3 && s < social.length && out.length < limit) {
        out.push(social[s++]);
        took += 1;
      }
      if (o < others.length && out.length < limit) out.push(others[o++]);
      else if (s >= social.length) {
        while (o < others.length && out.length < limit) out.push(others[o++]);
      }
    }
    return out;
  }

  function mergeForTab(tab, list) {
    var all = [];
    var seen = {};
    list.forEach(function (entry) {
      entry.items.forEach(function (it) {
        if (!it || !it.title || !it.link) return;
        var key = String(it.link).split("?")[0] + "|" + String(it.title).slice(0, 24);
        if (seen[key]) return;
        seen[key] = 1;
        all.push(it);
      });
    });
    var shaped = shapeFor(tab, all);
    if (tab === "all") return societyFirst(shaped, MAX_ITEMS);
    /* 나머지 탭도 모든 기사를 발행 시각 내림차순(최신 속보 먼저)으로 */
    return shaped.sort(latestFirst).slice(0, MAX_ITEMS);
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

  /* 작은 썸네일 (제목 옆) — 사진이 깨지면 카드째로 지웁니다 */
  function thumbNode(item, card) {
    var fig = el("figure", { class: "thumb" });
    var img = el("img", { alt: "", loading: "lazy", decoding: "async" });
    img.addEventListener("error", function () {
      var target = card || (img.closest && img.closest(".news-card"));
      if (target && target.parentNode) target.parentNode.removeChild(target);
    });
    img.addEventListener("load", function () { fig.classList.add("loaded"); });
    img.src = item.img;
    fig.appendChild(img);
    return fig;
  }

  /* 제목이 속보·긴급으로 시작하면 눈에 띄게 */
  function isBreaking(item) {
    return /^\s*[\[【(]?\s*(속보|긴급|단독)/.test(titleOf(item));
  }

  function newsCard(item, tab) {
    var info = TABS[tab] || TABS.all;
    var card = el("article", { class: "news-card" + (isBreaking(item) ? " breaking" : "") });
    var a = el("a", { href: item.link, target: "_blank", rel: "noopener noreferrer" });
    var when = timeAgo(item.date);
    var meta = el("div", { class: "news-meta" }, [
      el("span", { class: "src", text: item.source || "" }),
      when ? el("span", { class: "dot", text: "·" }) : null,
      when ? el("span", { text: when }) : null,
      el("span", { class: "open-hint", text: "기사 보기 ▶" })
    ]);
    a.appendChild(el("div", { class: "news-body" }, [
      el("span", { class: "badge", dataset: { cat: info.label }, text: info.label }),
      isBreaking(item) ? el("span", { class: "badge breaking-tag", text: "속보" }) : null,
      el("h3", { class: "news-title", text: item.title }),
      meta
    ]));
    a.appendChild(thumbNode(item, card));
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
        el("div", { class: "sk-body" }, [
          el("div", { class: "sk-line" }),
          el("div", { class: "sk-line short" })
        ]),
        el("div", { class: "sk-img" })
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
    setText("newsAuto", "🔄 5분마다 새 속보" + (state.lastFetch ? " · " + hhmm(state.lastFetch) + " 업데이트" : ""));

    items.slice(0, state.shown).forEach(function (item) {
      list.appendChild(newsCard(item, state.tab));
    });

    if (state.note) {
      list.insertBefore(el("div", { class: "offline-note", text: state.note }), list.firstChild);
    }

    if (!items.length && !state.note) {
      list.appendChild(el("div", { class: "status-box" }, [
        el("span", { class: "big-emoji", text: "📰" }),
        el("p", { text: "사진이 있는 새 기사를 찾는 중이에요" }),
        el("p", { class: "sub", text: "잠시 뒤 ↻ 새로고침을 눌러 주세요." })
      ]));
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

  function loadNews(tab, force, maxAge) {
    var cfg = TABS[tab];
    if (!cfg) return;
    var sameTab = state.tab === tab;
    state.tab = tab;
    var reqId = ++state.reqId;
    var feeds = TAB_FEEDS[tab] || [];
    var now = Date.now();
    var age = force ? 0 : (maxAge || NEWS_TTL);

    /* 자동 새로고침 때는 '기사 더 보기'로 펼쳐 둔 만큼 그대로 둡니다. */
    if (!sameTab || !state.shown || state.shown < PAGE) state.shown = PAGE;

    function show() {
      var cached = readCaches(tab);
      state.items = cached.length ? mergeForTab(tab, cached) : [];
      state.lastFetch = cached.length ? Math.max.apply(null, cached.map(function (c) { return c.ts; })) : 0;
      state.note = null;
      renderNews();
      return cached;
    }

    var cachedNow = show();
    if (!cachedNow.length) renderSkeleton(tab);

    var due = feeds.filter(function (f) {
      var c = store(feedCacheKey(f[0], f[1]));
      return !c || !c.items || !c.items.length || (now - (c.ts || 0) > age);
    });
    if (!due.length) return;
    state.lastTry = now;

    var got = 0;
    runQueue(due, 3, function (f) {
      var url = SOURCES[f[0]].feeds[f[1]];
      var srcName = SOURCES[f[0]].name;
      var prev = store(feedCacheKey(f[0], f[1]));
      var knownNewest = 0;
      if (prev && prev.items) {
        prev.items.forEach(function (it) { if (it.date && it.date > knownNewest) knownNewest = it.date; });
      }
      return fetchFeed(url, srcName, { cat: f[1], knownNewest: knownNewest }).then(function (items) {
        store(feedCacheKey(f[0], f[1]), { ts: Date.now(), items: items.slice(0, 40) });
        got += 1;
        if (reqId === state.reqId) show();   /* 먼저 온 언론사 기사부터 바로 보여주기 */
      });
    }).then(function () {
      if (reqId !== state.reqId) return;
      if (got) {
        show();
        return;
      }
      var old = readCaches(tab);
      if (old.length) {
        show();
        state.note = "📡 새 뉴스를 받지 못해 지난번에 받아둔 기사를 보여드려요.";
        renderNews();
        return;
      }
      renderNewsError("잠시 뒤 ‘다시 불러오기’를 눌러 주세요.", SECTION_LINKS[tab]);
    });
  }

  var SECTION_LINKS = {
    all: { url: "https://news.naver.com/", label: "네이버 뉴스에서 보기" },
    society: { url: "https://news.naver.com/section/102", label: "네이버 사회면에서 보기" },
    economy: { url: "https://news.naver.com/section/101", label: "네이버 경제면에서 보기" },
    politics: { url: "https://news.naver.com/section/100", label: "네이버 정치면에서 보기" },
    usa: { url: "https://news.naver.com/section/104", label: "네이버 세계면에서 보기" },
    celeb: { url: "https://news.naver.com/section/106", label: "네이버 연예면에서 보기" }
  };

  /* 1시간마다 자동으로 새 뉴스 받기 */
  /* 5분마다, 그리고 화면으로 돌아왔 때 ​3분이 지났으면 바로 새 속보 받기 */
  function refreshIfStale(minAge) {
    if (document.hidden) return;
    if (state.tab === "recipe") return; /* 요리 화면에서는 뉴스를 받지 않음 */
    var gap = minAge || NEWS_TTL;
    var last = oldestFeedTs(state.tab) || state.lastFetch || 0;
    if (Date.now() - last < gap) return;
    if (Date.now() - (state.lastTry || 0) < 45 * 1000) return; /* 막혔을 때 45초에 한 번만 */
    loadNews(state.tab, false, gap);
  }
  setInterval(function () { refreshIfStale(NEWS_TTL); }, 60 * 1000);          /* 1분마다 확인, 5분 지났으면 새로 */
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) refreshIfStale(RESUME_TTL);                      /* 앱으로 돌아왔을 때 */
  });
  window.addEventListener("focus", function () { refreshIfStale(RESUME_TTL); });

  /* 탭 */
  var newsRefreshBtn = $("#newsRefresh");
  if (newsRefreshBtn) newsRefreshBtn.addEventListener("click", function () {
    newsRefreshBtn.textContent = "불러오는 중…";
    loadNews(state.tab, true);
    setTimeout(function () { newsRefreshBtn.textContent = "↻ 새로고침"; }, 2200);
  });

  /* 고정 헤더(.sticky-top) 높이만큼 빼고 그 구역 맨 위로 스크롤
     — 탭을 눌렀을 때 맨 위(y=0)가 아니라 '오늘의 뉴스'(또는 요리) 시작 부분으로,
       제목과 첫 기사가 헤더에 가리지 않게 */
  var scrollWatchTimer = null;
  function stopScrollWatch() {
    if (scrollWatchTimer === null) return;
    clearTimeout(scrollWatchTimer.delay);
    clearInterval(scrollWatchTimer.tick);
    scrollWatchTimer.events.forEach(function (t) { window.removeEventListener(t, stopScrollWatch); });
    scrollWatchTimer = null;
  }
  function scrollToSection(el) {
    if (!el) return;
    var sticky = document.querySelector(".sticky-top");
    function wantTop() {
      var offset = (sticky ? sticky.offsetHeight : 0) + 8;
      var top = el.getBoundingClientRect().top +
        (window.pageYOffset || document.documentElement.scrollTop || 0) - offset;
      return top < 0 ? 0 : top;
    }
    function nowY() { return window.pageYOffset || document.documentElement.scrollTop || 0; }
    function place(behavior) {
      var top = wantTop();
      try { window.scrollTo({ top: top, behavior: behavior }); } catch (e) { window.scrollTo(0, top); }
    }
    stopScrollWatch();
    place("smooth");
    /* 기사 목록·사진이 늦게 자리 잡으면 위쪽 높이가 바뀌어 제목이 헤더에 가려지거나
       떨어질 수 있음 → 잠깐(1.8초) 동안 한 번씩 다시 맞춤.
       그 사이 사용자가 손으로 스크롤하면 바로 그만둠. */
    var stop = ["touchstart", "wheel", "keydown"];
    scrollWatchTimer = { delay: null, tick: null, events: stop };
    stop.forEach(function (t) { window.addEventListener(t, stopScrollWatch, { passive: true }); });
    scrollWatchTimer.delay = setTimeout(function () {
      if (!scrollWatchTimer) return;
      scrollWatchTimer.tick = setInterval(function () {
        if (Math.abs(nowY() - wantTop()) > 2) place("auto");
      }, 250);
      setTimeout(stopScrollWatch, 1400);
    }, 400);
  }

  $$("#tabs button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var tab = btn.dataset.tab;
      $$("#tabs button").forEach(function (b) { b.setAttribute("aria-selected", String(b === btn)); });
      var newsPanel = $("#newsPanel");
      var recipePanel = $("#recipePanel");
      var weatherCard = $("#weatherCard");
      var stockCard = $("#stockCard");
      var ytBanner = $("#ytBanner");
      var rhinoPanel = $("#rhinoPanel");
      if (tab === "recipe") {
        if (newsPanel) newsPanel.hidden = true;
        if (recipePanel) recipePanel.hidden = false;
        if (weatherCard) weatherCard.hidden = true;
        if (stockCard) stockCard.hidden = true;
        if (ytBanner) ytBanner.hidden = true;
        if (rhinoPanel) rhinoPanel.hidden = true;
        renderVideos();
        loadCookFeeds(false);
      } else {
        if (recipePanel) recipePanel.hidden = true;
        if (newsPanel) newsPanel.hidden = false;
        if (weatherCard) weatherCard.hidden = false;
        if (stockCard) stockCard.hidden = false;
        if (ytBanner) ytBanner.hidden = false;
        if (rhinoPanel) rhinoPanel.hidden = false;
        renderRhino();
        loadNews(tab, false);
      }
      /* 화면을 먼저 바꾼 뒤 그 구역 위치를 재서 그쪽으로 내려가기 */
      var target = (tab === "recipe") ? recipePanel : newsPanel;
      if (window.requestAnimationFrame) {
        requestAnimationFrame(function () { scrollToSection(target); });
      } else {
        scrollToSection(target);
      }
    });
  });

  /* ------------------------------------------------------------------ *
   * 4. 코뿔소 TV (유튜브 바로가기 배너 바로 아래 · 새 영상 1시간마다)
   *    · 채널: 코뿔소TV 서울김포영광교회 (RhinoTV) @RhinoTV0691
   *    · channel_id: UC2Brddysh5qpf3zD2wrTbRg
   *      (2026-11-19 채널 페이지·공개 RSS로 확인: 구독자 18.4만, 본채널, 김포)
   * ------------------------------------------------------------------ */
  var RHINO = window.RHINO || null;
  var RHINO_KEY = "mj_rhino_v1";
  var RHINO_TTL = 60 * 60 * 1000;   /* 1시간마다 새 영상 확인 */

  function parseYouTubeFeed(text) {
    var doc = new DOMParser().parseFromString(text, "text/xml");
    if (doc.getElementsByTagName("parsererror").length) throw new Error("xml");
    var nodes = Array.prototype.slice.call(doc.getElementsByTagName("entry"));
    if (!nodes.length) throw new Error("empty feed");
    return nodes.map(function (n) {
      function txt(tag) {
        var t = n.getElementsByTagName(tag)[0];
        return t ? (t.textContent || "").trim() : "";
      }
      var id = txt("yt:videoId") || txt("id").replace("yt:video:", "");
      var stamp = Date.parse(txt("published"));
      return { id: id, title: clean(txt("title")), pub: isNaN(stamp) ? 0 : stamp };
    }).filter(function (v) { return v.id && v.title; });
  }

  function parseYouTubeJson(text) {
    var d = JSON.parse(text);
    if (!d || d.status !== "ok" || !d.items) throw new Error("empty");
    return d.items.map(function (it) {
      var m = /(?:v=|youtu\.be\/|\/shorts\/)([\w-]{11})/.exec(it.link || "");
      var stamp = it.pubDate ? new Date(String(it.pubDate).replace(" ", "T") + "Z") : null;
      return {
        id: m ? m[1] : "",
        title: clean(it.title),
        pub: stamp && !isNaN(stamp.getTime()) ? stamp.getTime() : 0
      };
    }).filter(function (v) { return v.id && v.title; });
  }

  function fetchYouTube(chId) {
    var feed = "https://www.youtube.com/feeds/videos.xml?channel_id=" + chId;
    var enc = encodeURIComponent(feed);
    var providers = [
      function () {
        return fetchWithTimeout("https://api.rss2json.com/v1/api.json?rss_url=" + enc + "&count=15", 9000)
          .then(parseYouTubeJson);
      },
      function () { return fetchWithTimeout("https://api.allorigins.win/raw?url=" + enc, 9000).then(parseYouTubeFeed); },
      function () { return fetchWithTimeout("https://api.codetabs.com/v1/proxy?quest=" + enc, 9000).then(parseYouTubeFeed); },
      function () { return fetchWithTimeout("https://api.cors.lol/?url=" + enc, 9000).then(parseYouTubeFeed); }
    ];
    return new Promise(function (resolve, reject) {
      var settled = false;
      var fails = 0;
      providers.forEach(function (run) {
        run().then(function (items) {
          if (settled) return;
          if (!items || !items.length) throw new Error("empty feed");
          settled = true;
          resolve(items);
        }).catch(function () {
          fails += 1;
          if (!settled && fails === providers.length) reject(new Error("feed failed"));
        });
      });
    });
  }

  function rhinoData() {
    var c = store(RHINO_KEY);
    if (c && c.items && c.items.length) return c;
    if (RHINO && RHINO.videos && RHINO.videos.length) return { ts: 0, items: RHINO.videos };
    return null;
  }

  function rhinoCard(v) {
    var card = el("a", {
      class: "rhino-card",
      href: "https://www.youtube.com/watch?v=" + v.id,
      target: "_blank",
      rel: "noopener noreferrer",
      "aria-label": cookTitle(v.title) + " (새 창에서 유튜브로 보기)"
    });
    var fig = el("figure", { class: "r-thumb" });
    var img = el("img", {
      alt: "", loading: "lazy", decoding: "async",
      src: "https://i.ytimg.com/vi/" + v.id + "/hqdefault.jpg"
    });
    youtubeThumb(v, img, fig);
    fig.appendChild(img);
    fig.appendChild(el("span", { class: "v-play", text: "▶" }));
    card.appendChild(fig);

    var when = v.pub ? timeAgo(v.pub) : "";
    card.appendChild(el("div", { class: "r-body" }, [
      el("div", { class: "r-title", text: cookTitle(v.title) }),
      el("div", { class: "r-meta" }, [
        el("span", { class: "r-channel", text: "🦏 코뿔소 TV" + (when ? " · " + when : "") }),
        el("span", { class: "r-go", text: "유튜브로 보기 ▶" })
      ])
    ]));
    return card;
  }

  function renderRhino() {
    var list = $("#rhinoList");
    if (!list) return;
    var data = rhinoData();
    list.textContent = "";
    if (!data) {
      list.appendChild(el("div", { class: "rhino-empty", text: "새 영상을 불러오는 중이에요…" }));
      return;
    }
    data.items.slice().sort(function (a, b) { return (b.pub || 0) - (a.pub || 0); })
      .slice(0, 1).forEach(function (v) { list.appendChild(rhinoCard(v)); });   /* 최신 영상 1개만 */
    setText("rhinoAuto", "🔄 1시간마다 자동 업데이트" + (data.ts ? " · " + hhmm(data.ts) + " 업데이트" : ""));
  }

  function loadRhino(force) {
    if (!RHINO || !RHINO.id) return;
    var c = store(RHINO_KEY);
    if (!force && c && c.items && c.items.length && Date.now() - (c.ts || 0) < RHINO_TTL) {
      renderRhino();
      return;
    }
    fetchYouTube(RHINO.id).then(function (items) {
      if (!items || !items.length) return;
      store(RHINO_KEY, { ts: Date.now(), items: items.slice(0, 10) });
      renderRhino();
    }).catch(function () { renderRhino(); /* 통로가 막히면 저장해 둔 영상 그대로 */ });
  }

  /* 잠깐 잠들었다 깨어나도 새 영상이 올라왔는지 확인 */
  setInterval(function () {
    if (document.hidden) return;
    var c = store(RHINO_KEY);
    if (!c || Date.now() - (c.ts || 0) >= RHINO_TTL) loadRhino(false);
  }, 10 * 60 * 1000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) renderRhino(); });

  /* ------------------------------------------------------------------ *
   * 5. 추천요리 — 유명 요리 채널의 새 영상 + 검증된 영상 (1시간마다 새 조합)
   *    · 채널 10곳의 유튜브 공개 RSS를 CORS 통로로 받아 최신 영상을 모읍니다.
   *    · 채널마다 돌아가며 골라, 매시 정시가 지나면 다른 영상 조합이 됩니다.
   *    · 화면 목록은 60분(1시간)마다, 채널 RSS는 3시간마다 새로 받습니다.
   * ------------------------------------------------------------------ */
  var CHANNELS = window.COOK_CHANNELS || [];
  var POOL = window.COOK_VIDEOS || [];
  var COOK_TTL = 60 * 60 * 1000;      /* 보여주는 영상 조합을 바꾸는 주기 = 1시간 */
  var FEED_TTL = 3 * 60 * 60 * 1000;  /* 한 채널의 RSS를 다시 받는 주기 = 3시간 */
  var MIX_COUNT = 15;                 /* 한 번에 보여줄 영상 수 */
  var MAX_PER_CHANNEL = 2;            /* 한 채널이 차지하는 최대 칸 수 */
  var FEED_KEY = "mj_cook_feed_v2_";

  var cook = { kind: "", hour: -1, items: [], lastFetch: 0, loading: false, tried: {}, fresh: 0 };

  function cookHour() { return Math.floor(Date.now() / COOK_TTL); }

  function cookRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* 제목으로 요리 종류를 대강 나눕니다 (칩으로 걸러 볼 때만 씀) */
  var KIND_RULES = [
    ["탕수육", "볶음·구이"],
    ["볶음밥", "밥·면"], ["비빔밥", "밥·면"], ["덮밥", "밥·면"], ["김밥", "밥·면"],
    ["주먹밥", "밥·면"], ["국수", "밥·면"], ["라면", "밥·면"], ["칼국수", "밥·면"],
    ["파스타", "밥·면"], ["우동", "밥·면"], ["냉면", "밥·면"], ["짜장", "밥·면"],
    ["짬뽕", "밥·면"], ["비빔면", "밥·면"], ["떡볶이", "밥·면"], ["수제비", "밥·면"],
    ["오므라이스", "밥·면"], ["카레", "밥·면"], ["밥", "밥·면"],
    ["찌개", "국·찌개"], ["전골", "국·찌개"], ["육개장", "국·찌개"], ["해장", "국·찌개"],
    ["곰탕", "국·찌개"], ["설렁탕", "국·찌개"], ["삼계탕", "국·찌개"], ["감자탕", "국·찌개"],
    ["만둣국", "국·찌개"], ["미역국", "국·찌개"], ["콩나물국", "국·찌개"], ["북엇국", "국·찌개"],
    ["배춧국", "국·찌개"], ["시래기국", "국·찌개"], ["된장국", "국·찌개"], ["계란국", "국·찌개"],
    ["떡국", "국·찌개"], ["무국", "국·찌개"], ["탕", "국·찌개"], ["스프", "국·찌개"],
    ["볶음", "볶음·구이"], ["구이", "볶음·구이"], ["튀김", "볶음·구이"], ["까스", "볶음·구이"],
    ["카츠", "볶음·구이"], ["산도", "볶음·구이"], ["스테이크", "볶음·구이"], ["부침", "볶음·구이"],
    ["빈대떡", "볶음·구이"], ["김치전", "볶음·구이"], ["파전", "볶음·구이"],
    ["찜", "찜·조림"], ["조림", "찜·조림"], ["수육", "찜·조림"], ["갈비", "찜·조림"],
    ["무침", "반찬"], ["나물", "반찬"], ["겉절이", "반찬"], ["김치", "반찬"], ["석박지", "반찬"],
    ["장아찌", "반찬"], ["멸치", "반찬"], ["계란말이", "반찬"], ["달걀말이", "반찬"],
    ["젓갈", "반찬"], ["샐러드", "반찬"], ["동치미", "반찬"], ["생채", "반찬"], ["장조림", "반찬"]
  ];

  function classifyKind(title) {
    var t = String(title || "");
    /* 요리 이름이 아닌 말(설탕, 밥도둑)이 종류를 잘못 정하지 않게 지우고 봅니다 */
    t = t.replace(/설탕|그라탕|밥도둑/g, " ");
    for (var i = 0; i < KIND_RULES.length; i++) {
      if (t.indexOf(KIND_RULES[i][0]) >= 0) return KIND_RULES[i][1];
    }
    return "그 외";
  }

  /* 요리 영상이 아닌 것(브이로그·공구·예고 등)은 목록에서 뺍니다 */
  var SKIP_RE = /브이로그|먹방|먹으러|공구|#shorts|광고|협찬|예고|티저|근황|일상/i;

  /* --- 채널 RSS 받아오기 ------------------------------------------------ */
  function parseCookFeed(text, ch) {
    var doc = new DOMParser().parseFromString(text, "text/xml");
    if (doc.getElementsByTagName("parsererror").length) throw new Error("xml");
    var nodes = Array.prototype.slice.call(doc.getElementsByTagName("entry"));
    if (!nodes.length) throw new Error("empty feed");
    var out = [];
    nodes.forEach(function (n) {
      function txt(tag) {
        var t = n.getElementsByTagName(tag)[0];
        return t ? (t.textContent || "").trim() : "";
      }
      var id = txt("yt:videoId") || txt("id").replace("yt:video:", "");
      var title = clean(txt("title"));
      if (!id || !title) return;
      var stamp = Date.parse(txt("published"));
      var stats = n.getElementsByTagName("media:statistics")[0];
      out.push({
        id: id,
        title: title,
        ch: ch.id,
        channel: ch.short || ch.name,
        kind: classifyKind(title),
        pub: isNaN(stamp) ? 0 : stamp,
        views: stats ? Number(stats.getAttribute("views") || 0) : 0
      });
    });
    return out;
  }

  function fetchCookFeed(ch) {
    var feed = "https://www.youtube.com/feeds/videos.xml?channel_id=" + ch.id;
    var enc = encodeURIComponent(feed);
    var providers = [
      "https://api.allorigins.win/raw?url=" + enc,
      "https://api.codetabs.com/v1/proxy?quest=" + enc,
      "https://api.cors.lol/?url=" + enc
    ];
    return new Promise(function (resolve, reject) {
      var settled = false;
      var fails = 0;
      providers.forEach(function (url) {
        fetchWithTimeout(url, 9000).then(function (text) {
          var items = parseCookFeed(text, ch);
          if (settled) return;
          settled = true;
          resolve(items);
        }).catch(function () {
          fails += 1;
          if (!settled && fails === providers.length) reject(new Error("feed failed"));
        });
      });
    });
  }

  /* 오래된 채널부터 4곳씩 받아 옵니다 (통로가 막히지 않게) */
  function loadCookFeeds(force) {
    if (cook.loading || !CHANNELS.length) return;
    var due = CHANNELS.filter(function (ch) {
      /* 방금 시도한 채널은 5분 쉬어 갑니다 (막혔을 때 계속 두드리지 않게) */
      if (cook.tried[ch.id] && Date.now() - cook.tried[ch.id] < 5 * 60 * 1000) return false;
      if (force) return true;
      var c = store(FEED_KEY + ch.id);
      return !c || !c.items || !c.items.length || Date.now() - (c.ts || 0) > FEED_TTL;
    });
    if (!due.length) return;

    cook.loading = true;
    var batch = due.slice(0, 4);
    var left = batch.length;
    var got = 0;

    batch.forEach(function (ch) {
      cook.tried[ch.id] = Date.now();
      fetchCookFeed(ch)
        .then(function (items) {
          store(FEED_KEY + ch.id, { ts: Date.now(), items: items });
          got += 1;
        })
        .catch(function () { /* 이 채널은 다음 시간에 다시 시도 */ })
        .then(function () {
          left -= 1;
          if (left > 0) return;
          cook.loading = false;
          if (got) {
            cook.lastFetch = Date.now();
            cook.hour = -1;             /* 새 영상으로 다시 고르기 */
            renderVideos();
          }
          if (due.length > batch.length) loadCookFeeds(force); /* 남은 채널 이어서 */
        });
    });
  }

  /* --- 이번 시간에 보여줄 조합 ------------------------------------------ */
  function cookPool() {
    var groups = {};
    var seen = {};
    var curated = {};
    POOL.forEach(function (v) { curated[v.id] = v; });

    function add(chKey, v) {
      if (!v || !v.id || seen[v.id]) return;
      seen[v.id] = 1;
      (groups[chKey] = groups[chKey] || []).push(v);
    }

    /* 1) 채널별 최신 영상 (RSS) — 새 영상부터 */
    CHANNELS.forEach(function (ch) {
      var c = store(FEED_KEY + ch.id);
      if (!c || !c.items) return;
      if ((c.ts || 0) > cook.lastFetch) cook.lastFetch = c.ts || 0;
      c.items.slice().sort(function (a, b) { return (b.pub || 0) - (a.pub || 0); })
        .forEach(function (it) {
          if (SKIP_RE.test(it.title)) return;   /* 요리 영상이 아니면 화면에 넣지 않음 */
          var cur = curated[it.id];
          add(ch.id, {
            id: it.id, name: cur ? (cur.name || "") : "", title: it.title,
            channel: ch.short || ch.name, ch: ch.id,
            kind: (cur && cur.kind) || classifyKind(it.title),
            pub: it.pub || 0, views: it.views || 0, src: "feed"
          });
        });
    });

    /* 2) 검증해 둔 영상 (RSS가 막히거나 비어도 화면이 비지 않게) */
    POOL.forEach(function (v) {
      add(v.ch || "pool:" + v.channel, {
        id: v.id, name: v.name || "", title: v.title,
        channel: v.channel, ch: v.ch || "",
        kind: v.kind || classifyKind(v.title),
        pub: 0, views: 0, src: "pool"
      });
    });

    return groups;
  }

  function buildCookMix() {
    var groups = cookPool();
    var keys = Object.keys(groups).sort();
    var rng = cookRng(cookHour() + 7);

    /* 채널 순서를 매 시간 섞습니다 */
    for (var i = keys.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = keys[i]; keys[i] = keys[j]; keys[j] = tmp;
    }

    /* 채널 안 순서: 이번 시간에 뽑은 새 영상 → 검증된 영상 → 나머지 새 영상 */
    var picks = {};
    keys.forEach(function (k) {
      var arr = groups[k];
      var fresh = arr.filter(function (v) { return v.src === "feed"; });
      var pool = arr.filter(function (v) { return v.src !== "feed"; });
      var order = [];
      if (fresh.length) {
        var pick = fresh[Math.min(Math.floor(rng() * 3), fresh.length - 1)];
        order.push(pick);
        fresh = fresh.filter(function (v) { return v !== pick; });
      }
      pool.forEach(function (v) { order.push(v); });
      fresh.forEach(function (v) { order.push(v); });
      picks[k] = order;
    });

    var all = [];
    keys.forEach(function (k) { groups[k].forEach(function (v) { all.push(v); }); });
    cook.all = all;

    var out = [];
    for (var pass = 0; pass < MAX_PER_CHANNEL && out.length < MIX_COUNT; pass++) {
      keys.forEach(function (k) {
        if (out.length >= MIX_COUNT) return;
        var v = picks[k][pass];
        if (v) out.push(v);
      });
    }
    return out;
  }

  /* --- 화면 그리기 ------------------------------------------------------ */
  /* 큰 썸네일 → 없으면 hqdefault → mqdefault → ▶ 그림 */
  var THUMB_STEPS = ["maxresdefault", "hqdefault", "mqdefault"];
  function youtubeThumb(v, img, fig) {
    img.addEventListener("error", function () {
      var step = Number(img.dataset.step || 0) + 1;
      if (step < THUMB_STEPS.length) {
        img.dataset.step = String(step);
        img.src = "https://i.ytimg.com/vi/" + v.id + "/" + THUMB_STEPS[step] + ".jpg";
        return;
      }
      fig.textContent = "";
      fig.appendChild(el("div", { class: "v-thumb-fallback" }, [
        el("span", { class: "v-play", text: "▶" })
      ]));
    });
  }

  /* 긴 제목에서 앞의 [채널] 꼬리표와 뒤의 잡담을 덜어 냅니다 */
  function cookTitle(title) {
    var t = String(title || "");
    t = t.replace(/^\s*(\[[^\]]{1,12}\]|【[^】]{1,12}】|🔴)/g, "").trim();
    t = t.replace(/[|｜].*$/, "").trim();
    t = t.replace(/\s*#\S+/g, "").trim();
    return t || String(title || "");
  }

  function cookCard(v) {
    var big = v.name || cookTitle(v.title);
    var label = v.name || v.title;
    var card = el("a", {
      class: "video-card",
      href: "https://www.youtube.com/watch?v=" + v.id,
      target: "_blank",
      rel: "noopener noreferrer",
      "aria-label": label + " 요리 영상 보기 (새 창)"
    });
    var fig = el("figure", { class: "v-thumb" });
    var img = el("img", {
      alt: "", loading: "lazy", decoding: "async",
      src: "https://i.ytimg.com/vi/" + v.id + "/maxresdefault.jpg"
    });
    youtubeThumb(v, img, fig);
    fig.appendChild(img);
    fig.appendChild(el("span", { class: "v-play", text: "▶" }));
    card.appendChild(fig);

    var top = el("div", { class: "v-top" }, [
      el("span", { class: "v-name", text: big }),
      el("span", { class: "v-kind", text: v.kind })
    ]);
    var body = [top];
    if (v.name && v.title) body.push(el("div", { class: "v-title", text: v.title }));
    var when = v.pub ? timeAgo(v.pub) : "";
    body.push(el("div", { class: "v-bottom" }, [
      el("span", { class: "v-channel", text: "📺 " + v.channel + (when ? " · " + when : "") }),
      el("span", { class: "v-go", text: "유튜브로 보기 ▶" })
    ]));
    card.appendChild(el("div", { class: "v-body" }, body));
    return card;
  }

  /* 칩을 누르면 그 종류 영상을 넓은 목록에서 모아 보여줍니다 (매 시간 순서가 바뀝니다) */
  function kindList(kind) {
    var arr = (cook.all || []).slice();
    var rng = cookRng(cookHour() + 13);
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    var per = {};
    var out = [];
    arr.forEach(function (v) {
      if (v.kind !== kind || out.length >= MIX_COUNT) return;
      var key = v.ch || v.channel;
      var n = per[key] || 0;
      if (n >= MAX_PER_CHANNEL) return;
      per[key] = n + 1;
      out.push(v);
    });
    return out;
  }

  function renderVideos() {
    var list = $("#recipeList");
    if (!list) return;

    if (cookHour() !== cook.hour) {
      cook.hour = cookHour();
      cook.items = buildCookMix();
    }

    var kind = cook.kind;
    var shown = kind ? kindList(kind) : cook.items;

    setText("recipeCount", shown.length + "개 영상");
    setText("recipeAuto", "🔄 1시간마다 자동 업데이트" + (cook.lastFetch ? " · " + hhmm(cook.lastFetch) + " 업데이트" : ""));
    setText("recipeTitle", kind || "오늘 뭐 해 먹지?");

    list.textContent = "";
    if (!shown.length) {
      list.appendChild(el("div", { class: "recipe-empty" }, [
        el("span", { class: "big-emoji", text: "🍲" }),
        el("p", { text: "이번 시간에는 ‘" + kind + "’ 영상이 없어요" }),
        el("p", { class: "sub", text: "다음 시간에 새로 골라 드려요. 지금은 전체 영상을 보세요." }),
        el("button", {
          type: "button", class: "btn wide", style: "margin-top:0.7rem", text: "전체 영상 보기",
          on: {
            click: function () {
              cook.kind = "";
              $$("#recipeChips button").forEach(function (b) { b.setAttribute("aria-pressed", String(!b.dataset.kind)); });
              renderVideos();
            }
          }
        })
      ]));
      return;
    }
    shown.forEach(function (v) { list.appendChild(cookCard(v)); });
  }

  $$("#recipeChips button").forEach(function (b) {
    b.addEventListener("click", function () {
      cook.kind = b.dataset.kind || "";
      $$("#recipeChips button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      renderVideos();
      scrollToSection($("#recipePanel"));
    });
  });

  var recipeRefreshBtn = $("#recipeRefresh");
  if (recipeRefreshBtn) recipeRefreshBtn.addEventListener("click", function () {
    recipeRefreshBtn.textContent = "불러오는 중…";
    cook.hour = -1;
    loadCookFeeds(true);
    renderVideos();
    setTimeout(function () { recipeRefreshBtn.textContent = "↻ 새로고침"; }, 2500);
  });

  /* 1분마다 확인: 정시가 지나면 새 조합, 채널 RSS가 오래됐으면 새로 받기 */
  function cookTick() {
    if (document.hidden) return;
    if (cookHour() !== cook.hour) renderVideos();
    if (state.tab === "recipe") loadCookFeeds(false);
  }
  setInterval(cookTick, 60 * 1000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) cookTick(); });
  window.addEventListener("focus", cookTick);

  setInterval(function () {           /* 자정을 넘겨도 목록이 바뀌도록 1시간마다 한 번 더 */
    if (!document.hidden) renderVideos();
  }, COOK_TTL);

  /* 시트 닫기 (레시피 상세 창) */
  function closeSheet() {
    var sheet = $("#sheet");
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true;
    document.body.style.overflow = "";
  }
  var sheetCloseBtn = $("#sheetClose");
  if (sheetCloseBtn) sheetCloseBtn.addEventListener("click", closeSheet);
  var sheet = $("#sheet");
  if (sheet) sheet.addEventListener("click", function (e) { if (e.target === sheet) closeSheet(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });

  /* ------------------------------------------------------------------ *
   * 6. 시작
   * ------------------------------------------------------------------ */
  loadStocks(false);       /* 삼성전자·SK하이닉스 시세 (날씨 카드 위) */
  loadWeather(false);
  loadNews("all", false);
  renderRhino();           /* 저장해 둔 코뿔소 TV 영상으로 먼저 채우고, 새 영상은 이어서 받아옵니다 */
  loadRhino(false);
  renderVideos();          /* 검증해 둔 영상으로 먼저 채우고, 채널 RSS는 요리 탭을 열 때 받아옵니다 */

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
