(function () {
  'use strict';
  var P = (window.pinyinPro && window.pinyinPro.pinyin) ? window.pinyinPro.pinyin : null;
  if (!P) {
    var be = document.getElementById('booterr');
    if (be) be.hidden = false;
    return;
  }

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var HANZI_FONTS = {
    hei: "'Microsoft YaHei','PingFang SC','Noto Sans SC',sans-serif",
    song: "'SimSun','Songti SC','Noto Serif SC',serif",
    kai: "'KaiTi','Kaiti SC','STKaiti',serif"
  };
  var PY_FONTS = {
    serif: "'Times New Roman',Georgia,serif",
    sans: "'Segoe UI',Arial,sans-serif",
    mono: "Consolas,'Cascadia Mono',monospace"
  };

  var DEFAULTS = {
    hanSize: 46, pySize: 17, hanFont: 'hei', pyFont: 'serif',
    hanColor: '#1d1d1f', pyColor: '#c0392b',
    letterGap: 6, pyGap: 4, lineGap: 28, maxCols: 0,
    tone: 'symbol', showHanzi: true, showPy: true, markPoly: true, transparent: false,
    readRate: 1, readVoice: '', followHighlight: true
  };

  var S = {};
  var overrides = {};
  var text = '';
  var tokens = [];
  var lines = [];
  var mctx = null;
  var dictMap = {};

  var SAMPLE = '他长大了，行长说银行的钱要省着用。音乐响起，重庆的小巷里飘出麻辣的香气，' +
    '快乐的孩子们追逐着穿过人群。这一段旁白，我想慢慢地、清清楚楚地念给你听。';

  /* 内置词表：解决长句里多音字/地名被读错 */
  var SEED_DICT = {
    '重庆': 'chóng qìng', '长沙': 'cháng shā', '长春': 'cháng chūn', '厦门': 'xià mén',
    '蚌埠': 'bèng bù', '六安': 'lù ān', '亳州': 'bó zhōu', '丽水': 'lí shuǐ',
    '台州': 'tāi zhōu', '番禺': 'pān yú', '乐山': 'lè shān', '单县': 'shàn xiàn',
    '银行': 'yín háng', '行长': 'háng zhǎng', '行业': 'háng yè', '内行': 'nèi háng',
    '长大': 'zhǎng dà', '成长': 'chéng zhǎng', '长江': 'cháng jiāng', '长城': 'cháng chéng',
    '校长': 'xiào zhǎng', '长辈': 'zhǎng bèi', '专长': 'zhuān cháng', '特长': 'tè cháng',
    '音乐': 'yīn yuè', '快乐': 'kuài lè', '乐器': 'yuè qì', '乐队': 'yuè duì',
    '乐观': 'lè guān', '乐园': 'lè yuán', '娱乐': 'yú lè', '乐曲': 'yuè qǔ',
    '便宜': 'pián yi', '方便': 'fāng biàn', '便当': 'biàn dāng',
    '头发': 'tóu fa', '理发': 'lǐ fà', '发型': 'fà xíng', '白发': 'bái fà',
    '水分': 'shuǐ fèn', '分量': 'fèn liàng', '身份': 'shēn fèn', '部分': 'bù fèn',
    '角色': 'jué sè', '处理': 'chǔ lǐ', '相处': 'xiāng chǔ', '处方': 'chǔ fāng',
    '强迫': 'qiǎng pò', '勉强': 'miǎn qiǎng', '倔强': 'jué jiàng', '强大': 'qiáng dà',
    '扒手': 'pá shǒu', '供给': 'gōng jǐ', '给予': 'jǐ yǔ', '补给': 'bǔ jǐ',
    '将军': 'jiāng jūn', '即将': 'jí jiāng', '弹琴': 'tán qín', '子弹': 'zǐ dàn',
    '蒙骗': 'mēng piàn', '塞外': 'sài wài', '堵塞': 'dǔ sè', '瓶塞': 'píng sāi',
    '藏经阁': 'cáng jīng gé', '西藏': 'xī zàng', '宝藏': 'bǎo zàng', '收藏': 'shōu cáng',
    '重复': 'chóng fù', '重量': 'zhòng liàng', '重庆小面': 'chóng qìng xiǎo miàn',
    '差不多': 'chà bù duō', '出差': 'chū chāi', '参差': 'cēn cī', '差别': 'chā bié',
    '的确': 'dí què', '的士': 'dí shì', '似的': 'shì de', '目的': 'mù dì',
    '血液': 'xuè yè', '血压': 'xuè yā', '贫血': 'pín xuè', '血淋淋': 'xiě lín lín',
    '骨头': 'gǔ tou', '一会儿': 'yí huì er', '一会儿见': 'yí huì er jiàn',
    '结果': 'jié guǒ', '结实': 'jiē shi', '尽管': 'jǐn guǎn', '尽量': 'jǐn liàng',
    '假期': 'jià qī', '假如': 'jiǎ rú', '虚假': 'xū jiǎ',
    '传说': 'chuán shuō', '传记': 'zhuàn jì', '自传': 'zì zhuàn',
    '还原': 'huán yuán', '还是': 'hái shì', '归还': 'guī huán',
    '害羞': 'hài xiū', '躲藏': 'duǒ cáng', '校对': 'jiào duì', '学校': 'xué xiào',
    '称号': 'chēng hào', '对称': 'duì chèn', '称职': 'chèn zhí',
    '落后': 'luò hòu', '丢三落四': 'diū sān là sì', '落枕': 'lào zhěn',
    '好人': 'hǎo rén', '爱好': 'ài hào', '调动': 'diào dòng', '调味': 'tiáo wèi',
    '晕车': 'yùn chē', '头晕': 'tóu yūn', '为难': 'wéi nán', '因为': 'yīn wèi',
    '答应': 'dā ying', '回答': 'huí dá', '什么': 'shén me', '哪个': 'nǎ ge',
    '创伤': 'chuāng shāng', '创造': 'chuàng zào', '冠军': 'guàn jūn', '皇冠': 'huáng guān',
    '单薄': 'dān bó', '单于': 'chán yú', '卡片': 'kǎ piàn', '关卡': 'guān qiǎ',
    '模样': 'mú yàng', '模范': 'mó fàn', '刹那': 'chà nà', '霎时': 'shà shí',
    '扁舟': 'piān zhōu', '扁平': 'biǎn píng', '曝光': 'bào guāng', '曝晒': 'pù shài',
    '挑剔': 'tiāo tī', '挑衅': 'tiǎo xìn', '占卜': 'zhān bǔ', '游说': 'yóu shuì',
    '说服': 'shuō fú', '劲头': 'jìn tóu', '强劲': 'qiáng jìng', '薄荷': 'bò he',
    '薄纸': 'báo zhǐ', '剥削': 'bō xuē', '瘦削': 'shòu xuē', '勉强同意': 'miǎn qiǎng tóng yì',
    '供应': 'gōng yìng', '应用': 'yìng yòng', '应届': 'yīng jiè', '哈欠': 'hā qian',
    '氛围': 'fēn wéi', '分外': 'fèn wài', '干活': 'gàn huó', '干净': 'gān jìng',
    '骨干': 'gǔ gàn', '给予帮助': 'jǐ yǔ bāng zhù', '曾祖父': 'zēng zǔ fù', '姓曾': 'xìng zēng',
    '巷道': 'hàng dào', '街巷': 'jiē xiàng', '角落': 'jiǎo luò', '角色扮演': 'jué sè bàn yǎn',
    '当作': 'dàng zuò', '恰当': 'qià dàng', '糊涂': 'hú tu', '模糊': 'mó hu',
    '秘密': 'mì mì', '秘书': 'mì shū', '暴露': 'bào lù', '露面': 'lòu miàn',
    '里脊': 'lǐ ji', '脊背': 'jǐ bèi', '顷刻': 'qǐng kè', '奔赴': 'bēn fù', '投奔': 'tóu bèn',
    '得到': 'dé dào', '得意': 'dé yì', '得罪': 'dé zuì', '得力': 'dé lì', '得逞': 'dé chěng',
    '值得': 'zhí dé', '懂得': 'dǒng de', '记得': 'jì de', '取得': 'qǔ dé', '获得': 'huò dé',
    '心得': 'xīn dé', '得分': 'dé fēn', '得失': 'dé shī', '得手': 'dé shǒu', '得救': 'dé jiù',
    '舍不得': 'shě bu de', '不得不': 'bù dé bù', '了得': 'liǎo de', '总得': 'zǒng děi',
    '数着': 'shǔ zhe', '数一数': 'shǔ yī shǔ', '数钱': 'shǔ qián', '数不清': 'shǔ bù qīng',
    '数落': 'shǔ luo', '历数': 'lì shǔ', '数九': 'shǔ jiǔ', '数目': 'shù mù', '总数': 'zǒng shù',
    '了不起': 'liǎo bù qǐ', '了解': 'liǎo jiě', '了然': 'liǎo rán', '一目了然': 'yí mù liǎo rán',
    '着火': 'zháo huǒ', '着急': 'zháo jí', '着凉': 'zháo liáng', '睡着': 'shuì zháo', '看着办': 'kàn zhe bàn',
    '过分': 'guò fèn', '过于': 'guò yú', '将近': 'jiāng jìn', '长相': 'zhǎng xiàng', '长子': 'zhǎng zǐ',
    '供应量': 'gōng yìng liàng', '相应': 'xiāng yìng', '응': 'yìng'
  };

  /* ---------- 声调工具 ---------- */
  var TONE_MAP = {
    'ā': ['a', 1], 'á': ['a', 2], 'ǎ': ['a', 3], 'à': ['a', 4],
    'ē': ['e', 1], 'é': ['e', 2], 'ě': ['e', 3], 'è': ['e', 4],
    'ī': ['i', 1], 'í': ['i', 2], 'ǐ': ['i', 3], 'ì': ['i', 4],
    'ō': ['o', 1], 'ó': ['o', 2], 'ǒ': ['o', 3], 'ò': ['o', 4],
    'ū': ['u', 1], 'ú': ['u', 2], 'ǔ': ['u', 3], 'ù': ['u', 4],
    'ǖ': ['ü', 1], 'ǘ': ['ü', 2], 'ǚ': ['ü', 3], 'ǜ': ['ü', 4],
    'ń': ['n', 2], 'ň': ['n', 3], 'ǹ': ['n', 4], 'ḿ': ['m', 2]
  };
  var TONE_SYM = {
    a: ['ā', 'á', 'ǎ', 'à'], e: ['ē', 'é', 'ě', 'è'], i: ['ī', 'í', 'ǐ', 'ì'],
    o: ['ō', 'ó', 'ǒ', 'ò'], u: ['ū', 'ú', 'ǔ', 'ù'], 'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ']
  };
  function toneOf(py) {
    for (var k in TONE_MAP) { if (py.indexOf(k) >= 0) return TONE_MAP[k][1]; }
    return 0;
  }
  function toNone(py) {
    var out = '';
    for (var i = 0; i < py.length; i++) {
      var c = py.charAt(i);
      out += TONE_MAP[c] ? TONE_MAP[c][0] : c;
    }
    return out;
  }
  function toNum(py) {
    var t = toneOf(py);
    var base = toNone(py);
    return t ? base + t : base;
  }
  function numToSym(py) {
    var m = String(py).toLowerCase().replace(/v/g, 'ü').match(/^([a-zü]+)([1-5])?$/);
    if (!m) return py;
    var base = m[1];
    var tone = m[2] ? parseInt(m[2], 10) : 0;
    if (!tone || tone > 4) return base;
    var vi = -1;
    if (base.indexOf('a') >= 0) vi = base.indexOf('a');
    else if (base.indexOf('o') >= 0) vi = base.indexOf('o');
    else if (base.indexOf('e') >= 0) vi = base.indexOf('e');
    else if (base.indexOf('iu') >= 0) vi = base.indexOf('iu') + 1;
    else if (base.indexOf('ui') >= 0) vi = base.indexOf('ui') + 1;
    else {
      for (var i = base.length - 1; i >= 0; i--) {
        if ('aeiouü'.indexOf(base.charAt(i)) >= 0) { vi = i; break; }
      }
    }
    if (vi < 0) return base;
    var v = base.charAt(vi);
    var tab = TONE_SYM[v];
    if (!tab) return base;
    return base.slice(0, vi) + tab[tone - 1] + base.slice(vi + 1);
  }

  /* ---------- 自定义词表 ---------- */
  function buildDict(customText) {
    var map = {};
    function add(word, pys) {
      var w = String(word || '').trim();
      if (!w || !/^[\u4e00-\u9fa5]+$/.test(w) || !pys || !pys.length) return;
      map[w] = pys;
    }
    for (var w in SEED_DICT) add(w, SEED_DICT[w].split(/\s+/));
    var lines = String(customText || '').split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i].trim();
      if (!ln || ln.charAt(0) === '#') continue;
      ln = ln.replace(/[=:：,，\t]/g, ' ');
      var parts = ln.split(/\s+/).filter(function (x) { return !!x; });
      if (parts.length < 2) continue;
      var word = parts.shift();
      var pys = parts.map(function (p) { return /[0-9]/.test(p) ? numToSym(p) : p; });
      if (pys.join('').length !== word.length) {
        if (pys.length === word.length) { add(word, pys); }
        continue;
      }
      add(word, pys);
    }
    dictMap = map;
    dictKeys = Object.keys(map).sort(function (a, b) { return b.length - a.length; });
  }
  var dictKeys = [];

  function dictSpans(src) {
    var res = {};
    var i = 0;
    var maxLen = 4;
    while (i < src.length) {
      var hit = null;
      for (var L = Math.min(maxLen, src.length - i); L >= 2; L--) {
        var w = src.substr(i, L);
        if (dictMap[w]) { hit = { len: L, pys: dictMap[w] }; break; }
      }
      if (hit) {
        for (var k = 0; k < hit.pys.length; k++) res[i + k] = hit.pys[k];
        i += hit.len;
      } else { i++; }
    }
    return res;
  }

  /* 语法助词规则：动词后的「得」读轻声 de（词表命中时以词表为准） */
  function applyRules(src, spans) {
    var res = {};
    for (var i = 0; i < src.length; i++) {
      var c = src.charAt(i);
      if (spans[i]) continue;
      if (c === '得') {
        var prev = src.charAt(i - 1), next = src.charAt(i + 1);
        if (/[\u4e00-\u9fa5]/.test(prev) && /[\u4e00-\u9fa5]/.test(next)) res[i] = 'de';
      }
    }
    return res;
  }

  /* ---------- 状态 ---------- */
  function loadState() {
    try { S = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem('pystudio.settings') || '{}')); }
    catch (e) { S = Object.assign({}, DEFAULTS); }
    try { overrides = JSON.parse(localStorage.getItem('pystudio.overrides') || '{}') || {}; }
    catch (e) { overrides = {}; }
    try { text = localStorage.getItem('pystudio.text') || ''; } catch (e) { text = ''; }
    var dictText = '';
    try { dictText = localStorage.getItem('pystudio.dict') || ''; } catch (e) { dictText = ''; }
    buildDict(dictText);
    return dictText;
  }
  function saveState() {
    try {
      localStorage.setItem('pystudio.settings', JSON.stringify(S));
      localStorage.setItem('pystudio.overrides', JSON.stringify(overrides));
      localStorage.setItem('pystudio.text', text);
    } catch (e) {}
  }

  /* ---------- 度量 ---------- */
  function hzFont(px) { return '400 ' + (px || S.hanSize) + 'px ' + HANZI_FONTS[S.hanFont]; }
  function pyFont(px) { return '400 ' + (px || S.pySize) + 'px ' + PY_FONTS[S.pyFont]; }
  function measure(str, font) {
    if (!mctx) { mctx = document.createElement('canvas').getContext('2d'); }
    mctx.font = font;
    return mctx.measureText(str).width;
  }

  /* ---------- 注音 ---------- */
  function analyze(src) {
    if (!src) return [];
    var arr = [];
    try { arr = P(src, { type: 'all', toneType: 'symbol', nonZh: 'consecutive', multiple: false }); }
    catch (e) { return []; }
    var spans = dictSpans(src);
    var rules = applyRules(src, spans);
    var out = [], idx = 0;
    for (var i = 0; i < arr.length; i++) {
      var t = arr[i] || {};
      var origin = t.origin == null ? '' : String(t.origin);
      var tok = {
        i: idx,
        ch: origin,
        isZh: !!t.isZh,
        pySym: t.pinyin || '',
        cands: (t.polyphonic && t.polyphonic.length > 1) ? t.polyphonic.slice() : null,
        forced: false
      };
      if (tok.isZh && spans[tok.i]) { tok.pySym = spans[tok.i]; }
      if (tok.isZh && !spans[tok.i] && rules[tok.i]) { tok.pySym = rules[tok.i]; }
      var ov = overrides[tok.i];
      if (ov && ov.ch === origin) { tok.pySym = ov.py || ''; tok.forced = true; }
      idx += origin.length;
      out.push(tok);
    }
    return out;
  }

  function displayPy(tok) {
    if (!tok.isZh || !tok.pySym) return '';
    if (S.tone === 'none') return toNone(tok.pySym);
    if (S.tone === 'num') return toNum(tok.pySym);
    return tok.pySym;
  }

  /* ---------- 布局 ---------- */
  function metrics() {
    var pyH = S.showPy ? Math.round(S.pySize * 1.42) : 0;
    var hzH = S.showHanzi ? Math.round(S.hanSize * 1.34) : 0;
    var gap = (S.showPy && S.showHanzi) ? S.pyGap : 0;
    return { pyH: pyH, hzH: hzH, gap: gap, lineH: pyH + gap + hzH + S.lineGap };
  }

  function buildCells(list) {
    var cells = [];
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      var py = displayPy(t);
      var isSpace = !t.isZh && /^\s+$/.test(t.ch);
      var hzW = S.showHanzi ? measure(t.ch, hzFont()) : 0;
      var pyW = py ? measure(py, pyFont()) : 0;
      var pad = isSpace ? S.letterGap * 0.4 : S.letterGap;
      cells.push({
        t: t, hz: t.ch, py: py, hzW: hzW, pyW: pyW,
        w: Math.max(hzW, pyW) + pad,
        space: isSpace, isZh: t.isZh, cands: t.cands, forced: t.forced
      });
    }
    return cells;
  }

  function expandLong(cells, maxW) {
    var out = [];
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      if (c.w > maxW && c.hz.length > 1) {
        for (var k = 0; k < c.hz.length; k++) {
          var sub = c.hz.charAt(k);
          var hzW = S.showHanzi ? measure(sub, hzFont()) : 0;
          out.push({
            t: c.t, hz: sub, py: '', hzW: hzW, pyW: 0, w: hzW + S.letterGap,
            space: false, isZh: false, cands: null, forced: false
          });
        }
      } else { out.push(c); }
    }
    return out;
  }

  function layoutCells(cells, maxW) {
    var out = [], cur = [], wid = 0;
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      if (c.w > maxW) c.w = maxW;
      if (wid + c.w > maxW && cur.length) { out.push({ cells: cur, w: wid }); cur = []; wid = 0; }
      if (c.space && !cur.length) continue;
      cur.push(c); wid += c.w;
    }
    if (cur.length) out.push({ cells: cur, w: wid });
    return out;
  }

  function maxLineWidth() {
    var pane = $('preview');
    var avail = Math.max(160, (pane.clientWidth || 640) - 56);
    if (S.maxCols > 0) {
      var fixed = S.maxCols * (S.hanSize + S.letterGap);
      return Math.min(avail, fixed);
    }
    return avail;
  }

  function relayout() {
    tokens = analyze(text);
    var maxW = maxLineWidth();
    var cells = expandLong(buildCells(tokens), maxW);
    lines = layoutCells(cells, maxW);
    return { maxW: maxW, m: metrics() };
  }

  function cellHtml(c, m) {
    var cls = 'cell' + (c.isZh ? '' : ' nonzh') + (c.cands ? ' poly' : '') + (c.forced ? ' forced' : '');
    var pyStyle = 'font:' + pyFont() + ';color:' + S.pyColor + ';height:' + m.pyH + 'px;line-height:' + m.pyH + 'px;' +
      (S.showPy ? '' : 'display:none;') + (m.gap ? 'margin-bottom:' + m.gap + 'px;' : '');
    var hzStyle = 'font:' + hzFont() + ';color:' + S.hanColor + ';height:' + m.hzH + 'px;line-height:' + m.hzH + 'px;' +
      (S.showHanzi ? '' : 'display:none;');
    return '<span class="' + cls + '" data-i="' + c.t.i + '" style="width:' + c.w.toFixed(2) + 'px">' +
      '<span class="py" style="' + pyStyle + '">' + esc(c.py) + '</span>' +
      '<span class="hz" style="' + hzStyle + '">' + esc(c.hz) + '</span>' +
      '</span>';
  }

  function render() {
    var m = metrics();
    relayout();
    var pane = $('preview');
    var html = '';
    for (var i = 0; i < lines.length; i++) {
      html += '<div class="line" style="height:' + m.lineH + 'px">';
      for (var j = 0; j < lines[i].cells.length; j++) html += cellHtml(lines[i].cells[j], m);
      html += '</div>';
    }
    pane.innerHTML = html || '<div class="empty">在上面的输入框里打中文，这里会显示带声调的拼音。</div>';
    pane.className = 'preview' + (S.markPoly ? ' markpoly' : '');
    var polyCount = 0;
    for (var k = 0; k < tokens.length; k++) if (tokens[k].cands) polyCount++;
    var chars = text.replace(/\s/g, '').length;
    $('stat').textContent = '字数 ' + chars + ' · 多音字 ' + polyCount;
    if (TTS.playing && TTS.range) paintRange(TTS.range.a, TTS.range.b);
    saveState();
  }

  /* ---------- 读音弹层 ---------- */
  function findToken(idx) {
    for (var i = 0; i < tokens.length; i++) if (tokens[i].i === idx) return tokens[i];
    return null;
  }
  function hidePop() { $('pop').hidden = true; }

  function showPop(cell, tok) {
    var pop = $('pop');
    var list = tok.cands ? tok.cands.slice() : [];
    if (tok.pySym && list.indexOf(tok.pySym) < 0) list.unshift(tok.pySym);
    if (!list.length) list.push(tok.pySym || '');
    var html = '<div class="pop-title">' + esc(tok.ch) + '<small>选读音</small></div><div class="pop-list">';
    for (var i = 0; i < list.length; i++) {
      html += '<button class="rd' + (list[i] === tok.pySym ? ' on' : '') + '" data-py="' + esc(list[i]) + '">' + esc(list[i]) + '</button>';
    }
    html += '<button class="rd quiet" data-py="">（不注音）</button></div>';
    html += '<div class="pop-foot"><input id="popInput" placeholder="自定义，如 zhǎng / zhang3" value="' + esc(tok.pySym) + '">' +
      '<button id="popSet">应用</button><button id="popAuto">恢复自动</button></div>';
    pop.innerHTML = html;
    pop.hidden = false;
    pop.dataset.idx = String(tok.i);
    pop.dataset.ch = tok.ch;

    var r = cell.getBoundingClientRect();
    var pw = 268;
    var left = Math.max(8, Math.min((window.innerWidth - pw - 8), r.left + r.width / 2 - pw / 2));
    var top = r.bottom + 8;
    if (top + 200 > window.innerHeight) top = Math.max(8, r.top - 200);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }

  function setOverride(idx, ch, py) {
    var v = String(py || '').trim();
    if (/[0-9]/.test(v)) v = numToSym(v);
    overrides[idx] = { ch: ch, py: v };
    saveState();
    render();
    hidePop();
  }

  /* ---------- 朗读（系统语音，纯离线） ---------- */
  var synth = (window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function')
    ? window.speechSynthesis : null;
  var TTS = {
    segs: [], i: -1, playing: false, paused: false, range: null, cur: -1, voices: [], err: 0
  };
  var SOFT_BREAK = '，,、：:；;—';
  var HARD_BREAK = '。！？!?…\n\r';

  function refreshVoices() {
    if (!synth) return;
    var all = [];
    try { all = synth.getVoices() || []; } catch (e) { all = []; }
    var zh = [];
    for (var i = 0; i < all.length; i++) {
      var v = all[i];
      if (/^(zh|cmn)|chinese|中文|普通話|普通话/i.test(String(v.lang || '') + ' ' + String(v.name || ''))) zh.push(v);
    }
    TTS.voices = zh.length ? zh : all;
    var sel = $('selVoice');
    if (!sel) return;
    var keep = S.readVoice || '';
    sel.innerHTML = '';
    if (!TTS.voices.length) {
      var op0 = document.createElement('option');
      op0.value = ''; op0.textContent = '（系统暂未提供语音）';
      sel.appendChild(op0);
      return;
    }
    for (var k = 0; k < TTS.voices.length; k++) {
      var vv = TTS.voices[k];
      var op = document.createElement('option');
      op.value = vv.voiceURI || vv.name;
      op.textContent = vv.name + '（' + (vv.lang || '') + '）' + (vv.localService === false ? ' · 联网' : '');
      if (keep && op.value === keep) op.selected = true;
      sel.appendChild(op);
    }
    if (!keep) sel.selectedIndex = 0;
    if (!S.readVoice && sel.value) S.readVoice = sel.value;
  }

  function curVoice() {
    var list = TTS.voices || [];
    var want = S.readVoice || '';
    if (want) {
      for (var i = 0; i < list.length; i++) {
        if ((list[i].voiceURI || list[i].name) === want) return list[i];
      }
    }
    for (var j = 0; j < list.length; j++) {
      if (/^zh[-_]?CN/i.test(String(list[j].lang || ''))) return list[j];
    }
    return list[0] || null;
  }

  /* 按句/逗号切段：短句朗读更稳，也能让高亮跟上 */
  function splitSegments(src) {
    var segs = [], cur = [], softAt = -1;
    function flush(n) {
      var part = cur.slice(0, n), rest = cur.slice(n), txt = '';
      for (var q = 0; q < part.length; q++) txt += part[q].ch;
      if (part.length && /\S/.test(txt)) {
        segs.push({ a: part[0].i, b: part[part.length - 1].i + 1, text: txt });
      }
      cur = rest;
      softAt = -1;
      for (var r = 0; r < rest.length; r++) {
        if (SOFT_BREAK.indexOf(rest[r].ch) >= 0) softAt = r;
      }
    }
    for (var i = 0; i < src.length; i++) {
      var ch = src.charAt(i);
      cur.push({ ch: ch, i: i });
      if (HARD_BREAK.indexOf(ch) >= 0) { flush(cur.length); continue; }
      if (SOFT_BREAK.indexOf(ch) >= 0) { softAt = cur.length - 1; continue; }
      if (cur.length >= 46) flush(softAt >= 6 ? softAt + 1 : cur.length);
      else if (cur.length >= 26 && softAt >= 6) flush(softAt + 1);
    }
    if (cur.length) flush(cur.length);
    return segs;
  }

  function tokLenMap() {
    var m = {};
    for (var i = 0; i < tokens.length; i++) {
      m[tokens[i].i] = String(tokens[i].ch || '').length || 1;
    }
    return m;
  }

  function clearTtsMark() {
    var cs = $('preview').querySelectorAll('.cell');
    for (var i = 0; i < cs.length; i++) cs[i].classList.remove('tts-on', 'tts-cur');
  }

  function paintRange(a, b) {
    TTS.range = { a: a, b: b };
    if (!TTS.playing || !S.followHighlight) { clearTtsMark(); return; }
    var cs = $('preview').querySelectorAll('.cell');
    var lens = tokLenMap();
    for (var i = 0; i < cs.length; i++) {
      var t = parseInt(cs[i].getAttribute('data-i'), 10);
      var L = lens[t] || 1;
      if (t + L > a && t < b) cs[i].classList.add('tts-on');
      else cs[i].classList.remove('tts-on');
    }
  }

  function paintChar(idx) {
    TTS.cur = idx;
    if (!TTS.playing || !S.followHighlight) return;
    var cs = $('preview').querySelectorAll('.cell');
    var hit = null;
    for (var i = 0; i < cs.length; i++) {
      if (parseInt(cs[i].getAttribute('data-i'), 10) === idx) { hit = cs[i]; cs[i].classList.add('tts-cur'); }
      else cs[i].classList.remove('tts-cur');
    }
    if (!hit) return;
    var paper = document.querySelector('.paper');
    if (!paper) return;
    var r = hit.getBoundingClientRect(), pr = paper.getBoundingClientRect();
    if (r.top < pr.top + 30 || r.bottom > pr.bottom - 30) {
      hit.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  function ttsUi() {
    var b = $('btnSpeak'), st = $('btnStopSpeak'), info = $('ttsStat');
    if (b) {
      b.textContent = TTS.playing ? (TTS.paused ? '▶ 继续' : '❚❚ 暂停') : '▶ 朗读';
      b.className = (TTS.playing && !TTS.paused) ? 'on' : '';
    }
    if (st) st.disabled = !TTS.playing;
    if (info) {
      if (!synth) info.textContent = '当前浏览器不支持系统语音';
      else if (!TTS.playing) info.textContent = '未朗读';
      else info.textContent = (TTS.paused ? '已暂停' : '朗读中') + ' · 第 ' + (TTS.i + 1) + '/' + TTS.segs.length + ' 句';
    }
  }

  function ttsStop() {
    TTS.playing = false; TTS.paused = false; TTS.i = -1; TTS.cur = -1; TTS.range = null; TTS.err = 0;
    if (synth) { try { synth.cancel(); } catch (e) {} }
    clearTtsMark();
    ttsUi();
  }

  function speakAt(k) {
    if (!TTS.playing) return;
    if (k >= TTS.segs.length) {
      TTS.playing = false; TTS.cur = -1;
      clearTtsMark();
      ttsUi();
      try { synth.cancel(); } catch (e) {}
      return;
    }
    TTS.i = k;
    var seg = TTS.segs[k];
    var u = new SpeechSynthesisUtterance(seg.text);
    var v = curVoice();
    if (v) u.voice = v;
    u.lang = (v && v.lang) || 'zh-CN';
    u.rate = Math.max(0.5, Math.min(2, +S.readRate || 1));
    u.pitch = 1;
    u.volume = 1;
    u.onstart = function () {
      if (!TTS.playing || TTS.i !== k) return;
      TTS.err = 0;
      paintRange(seg.a, seg.b);
      ttsUi();
    };
    u.onboundary = function (e) {
      if (!TTS.playing || TTS.paused || TTS.i !== k) return;
      if (typeof e.charIndex === 'number' && e.charIndex >= 0) paintChar(seg.a + e.charIndex);
    };
    u.onend = function () {
      if (!TTS.playing || TTS.i !== k) return;
      speakAt(k + 1);
    };
    u.onerror = function (e) {
      if (!TTS.playing || TTS.i !== k) return;
      if (e && /cancel|interrupt/i.test(String(e.error || ''))) return;
      TTS.err++;
      if (TTS.err >= 2) {
        var st = $('ttsStat');
        ttsStop();
        if (st) st.textContent = '朗读中断：系统语音不可用，请在「声音」里换一个中文发音';
        return;
      }
      speakAt(k + 1);
    };
    try { synth.speak(u); } catch (e) { speakAt(k + 1); }
  }

  function ttsToggle() {
    if (!synth) {
      if ($('ttsStat')) $('ttsStat').textContent = '当前浏览器不支持系统语音';
      return;
    }
    if (TTS.playing) {
      if (TTS.paused) { TTS.paused = false; try { synth.resume(); } catch (e) {} }
      else { TTS.paused = true; try { synth.pause(); } catch (e) {} }
      ttsUi();
      return;
    }
    var src = text || '';
    if (!/\S/.test(src)) return;
    TTS.segs = splitSegments(src);
    if (!TTS.segs.length) return;
    TTS.playing = true; TTS.paused = false; TTS.i = 0; TTS.cur = -1;
    try { synth.cancel(); } catch (e) {}
    /* 从第一句开始读 */
    speakAt(0);
  }


  function drawCanvas(scale, transparent) {
    relayout();
    var m = metrics();
    var padX = 40, padY = 34;
    var maxW = 0;
    for (var i = 0; i < lines.length; i++) if (lines[i].w > maxW) maxW = lines[i].w;
    var W = Math.ceil(maxW + padX * 2);
    var H = Math.ceil(lines.length * m.lineH + padY * 2);
    var cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(W * scale));
    cv.height = Math.max(1, Math.ceil(H * scale));
    var ctx = cv.getContext('2d');
    ctx.scale(scale, scale);
    if (!transparent) { ctx.fillStyle = '#fffdf8'; ctx.fillRect(0, 0, W, H); }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var li = 0; li < lines.length; li++) {
      var y0 = padY + li * m.lineH;
      var x = padX;
      for (var ci = 0; ci < lines[li].cells.length; ci++) {
        var c = lines[li].cells[ci];
        var cx = x + c.w / 2;
        if (S.showPy && c.py) {
          ctx.font = pyFont();
          ctx.fillStyle = S.pyColor;
          ctx.fillText(c.py, cx, y0 + m.pyH / 2 + 1);
        }
        if (S.showHanzi && c.hz) {
          ctx.font = hzFont();
          ctx.fillStyle = S.hanColor;
          ctx.fillText(c.hz, cx, y0 + m.pyH + m.gap + m.hzH / 2);
        }
        x += c.w;
      }
    }
    return { canvas: cv, w: W, h: H };
  }

  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }
  function stamp() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }
  function exportPng() {
    var r = drawCanvas(2, !!S.transparent);
    r.canvas.toBlob(function (b) { if (b) downloadBlob(b, '注音-' + stamp() + '.png'); }, 'image/png');
  }
  function copyPng() {
    var r = drawCanvas(2, !!S.transparent);
    r.canvas.toBlob(function (b) {
      if (!b) return;
      if (!navigator.clipboard || !window.ClipboardItem) { downloadBlob(b, '注音-' + stamp() + '.png'); return; }
      navigator.clipboard.write([new ClipboardItem({ 'image/png': b })])
        .catch(function () { downloadBlob(b, '注音-' + stamp() + '.png'); });
    }, 'image/png');
  }
  function exportHtml() {
    relayout();
    var m = metrics();
    var body = '';
    for (var i = 0; i < lines.length; i++) {
      body += '<div class="line" style="height:' + m.lineH + 'px">';
      for (var j = 0; j < lines[i].cells.length; j++) body += cellHtml(lines[i].cells[j], m);
      body += '</div>';
    }
    var doc = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>拼音注音</title>' +
      '<style>body{margin:0;padding:28px;background:#fffdf8;color:#1d1d1f;' +
      'font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif}' +
      '.line{white-space:nowrap}.cell{display:inline-block;vertical-align:top;text-align:center}' +
      '.cell .py{display:block}.cell .hz{display:block;white-space:pre}' +
      '@media print{body{padding:0}}</style></head><body>' + body + '</body></html>';
    downloadBlob(new Blob([doc], { type: 'text/html;charset=utf-8' }), '注音-' + stamp() + '.html');
  }
  function copyPy() {
    relayout();
    var parts = [];
    for (var i = 0; i < tokens.length; i++) {
      var p = displayPy(tokens[i]);
      if (p) parts.push(p);
      else if (!tokens[i].isZh && /^\s+$/.test(tokens[i].ch)) parts.push(' ');
    }
    var s = parts.join(' ').replace(/\s+/g, ' ').trim();
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s);
    else {
      var ta = document.createElement('textarea');
      ta.value = s; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    }
  }

  /* ---------- UI ---------- */
  function applySettingsToUi() {
    $('rngHan').value = S.hanSize; $('vHan').textContent = S.hanSize;
    $('rngPy').value = S.pySize; $('vPy').textContent = S.pySize;
    $('rngPyGap').value = S.pyGap; $('vPyGap').textContent = S.pyGap;
    $('rngGap').value = S.letterGap; $('vGap').textContent = S.letterGap;
    $('rngLine').value = S.lineGap; $('vLine').textContent = S.lineGap;
    $('rngCols').value = S.maxCols; $('vCols').textContent = S.maxCols;
    $('selHanFont').value = S.hanFont;
    $('selPyFont').value = S.pyFont;
    $('inpPyColor').value = S.pyColor;
    $('inpHanColor').value = S.hanColor;
    $('chkHanzi').checked = !!S.showHanzi;
    $('chkPy').checked = !!S.showPy;
    $('chkPoly').checked = !!S.markPoly;
    $('chkTrans').checked = !!S.transparent;
    var rr = Math.max(0.5, Math.min(2, +S.readRate || 1));
    S.readRate = rr;
    $('rngRate').value = rr; $('vRate').textContent = rr.toFixed(1) + '×';
    $('chkFollow').checked = !!S.followHighlight;
    var btns = $('segTone').getElementsByTagName('button');
    for (var i = 0; i < btns.length; i++) btns[i].className = (btns[i].getAttribute('data-tone') === S.tone) ? 'on' : '';
    $('src').value = text;
  }

  function bind(dictText) {
    $('rngHan').addEventListener('input', function () { S.hanSize = +this.value; $('vHan').textContent = this.value; render(); });
    $('rngPy').addEventListener('input', function () { S.pySize = +this.value; $('vPy').textContent = this.value; render(); });
    $('rngPyGap').addEventListener('input', function () { S.pyGap = +this.value; $('vPyGap').textContent = this.value; render(); });
    $('rngGap').addEventListener('input', function () { S.letterGap = +this.value; $('vGap').textContent = this.value; render(); });
    $('rngLine').addEventListener('input', function () { S.lineGap = +this.value; $('vLine').textContent = this.value; render(); });
    $('rngCols').addEventListener('input', function () { S.maxCols = +this.value; $('vCols').textContent = this.value; render(); });
    $('selHanFont').addEventListener('change', function () { S.hanFont = this.value; render(); });
    $('selPyFont').addEventListener('change', function () { S.pyFont = this.value; render(); });
    $('inpPyColor').addEventListener('input', function () { S.pyColor = this.value; render(); });
    $('inpHanColor').addEventListener('input', function () { S.hanColor = this.value; render(); });
    $('chkHanzi').addEventListener('change', function () { S.showHanzi = this.checked; render(); });
    $('chkPy').addEventListener('change', function () { S.showPy = this.checked; render(); });
    $('chkPoly').addEventListener('change', function () { S.markPoly = this.checked; render(); });
    $('chkTrans').addEventListener('change', function () { S.transparent = this.checked; saveState(); });

    $('segTone').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b) return;
      S.tone = b.getAttribute('data-tone');
      applySettingsToUi(); render();
    });

    /* --- 朗读 --- */
    $('btnSpeak').addEventListener('click', function () { ttsToggle(); });
    $('btnStopSpeak').addEventListener('click', function () { ttsStop(); });
    $('rngRate').addEventListener('input', function () {
      S.readRate = Math.round((+this.value) * 10) / 10;
      $('vRate').textContent = S.readRate.toFixed(1) + '×';
      saveState();
    });
    $('selVoice').addEventListener('change', function () {
      S.readVoice = this.value;
      saveState();
    });
    $('chkFollow').addEventListener('change', function () {
      S.followHighlight = this.checked;
      saveState();
      if (S.followHighlight && TTS.playing && TTS.range) paintRange(TTS.range.a, TTS.range.b);
      else clearTtsMark();
    });
    if (synth) {
      var onVoices = function () { refreshVoices(); };
      if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', onVoices);
      else synth.onvoiceschanged = onVoices;
      refreshVoices();
      setTimeout(refreshVoices, 500);
      setTimeout(refreshVoices, 1600);
    }
    window.addEventListener('beforeunload', function () {
      if (synth) { try { synth.cancel(); } catch (e) {} }
    });

    var ta = $('src');
    var timer = null;
    ta.addEventListener('input', function () {
      if (TTS.playing) ttsStop();
      text = ta.value;
      if (timer) clearTimeout(timer);
      timer = setTimeout(render, 80);
    });

    var db = $('dictBox');
    db.value = dictText || '';
    var dtimer = null;
    db.addEventListener('input', function () {
      if (dtimer) clearTimeout(dtimer);
      dtimer = setTimeout(function () {
        buildDict(db.value);
        try { localStorage.setItem('pystudio.dict', db.value); } catch (e) {}
        render();
      }, 260);
    });
    $('btnDictSample').addEventListener('click', function () {
      db.value = '';
      buildDict('');
      try { localStorage.setItem('pystudio.dict', ''); } catch (e) {}
      render();
    });

    $('btnSample').addEventListener('click', function () { text = SAMPLE; ta.value = SAMPLE; render(); });
    $('btnClear').addEventListener('click', function () { text = ''; ta.value = ''; overrides = {}; render(); });

    $('btnPng').addEventListener('click', exportPng);
    $('btnCopyImg').addEventListener('click', copyPng);
    $('btnHtml').addEventListener('click', exportHtml);
    $('btnPrint').addEventListener('click', function () { window.print(); });
    $('btnCopyPy').addEventListener('click', copyPy);

    $('preview').addEventListener('click', function (e) {
      var cell = e.target.closest ? e.target.closest('.cell') : null;
      if (!cell) return;
      var idx = parseInt(cell.getAttribute('data-i'), 10);
      var tok = findToken(idx);
      if (!tok || !tok.isZh) return;
      showPop(cell, tok);
    });

    $('pop').addEventListener('click', function (e) {
      var pop = $('pop');
      var idx = parseInt(pop.dataset.idx, 10);
      var ch = pop.dataset.ch;
      var rd = e.target.closest ? e.target.closest('.rd') : null;
      if (rd) { setOverride(idx, ch, rd.getAttribute('data-py')); return; }
      if (e.target.id === 'popSet') { setOverride(idx, ch, $('popInput').value); return; }
      if (e.target.id === 'popAuto') {
        delete overrides[idx];
        saveState(); render(); hidePop();
      }
    });

    document.addEventListener('mousedown', function (e) {
      var pop = $('pop');
      if (pop.hidden) return;
      if (pop.contains(e.target)) return;
      if (e.target.closest && e.target.closest('.cell')) return;
      hidePop();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { hidePop(); if (TTS.playing) ttsStop(); }
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'r' || e.key === 'R')) { ttsToggle(); e.preventDefault(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { render(); e.preventDefault(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { exportPng(); e.preventDefault(); }
    });

    var rt = null;
    window.addEventListener('resize', function () {
      if (rt) clearTimeout(rt);
      rt = setTimeout(render, 180);
    });
  }

  var dictText = loadState();
  try {
    var qm = location.search.match(/[?&]t=([^&]*)/);
    if (qm) text = decodeURIComponent(qm[1].replace(/\+/g, ' '));
  } catch (e) {}

  bind(dictText);
  applySettingsToUi();
  if (!text) { text = SAMPLE; }
  render();
  ttsUi();
  if (/selftest/.test(location.search)) {
    try {
      var rr = drawCanvas(2, false);
      var cx2 = rr.canvas.getContext('2d');
      var dw = rr.canvas.width, dh = rr.canvas.height;
      var dd = cx2.getImageData(0, 0, dw, dh).data;
      var nonbg = 0;
      for (var p2 = 0; p2 < dd.length; p2 += 4 * 61) {
        if (!(dd[p2] > 250 && dd[p2 + 1] > 250 && dd[p2 + 2] > 245)) nonbg++;
      }
      document.title = 'SELFTEST w=' + dw + ' h=' + dh + ' nonbg=' + nonbg;
      if (/selftest=img/.test(location.search)) {
        document.body.innerHTML = '<img style="display:block" src="' + rr.canvas.toDataURL('image/png') + '">';
      }
    } catch (err) { document.title = 'SELFTEST ERR ' + err.message; }
  }

  window.__pyStudio = {
    render: render,
    analyze: analyze,
    setText: function (t) { text = t; $('src').value = t; render(); },
    info: function () { return { tokens: tokens.length, lines: lines.length, dict: dictKeys.length }; },
    tts: {
      toggle: function () { ttsToggle(); },
      stop: function () { ttsStop(); },
      state: function () { return { playing: TTS.playing, paused: TTS.paused, i: TTS.i, segs: TTS.segs.length }; },
      segments: function () { return splitSegments(text || ''); }
    }
  };
})();
