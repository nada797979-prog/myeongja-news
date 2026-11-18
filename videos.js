/* 명자뉴스 채널 — 추천요리: 유명 요리 유튜브 채널 + 검증된 영상 목록

   1) COOK_CHANNELS : 실제로 있는 한국 요리 유튜브 채널 10곳의 채널 ID(UC...)
      각 채널의 공개 RSS(https://www.youtube.com/feeds/videos.xml?channel_id=...)를
      직접 받아 200 응답과 채널 이름이 일치하는지 확인했습니다. (2026-11-19 확인)
        · 백종원 PAIK JONG WON        @paik_jongwon    구독자 581만
        · 김대석 셰프TV               @chefkds         구독자 287만
        · 1분요리 뚝딱이형            @1mincook        구독자 305만
        · 쿡피아 Cookpia (이보은)     @cookpia         구독자 98.7만
        · 만개의레시피 10K Recipe     @만개의레시피     구독자 61.7만
        · 하루한끼 one meal a day     @one_meal_a_day  구독자 419만
        · 영자씨의 부엌               @youngjas_kitchen 구독자 96.2만
        · 이연복의 복주머니           @leeyeonbok      구독자 94.6만
        · 식탁일기 table diary        @table_diary     구독자 549만
        · 승우아빠                    @swab85          구독자 134만

   2) COOK_VIDEOS : 채널 공식 RSS에 실제로 올라온 영상들(주로 긴 가로 영상)과
      예전에 oEmbed로 확인한 영상들. 인터넷이 막히거나 RSS가 안 올 때도
      이 목록으로 화면을 채웁니다.  (2026-11-19 RSS 원문 확인)
*/
/* 코뿔소 TV — 메인 화면 '유튜브 바로가기' 배너 아래에 새 영상이 올라올 때마다 보여줍니다.
   채널: 코뿔소TV 서울김포영광교회 (RhinoTV) @RhinoTV0691
   channel_id: UC2Brddysh5qpf3zD2wrTbRg
   2026-11-19 확인: 채널 페이지(구독자 18.4만·본채널·경기도 김포)와
   공개 RSS(https://www.youtube.com/feeds/videos.xml?channel_id=...) 응답 일치.
   아래 videos 는 RSS가 막혔을 때 화면이 비지 않도록 넣어 둔 실제 최신 영상입니다. */
window.RHINO = {
  id: "UC2Brddysh5qpf3zD2wrTbRg",
  name: "코뿔소TV 서울김포영광교회 (RhinoTV)",
  handle: "@RhinoTV0691",
  url: "https://www.youtube.com/channel/UC2Brddysh5qpf3zD2wrTbRg",
  checkedAt: "2026-11-19",
  videos: [
    {
      id: "BOv5-G8syj4",
      title: "왕의 기도로 돌파하라 (베드로전서 2장 9-10절) / 특전사 기도회",
      pub: 1795017531000
    },
    {
      id: "_1CSFRteLBg",
      title: "내 이름으로 무엇이든지 내게 구하면 내가 행하리라 (요한복음 14:14)",
      pub: 1795010423000
    },
    {
      id: "AWPWkEwTfzg",
      title: "주님의 손길로 축복받는 유아축복식",
      pub: 1795006803000
    }
  ]
};

window.COOK_CHANNELS = [
  { id: "UCyn-K7rZLXjGl7VXGweIlcA", name: "백종원 PAIK JONG WON", short: "백종원" },
  { id: "UC1g9JaEVLOFGhH8hpaK--Jg", name: "김대석 셰프TV", short: "김대석 셰프TV" },
  { id: "UC0htUSwcxfSGNfK_5Q28JkA", name: "1분요리 뚝딱이형", short: "뚝딱이형" },
  { id: "UCyn7aoxdLNDZG2ZXXLoVCNQ", name: "쿡피아 Cookpia", short: "이보은 쿡피아" },
  { id: "UCKA_6r3CWC76x_EaFO6jsPA", name: "만개의레시피 10K Recipe", short: "만개의레시피" },
  { id: "UCPWFxcwPliEBMwJjmeFIDIg", name: "하루한끼 one meal a day", short: "하루한끼" },
  { id: "UC2gasvQVxOdRht9ykwhxwjw", name: "영자씨의 부엌Young-Ja's Kitchen", short: "영자씨의 부엌" },
  { id: "UCaAka9CN4naD3FzHX6AvpqA", name: "이연복의 복주머니", short: "이연복" },
  { id: "UCemFUqq5jad1f258HrPS5rg", name: "식탁일기 table diary", short: "식탁일기" },
  { id: "UCgsffS7MfKL6YU3r_U3E-aA", name: "승우아빠", short: "승우아빠" }
];

window.COOK_VIDEOS = [
  /* --- 백종원 PAIK JONG WON --- */
  {
    id: "PzyZ7diwG20", ch: "UCyn-K7rZLXjGl7VXGweIlcA",
    name: "된장찌개", title: "제일 쉽게 만드는 된장찌개",
    channel: "백종원 PAIK JONG WON", kind: "국·찌개",
    tags: ["된장", "두부", "애호박", "집밥", "저녁", "국물"]
  },
  {
    id: "PgIJlbWb7Nc", ch: "UCyn-K7rZLXjGl7VXGweIlcA",
    name: "김치찌개", title: "한국에서 제일 많이 본 돼지고기 김치찌개",
    channel: "백종원 PAIK JONG WON", kind: "국·찌개",
    tags: ["김치", "돼지고기", "두부", "집밥", "얼큰한"]
  },
  {
    id: "-MvfUUPB5-Y", ch: "UCyn-K7rZLXjGl7VXGweIlcA",
    name: "부대찌개", title: "더 이상의 부대찌개는 없습니다! 이걸로 끝내겠습니다",
    channel: "백종원 PAIK JONG WON", kind: "국·찌개",
    tags: ["햄", "소시지", "라면", "라면사리", "아이반찬", "국물"]
  },
  {
    id: "j7s9VRsrm9o", ch: "UCyn-K7rZLXjGl7VXGweIlcA",
    name: "제육볶음", title: "대파 듬뿍! 삼겹살로 만든 '대파 제육볶음'",
    channel: "백종원 PAIK JONG WON", kind: "볶음·구이",
    tags: ["삼겹살", "돼지고기", "대파", "매운맛", "밥반찬", "도시락"]
  },
  {
    id: "T7YJviWhquo", ch: "UCyn-K7rZLXjGl7VXGweIlcA",
    name: "달걀말이", title: "[Sub] 정말 쉬운 달걀말이!",
    channel: "백종원 PAIK JONG WON", kind: "반찬",
    tags: ["계란", "달걀", "아이반찬", "간단", "도시락"]
  },
  {
    id: "DNj3YiaP42s", ch: "UCyn-K7rZLXjGl7VXGweIlcA",
    name: "잡채", title: "잡채, 다음날 먹어도 쫄깃하게 만드는 법! 핵심은 색깔과 '이것'입니다",
    channel: "백종원 PAIK JONG WON", kind: "반찬",
    tags: ["잡채", "당면", "명절", "잔치", "손님상"]
  },
  {
    id: "3gQwydGHIG8", ch: "UCyn-K7rZLXjGl7VXGweIlcA",
    name: "감자조림", title: "고기를 넣어 더 맛있는 감자조림! 든든한 밑반찬 만들어두세요~",
    channel: "백종원 PAIK JONG WON", kind: "찜·조림",
    tags: ["감자", "조림", "밑반찬", "도시락", "아이반찬"]
  },
  {
    id: "34BJfQ7fH9g", ch: "UCyn-K7rZLXjGl7VXGweIlcA",
    name: "김치볶음밥", title: "세상에서 제일 쉬운 김치볶음밥 레시피",
    channel: "백종원 PAIK JONG WON", kind: "밥·면",
    tags: ["김치", "볶음밥", "계란", "혼밥", "간단", "한그릇"]
  },
  {
    id: "bFX5lJgCPBQ", ch: "UCyn-K7rZLXjGl7VXGweIlcA",
    name: "당면만둣국", title: "쌀쌀한 가을에 당면만둣국 한 그릇",
    channel: "백종원 PAIK JONG WON", kind: "국·찌개",
    tags: ["만두", "당면", "국물", "겨울", "집밥"]
  },
  {
    id: "w53qGlJ1vLI", ch: "UCyn-K7rZLXjGl7VXGweIlcA",
    name: "짬뽕", title: "막창을 튀겨서 짬뽕에 넣었습니다!",
    channel: "백종원 PAIK JONG WON", kind: "밥·면",
    tags: ["짬뽕", "막창", "중식", "얼큰한", "해장"]
  },

  /* --- 김대석 셰프TV --- */
  {
    id: "XVjFMlChQM8", ch: "UC1g9JaEVLOFGhH8hpaK--Jg",
    name: "김치찌개", title: "역대급 김치찌개 비밀재료 공개합니다",
    channel: "김대석 셰프TV", kind: "국·찌개",
    tags: ["김치", "돼지고기", "식당맛", "얼큰한", "국물"]
  },
  {
    id: "9_CXyn_C7Zs", ch: "UC1g9JaEVLOFGhH8hpaK--Jg",
    name: "감자탕", title: "줄서서 먹는 감자탕 1편",
    channel: "김대석 셰프TV", kind: "국·찌개",
    tags: ["감자탕", "뼈해장국", "돼지등뼈", "해장", "국물"]
  },
  {
    id: "AouCH6Mu8fQ", ch: "UC1g9JaEVLOFGhH8hpaK--Jg",
    name: "LA갈비찜", title: "역대급 LA갈비 비밀재료 공개합니다",
    channel: "김대석 셰프TV", kind: "찜·조림",
    tags: ["갈비", "LA갈비", "소고기", "명절", "손님상", "잔치"]
  },
  {
    id: "uKJx81MmzoA", ch: "UC1g9JaEVLOFGhH8hpaK--Jg",
    name: "달걀말이", title: "쉬운 계란말이",
    channel: "김대석 셰프TV", kind: "반찬",
    tags: ["계란", "달걀", "아이반찬", "간단", "도시락"]
  },
  {
    id: "SEu3UgTWoog", ch: "UC1g9JaEVLOFGhH8hpaK--Jg",
    name: "오징어무국", title: "오징어무국 가장 맛있게 끓이는 노하우 알려드립니다",
    channel: "김대석 셰프TV", kind: "국·찌개",
    tags: ["오징어", "무국", "국물", "시원한", "해장"]
  },
  {
    id: "ChZzWtNsu6s", ch: "UC1g9JaEVLOFGhH8hpaK--Jg",
    name: "수육", title: "족발보다 10배 맛있는 이런 수육 보셨나요?",
    channel: "김대석 셰프TV", kind: "찜·조림",
    tags: ["수육", "돼지고기", "보쌈", "손님상", "잔치"]
  },
  {
    id: "PGNyQW9U_rY", ch: "UC1g9JaEVLOFGhH8hpaK--Jg",
    name: "석박지", title: "3번 리필하는 '석박지' 이렇게 담그면 기가막힙니다",
    channel: "김대석 셰프TV", kind: "반찬",
    tags: ["석박지", "무김치", "김장", "겨울", "밑반찬"]
  },

  /* --- 1분요리 뚝딱이형 --- */
  {
    id: "u1pMKR9kmlQ", ch: "UC0htUSwcxfSGNfK_5Q28JkA",
    name: "김치찌개", title: "5분 만에 끓였는데 50년 된 맛집 맛이 납니다!",
    channel: "1분요리 뚝딱이형", kind: "국·찌개",
    tags: ["김치", "김치찌개", "간단", "빠른요리", "국물"]
  },
  {
    id: "klr0ZBwlzis", ch: "UC0htUSwcxfSGNfK_5Q28JkA",
    name: "라면 칼국수", title: "분명 라면 끓였는데 왜 맛집 칼국수가 나오죠?",
    channel: "1분요리 뚝딱이형", kind: "밥·면",
    tags: ["라면", "칼국수", "국수", "간단", "야식", "한그릇"]
  },

  /* --- 쿡피아 (이보은) --- */
  {
    id: "fm47aK3UtKM", ch: "UCyn7aoxdLNDZG2ZXXLoVCNQ",
    name: "멸치볶음", title: "[ENG] 필수 밑반찬, 멸치볶음! 오래 두고 먹어도 맛있어요",
    channel: "쿡피아 Cookpia", kind: "반찬",
    tags: ["멸치", "볶음", "밑반찬", "이보은", "아이반찬", "견과류"]
  },
  {
    id: "zMuaUOcR02s", ch: "UCyn7aoxdLNDZG2ZXXLoVCNQ",
    name: "가을동치미", title: "겨울 오기전에 한달 먹는 가을동치미. 끝내주게 시원한 맛입니다.",
    channel: "쿡피아 Cookpia", kind: "반찬",
    tags: ["동치미", "무", "김치", "시원한", "겨울"]
  },
  {
    id: "6pNddn9iQzQ", ch: "UCyn7aoxdLNDZG2ZXXLoVCNQ",
    name: "두부조림", title: "겉은 매콤바삭, 속은 부드러운 두부조림~",
    channel: "쿡피아 Cookpia", kind: "찜·조림",
    tags: ["두부", "조림", "밑반찬", "매콤", "간단"]
  },
  {
    id: "EYvB6Q5PvJQ", ch: "UCyn7aoxdLNDZG2ZXXLoVCNQ",
    name: "감자조림", title: "감자 쫀득하게 조려보세요~ 밑반찬으로 강추합니다",
    channel: "쿡피아 Cookpia", kind: "찜·조림",
    tags: ["감자", "조림", "밑반찬", "아이반찬"]
  },

  /* --- 만개의레시피 --- */
  {
    id: "HNucboHGsxI", ch: "UCKA_6r3CWC76x_EaFO6jsPA",
    name: "육개장", title: "차돌박이와 대파 듬뿍 넣은 초간단 육개장",
    channel: "만개의레시피 10K Recipe", kind: "국·찌개",
    tags: ["육개장", "차돌박이", "대파", "얼큰한", "국물"]
  },
  {
    id: "Km_du9P7QnE", ch: "UCKA_6r3CWC76x_EaFO6jsPA",
    name: "계란전덮밥", title: "간단한 한끼, 팽이버섯계란전덮밥",
    channel: "만개의레시피 10K Recipe", kind: "밥·면",
    tags: ["덮밥", "계란", "팽이버섯", "혼밥", "간단"]
  },
  {
    id: "qCJVjPY-GXY", ch: "UCKA_6r3CWC76x_EaFO6jsPA",
    name: "닭구이", title: "감칠맛을 살린 시오콘부닭구이",
    channel: "만개의레시피 10K Recipe", kind: "볶음·구이",
    tags: ["닭고기", "구이", "시오콘부", "간단", "술안주"]
  },

  /* --- 하루한끼 --- */
  {
    id: "Hb0LRYtgdeE", ch: "UCPWFxcwPliEBMwJjmeFIDIg",
    name: "통삼겹 수육", title: "초간단 통삼겹 수육 만들기",
    channel: "하루한끼 one meal a day", kind: "찜·조림",
    tags: ["수육", "삼겹살", "돼지고기", "간단", "집밥"]
  },
  {
    id: "nGekeG6IiLE", ch: "UCPWFxcwPliEBMwJjmeFIDIg",
    name: "잡채", title: "보릿고개 잡채",
    channel: "하루한끼 one meal a day", kind: "반찬",
    tags: ["잡채", "당면", "채소", "집밥", "손님상"]
  },
  {
    id: "ctipT3_8LSU", ch: "UCPWFxcwPliEBMwJjmeFIDIg",
    name: "소금 파스타", title: "소금 파스타",
    channel: "하루한끼 one meal a day", kind: "밥·면",
    tags: ["파스타", "면", "간단", "혼밥", "한그릇"]
  },

  /* --- 영자씨의 부엌 --- */
  {
    id: "rLwLOuoftPI", ch: "UC2gasvQVxOdRht9ykwhxwjw",
    name: "굴겉절이", title: "한입 먹고 기절! 굴은 이렇게 무쳐야 진짜 맛있어요‼️ 굴겉절이",
    channel: "영자씨의 부엌", kind: "반찬",
    tags: ["굴", "겉절이", "무침", "겨울", "밑반찬"]
  },
  {
    id: "oFglZxPDFfM", ch: "UC2gasvQVxOdRht9ykwhxwjw",
    name: "오이배추김치", title: "완전 히트다 히트! 지금 난리난 김장김치! 한겨울 오이배추김치!",
    channel: "영자씨의 부엌", kind: "반찬",
    tags: ["김치", "오이", "배추", "김장", "겨울"]
  },
  {
    id: "r4pjBXgFT_k", ch: "UC2gasvQVxOdRht9ykwhxwjw",
    name: "가을 무생채", title: "김장전 필수 시청‼️ 가을 무생채 100배 맛있게 만드는 '이것'의 정체?",
    channel: "영자씨의 부엌", kind: "반찬",
    tags: ["무생채", "무", "김장", "밑반찬", "가을"]
  },

  /* --- 이연복의 복주머니 --- */
  {
    id: "K2FzEwqOfak", ch: "UCaAka9CN4naD3FzHX6AvpqA",
    name: "참치 순두부찌개", title: "참치캔 하나로 15분 완성 참치 순두부찌개 레시피",
    channel: "이연복의 복주머니", kind: "국·찌개",
    tags: ["순두부", "찌개", "참치", "얼큰한", "간단"]
  },
  {
    id: "UQ07a23s5lU", ch: "UCaAka9CN4naD3FzHX6AvpqA",
    name: "새송이버섯조림", title: "고기없는 밥도둑 반찬, 든든한 새송이버섯 양배추 조림",
    channel: "이연복의 복주머니", kind: "찜·조림",
    tags: ["버섯", "양배추", "조림", "밑반찬", "채소"]
  },
  {
    id: "vAzmktu7PFU", ch: "UCaAka9CN4naD3FzHX6AvpqA",
    name: "땅콩버터 멸치볶음", title: "멸치볶음 레시피, 땅콩버터 넣으면 고소함이 달라집니다!",
    channel: "이연복의 복주머니", kind: "반찬",
    tags: ["멸치", "볶음", "땅콩버터", "밑반찬", "고소한"]
  },
  {
    id: "L4uBVpAgEZo", ch: "UCaAka9CN4naD3FzHX6AvpqA",
    name: "호박덮밥", title: "호박 하나, 달걀 하나로 완성! 이연복 가성비 호박덮밥",
    channel: "이연복의 복주머니", kind: "밥·면",
    tags: ["덮밥", "호박", "달걀", "간단", "한그릇"]
  },

  /* --- 식탁일기 table diary --- */
  {
    id: "OyJHFxyE-9w", ch: "UCemFUqq5jad1f258HrPS5rg",
    name: "냉털 파스타", title: "냉털 파스타로는 이게 최고입니다!",
    channel: "식탁일기 table diary", kind: "밥·면",
    tags: ["파스타", "냉장고", "면", "간단", "집밥"]
  },
  {
    id: "fHSWl8QoLMU", ch: "UCemFUqq5jad1f258HrPS5rg",
    name: "런던 케이크", title: "품절 대란 런던 케이크! 런던까지 갈 순 없어서 직접 만들었어요",
    channel: "식탁일기 table diary", kind: "그 외",
    tags: ["케이크", "베이킹", "디저트", "간식"]
  },
  {
    id: "Qa44xT8CjbM", ch: "UCemFUqq5jad1f258HrPS5rg",
    name: "겨울 집밥", title: "따땃한 겨울집밥, 추울땐 디저트도 구워요🍲",
    channel: "식탁일기 table diary", kind: "그 외",
    tags: ["집밥", "겨울", "브이로그", "디저트"]
  },

  /* --- 승우아빠 --- */
  {
    id: "TTl2HxymJjw", ch: "UCgsffS7MfKL6YU3r_U3E-aA",
    name: "갈비살 구이", title: "아버지는 갈비살이 좋다고 하셨어",
    channel: "승우아빠", kind: "볶음·구이",
    tags: ["소고기", "갈비살", "구이", "고기", "집밥"]
  },
  {
    id: "DRQDXhXm5cE", ch: "UCgsffS7MfKL6YU3r_U3E-aA",
    name: "구운 킹크랩", title: "구운 킹크랩",
    channel: "승우아빠", kind: "볶음·구이",
    tags: ["킹크랩", "해산물", "구이", "특별한날"]
  }
];
