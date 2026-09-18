(function(){
  var D = FLIGHT_DATA;
  var dests = D.destinations.slice();
  var currentCategory = 'all'; // 'all' | 'legacy' | 'lcc'

  function fmtTWD(n){ return 'NT$' + Number(n).toLocaleString('en-US'); }
  function fmtDate(s){
    if(!s) return '';
    var p = s.split('-');
    return p[1] + '/' + p[2];
  }
  function block(d, cat){
    // cat: 'overall' | 'legacy' | 'lcc'
    return d[cat];
  }

  // ---------- header stat row ----------
  var statRow = document.getElementById('statRow');
  var chips = [
    ['總查票筆數', D.total_records + ' 筆'],
    ['目的地數', D.total_destinations + ' 個'],
    ['查票期間', D.coverage_start.slice(0,7).replace('-', '/') + ' ~ ' + D.coverage_end.slice(0,7).replace('-', '/')],
    ['最後更新', D.generated.replace(/-/g, '/')]
  ];
  chips.forEach(function(c){
    var el = document.createElement('div');
    el.className = 'stat-chip';
    el.innerHTML = c[0] + ' <b>' + c[1] + '</b>';
    statRow.appendChild(el);
  });

  // ---------- destination grid, grouped by country ----------
  function legHtml(timeObj){
    if(!timeObj) return '';
    var icon = timeObj.tag ? (timeObj.tag.charAt(0) === '晚' ? '🌙' : '🌅') : '';
    return timeObj.display + (timeObj.tag ? ' <span class="tag">' + icon + timeObj.tag + '</span>' : '');
  }

  // one full-width block per carrier type: labeled "目前查到的最低價格" + that
  // type's own cheapest flight (with times) + that type's OWN 歷史區間/中位數
  // (never blended with the other carrier type -- blending "loses meaning")
  function typeBlockHtml(stat, label, icon){
    if(!stat){
      return '<div class="type-block empty">' +
        '<div class="tb-head"><span class="tb-label">' + icon + ' ' + label + '</span></div>' +
        '<div class="tb-empty-text">尚無資料</div>' +
      '</div>';
    }
    var goLeg = legHtml(stat.cheapest_go_time);
    var retLeg = legHtml(stat.cheapest_ret_time);
    return '<div class="type-block">' +
      '<div class="tb-head"><span class="tb-label">' + icon + ' ' + label + '</span><span class="tb-count">' + stat.count + ' 筆</span></div>' +
      '<span class="tb-current-tag">目前查到的最低價格</span>' +
      '<div class="tb-price">' + fmtTWD(stat.min) + '</div>' +
      '<div class="tb-airline">' + stat.cheapest_airline + '</div>' +
      (goLeg ? '<div class="tb-leg">去 ' + fmtDate(stat.cheapest_go) + '　' + goLeg + '</div>' : '') +
      (retLeg ? '<div class="tb-leg">回 ' + fmtDate(stat.cheapest_ret) + '　' + retLeg + '</div>' : '') +
      '<div class="tb-stats">歷史區間 ' + fmtTWD(stat.min) + ' – ' + fmtTWD(stat.max) + '　中位數 ' + fmtTWD(stat.median) + '</div>' +
    '</div>';
  }

  function typeBlocksHtml(legacyStat, lccStat){
    return '<div class="type-blocks">' +
      typeBlockHtml(legacyStat, '傳統航空', '✈️') +
      typeBlockHtml(lccStat, '廉價航空', '🎫') +
    '</div>';
  }

  // multi-origin destinations: show origin buttons first, no price -- the
  // carrier-type breakdown for an origin only appears once that origin is clicked
  function originSwitcherHtml(d, originKeys){
    return '<div class="origin-switcher">' + originKeys.map(function(o){
      return '<button type="button" class="origin-btn" data-origin="' + o + '">🛫 ' + o +
        ' <span class="ob-count">' + d.origins[o].count + '筆</span></button>';
    }).join('') + '</div>';
  }

  function originPanelsHtml(d, originKeys){
    return '<div class="origin-placeholder">點選上方出發地，查看該出發地的傳統航空／廉價航空價格。</div>' +
      originKeys.map(function(o){
        var st = d.origins[o];
        return '<div class="origin-panel" data-origin="' + o + '" hidden>' + typeBlocksHtml(st.legacy, st.lcc) + '</div>';
      }).join('');
  }

  function destCardHtml(d){
    var ov = d.overall;
    var originKeys = Object.keys(d.origins || {});
    var body = originKeys.length > 1
      ? (originSwitcherHtml(d, originKeys) + originPanelsHtml(d, originKeys))
      : typeBlocksHtml(d.legacy, d.lcc);
    return '<div class="row1">' +
        '<span class="city">' + d.flag + ' ' + d.dest + '<span class="iata">' + d.iata + '</span></span>' +
        '<span class="count-badge">' + ov.count + ' 筆</span>' +
      '</div>' +
      body +
      '<div class="divider">' +
        '<div class="checked">查於 ' + (d.most_recent_check || '—') + '</div>' +
        '<div class="stale-warning">⚠️ 此為過去查票紀錄，實際票價可能已變動。</div>' +
      '</div>';
  }

  // wires up a card's origin-switcher buttons (if any) so clicking one reveals
  // that origin's panel and doesn't bubble up into the card's own selectDest click
  function wireOriginSwitcher(card){
    var btns = card.querySelectorAll('.origin-btn');
    if(!btns.length) return;
    btns.forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        var origin = btn.getAttribute('data-origin');
        btns.forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        card.querySelectorAll('.origin-panel').forEach(function(p){
          p.hidden = (p.getAttribute('data-origin') !== origin);
        });
        var placeholder = card.querySelector('.origin-placeholder');
        if(placeholder) placeholder.hidden = true;
      });
    });
  }

  // group destinations by country, order countries by total record count desc
  var byCountry = {};
  dests.forEach(function(d){
    (byCountry[d.country] = byCountry[d.country] || []).push(d);
  });
  var countryList = Object.keys(byCountry).map(function(name){
    var list = byCountry[name];
    var total = list.reduce(function(s, d){ return s + d.overall.count; }, 0);
    var minPrice = Math.min.apply(null, list.map(function(d){ return d.overall.min; }));
    return {name: name, flag: list[0].flag, list: list, total: total, minPrice: minPrice};
  });
  countryList.sort(function(a, b){ return b.total - a.total; });

  // ---------- home view: one compact tile per country ----------
  var tileGrid = document.getElementById('countryTiles');
  var countryDetailWrap = document.getElementById('countryDetail');
  var countryDetailBody = document.getElementById('countryDetailBody');
  var detailPanels = {}; // country name -> built DOM node (built lazily, cached)

  function buildCountryPanel(cg){
    var mainDests = cg.list.filter(function(d){ return d.overall.count >= 2; });
    var soloDests = cg.list.filter(function(d){ return d.overall.count < 2; });

    var group = document.createElement('div');
    group.className = 'country-group';

    var head = document.createElement('div');
    head.className = 'country-head';
    head.innerHTML = '<span class="flag">' + cg.flag + '</span>' +
      '<span class="name">' + cg.name + '</span>' +
      '<span class="meta">' + cg.list.length + ' 個目的地・共 ' + cg.total + ' 筆</span>';
    group.appendChild(head);

    if(mainDests.length){
      var grid = document.createElement('div');
      grid.className = 'dest-grid';
      mainDests.forEach(function(d){
        var card = document.createElement('div');
        card.className = 'dest-card';
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', d.dest + ' 的查票紀錄，最低 ' + fmtTWD(d.overall.min));
        card.innerHTML = destCardHtml(d);
        wireOriginSwitcher(card);
        card.addEventListener('click', function(){ selectDest(d.dest); });
        card.addEventListener('keydown', function(e){
          if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); selectDest(d.dest); }
        });
        grid.appendChild(card);
      });
      group.appendChild(grid);
    }

    if(soloDests.length){
      var soloNote = document.createElement('p');
      soloNote.className = 'section-note';
      soloNote.style.margin = '10px 0 8px';
      soloNote.textContent = '這個國家還查過（僅 1 筆，僅供參考）：';
      group.appendChild(soloNote);
      var moreList = document.createElement('div');
      moreList.className = 'more-list';
      soloDests.forEach(function(d){
        var el = document.createElement('div');
        el.className = 'more-item';
        el.style.cursor = 'pointer';
        el.innerHTML = '<span class="city">' + d.flag + ' ' + d.dest + '</span><span class="price">' + fmtTWD(d.overall.min) + '</span>';
        el.addEventListener('click', function(){ selectDest(d.dest); });
        moreList.appendChild(el);
      });
      group.appendChild(moreList);
    }

    return group;
  }

  function showCountry(name){
    var cg = countryList.filter(function(c){ return c.name === name; })[0];
    if(!cg) return;
    if(!detailPanels[name]){
      detailPanels[name] = buildCountryPanel(cg);
    }
    Object.keys(detailPanels).forEach(function(k){ detailPanels[k].hidden = (k !== name); });
    if(!countryDetailBody.contains(detailPanels[name])){
      countryDetailBody.appendChild(detailPanels[name]);
    }
    tileGrid.hidden = true;
    countryDetailWrap.style.display = 'block';
    countryDetailWrap.scrollIntoView({behavior:'smooth', block:'start'});
  }

  function showCountryList(){
    countryDetailWrap.style.display = 'none';
    tileGrid.hidden = false;
    tileGrid.scrollIntoView({behavior:'smooth', block:'start'});
  }

  countryList.forEach(function(cg){
    var tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'country-tile';
    tile.setAttribute('aria-label', '查看 ' + cg.name + ' 的城市查票紀錄');
    tile.innerHTML =
      '<div class="ct-top"><span class="ct-flag">' + cg.flag + '</span><span class="ct-name">' + cg.name + '</span></div>' +
      '<div class="ct-meta">' + cg.list.length + ' 個目的地・共 ' + cg.total + ' 筆</div>' +
      '<div class="ct-price">最低查到 <b>' + fmtTWD(cg.minPrice) + '</b></div>' +
      '<div class="ct-arrow">查看城市 →</div>';
    tile.addEventListener('click', function(){ showCountry(cg.name); });
    tileGrid.appendChild(tile);
  });

  document.getElementById('backToCountries').addEventListener('click', showCountryList);

  // ---------- comparator ----------
  var select = document.getElementById('destSelect');
  dests.forEach(function(d){
    var opt = document.createElement('option');
    opt.value = d.dest;
    opt.textContent = d.flag + ' ' + d.dest + '（' + d.overall.count + ' 筆）';
    select.appendChild(opt);
  });

  function selectDest(name){
    select.value = name;
    document.getElementById('comparator-section').scrollIntoView({behavior:'smooth', block:'start'});
    document.getElementById('priceInput').focus();
  }

  // category toggle
  var toggleWrap = document.getElementById('categoryToggle');
  toggleWrap.querySelectorAll('button').forEach(function(btn){
    btn.addEventListener('click', function(){
      toggleWrap.querySelectorAll('button').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      currentCategory = btn.getAttribute('data-cat');
    });
  });

  // origin toggle
  var currentOrigin = 'all'; // 'all' | '台北' | '台中' | '高雄'
  var originToggleWrap = document.getElementById('originToggle');
  originToggleWrap.querySelectorAll('button').forEach(function(btn){
    btn.addEventListener('click', function(){
      originToggleWrap.querySelectorAll('button').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      currentOrigin = btn.getAttribute('data-origin');
    });
  });

  // month select -- filters by the MONTH of 去程日期 (go_date), not tied to any
  // year, since the question is "is this a cheap month to fly", not "which year"
  var monthSelect = document.getElementById('monthSelect');
  var MONTH_LABEL = {all:'不限月份'};
  for(var mi=1; mi<=12; mi++){ MONTH_LABEL[(mi<10?'0':'')+mi] = mi + '月'; }

  function percentile(sortedPrices, p){
    var n = sortedPrices.length;
    if(n === 1) return sortedPrices[0];
    var idx = (p/100) * (n-1);
    var lo = Math.floor(idx), hi = Math.ceil(idx);
    if(lo === hi) return sortedPrices[lo];
    return sortedPrices[lo] + (sortedPrices[hi]-sortedPrices[lo]) * (idx-lo);
  }

  function classify(pct){
    // 3-tier verdict: pct = % of historical records at this price or higher
    // (i.e. how many records this price beats-or-ties on cheapness)
    if(pct >= 75) return {label:'划算', icon:'🟢', varName:'--good', direction:'cheap',
      advice:'可以考慮下手。'};
    if(pct >= 25) return {label:'合理', icon:'🟡', varName:'--warning', direction:'cheap',
      advice:'價格算合理，可以再觀察看看。'};
    return {label:'偏貴', icon:'🔴', varName:'--critical', direction:'expensive',
      advice:'如果日期可以調整，建議再比價看看。'};
  }

  var CAT_LABEL = {all:'不分類型', legacy:'傳統航空', lcc:'廉價航空'};
  var ORIGIN_LABEL = {all:'不分出發地', '台北':'台北出發', '台中':'台中出發', '高雄':'高雄出發'};

  // ---------- anonymous query logging (Supabase) ----------
  // Fire-and-forget: never blocks the UI and never throws up to the caller.
  // If supabase-config.js hasn't been filled in yet, or the network call fails,
  // this silently no-ops -- the comparator must keep working either way.
  // Only the fields described in the privacy notice are sent: 出發地／目的地／
  // 航空公司類型／輸入的機票價格／查詢結果的價格百分位。查詢時間由資料庫的
  // created_at 預設值記錄，不從瀏覽器端送出時間戳記。
  function logQueryAnonymously(payload){
    if (!window.supabaseClient) return;
    try {
      window.supabaseClient.from('fare_checks').insert([payload]).then(function(res){
        if (res && res.error){
          console.warn('[Luluplore] 查詢紀錄寫入失敗（不影響查票功能）：', res.error.message);
        }
      });
    } catch (e){
      console.warn('[Luluplore] 查詢紀錄寫入時發生錯誤（不影響查票功能）：', e);
    }
  }

  document.getElementById('checkBtn').addEventListener('click', function(){
    var destName = select.value;
    var priceVal = parseFloat(document.getElementById('priceInput').value);
    var hint = document.getElementById('placeholderHint');
    var panel = document.getElementById('resultPanel');

    if(!destName || isNaN(priceVal) || priceVal <= 0){
      hint.textContent = '請先選城市、並輸入有效的票價數字喔。';
      hint.style.color = 'var(--critical)';
      hint.style.display = 'block';
      panel.hidden = true;
      return;
    }

    var d = dests.filter(function(x){ return x.dest === destName; })[0];
    var currentMonth = monthSelect.value; // 'all' | '01'..'12'

    // filter this destination's raw records by carrier-type + departure-city +
    // departure-month, so any combination of the three works without precomputing
    // every combo
    function matchesCatOrigin(r){
      // r.legacy is true/false, or null for a mixed-carrier itinerary (different
      // airline each leg) -- null is excluded from BOTH the legacy and lcc filters,
      // only showing up under "不分類型".
      var catOk = currentCategory === 'all' || (currentCategory === 'legacy' ? r.legacy === true : r.legacy === false);
      var originOk = currentOrigin === 'all' || r.origin === currentOrigin;
      return catOk && originOk;
    }
    function matchesMonth(r){
      return currentMonth === 'all' || (r.go_date && r.go_date.slice(5,7) === currentMonth);
    }

    var baseFiltered = d.records.filter(matchesCatOrigin); // cat+origin only, no month
    var filtered = baseFiltered.filter(matchesMonth);
    var comboLabel = CAT_LABEL[currentCategory] + '・' + ORIGIN_LABEL[currentOrigin] +
      (currentMonth === 'all' ? '' : '・' + MONTH_LABEL[currentMonth]);

    if(!baseFiltered.length){
      hint.textContent = '「' + destName + '」目前還沒有「' + CAT_LABEL[currentCategory] + '・' + ORIGIN_LABEL[currentOrigin] + '」的查票記錄，選別的條件或別的城市看看吧。';
      hint.style.color = 'var(--critical)';
      hint.style.display = 'block';
      panel.hidden = true;
      return;
    }

    // selected month has zero records for this dest+category+origin combo --
    // fall back to showing the unfiltered-by-month result rather than a dead end,
    // and say so clearly instead of silently ignoring the user's month choice
    var monthFellBack = false;
    if(currentMonth !== 'all' && !filtered.length){
      filtered = baseFiltered;
      monthFellBack = true;
    }
    hint.style.display = 'none';

    var prices = filtered.map(function(r){ return r.price; }).sort(function(a,b){ return a-b; });
    var n = prices.length;
    var min = prices[0], max = prices[n-1];
    var beatOrEqual = prices.filter(function(p){ return p >= priceVal; }).length;
    var pct = Math.round(beatOrEqual/n*100);
    var v = classify(pct);
    var displayPct = v.direction === 'cheap' ? pct : (100 - pct);
    var compareWord = v.direction === 'cheap' ? '更便宜' : '更貴';

    logQueryAnonymously({
      origin: currentOrigin === 'all' ? null : currentOrigin,
      destination: destName,
      category: currentCategory,
      month: currentMonth === 'all' ? null : currentMonth,
      input_price: priceVal,
      percentile: pct
    });

    panel.hidden = false;

    var chip = document.getElementById('verdictChip');
    chip.innerHTML = '<span class="icon">' + v.icon + '</span>' + v.label;
    chip.style.background = 'color-mix(in srgb, var(' + v.varName + ') 18%, var(--surface))';
    chip.style.color = 'var(' + v.varName + ')';
    chip.style.border = '1.5px solid var(' + v.varName + ')';

    document.getElementById('resultSentence').innerHTML =
      '比 ' + displayPct + '% 的歷史查票' + compareWord;

    document.getElementById('luluAdvice').innerHTML =
      'Lulu 建議：<b>' + v.advice + '</b>';

    var marker = document.getElementById('gaugeMarker');
    marker.style.left = 'calc(' + pct + '% - 1px)';

    var monthFallbackNote = document.getElementById('monthFallbackNote');
    if(monthFellBack){
      monthFallbackNote.innerHTML = '<div class="month-fallback">「' + destName + '」在 ' + MONTH_LABEL[currentMonth] + '（' + CAT_LABEL[currentCategory] + '・' + ORIGIN_LABEL[currentOrigin] + '）還沒有查票記錄，以下顯示不限月份的比較結果。</div>';
    } else {
      monthFallbackNote.innerHTML = '';
    }

    var lowSampleNote = document.getElementById('lowSampleNote');
    if(n < 3){
      lowSampleNote.innerHTML = '<div class="low-sample">⚠️ 目前「' + destName + '」在「' + comboLabel + '」只有 ' + n + ' 筆查票記錄，樣本太少，這個判斷僅供參考，還不夠準。</div>';
    } else {
      lowSampleNote.innerHTML = '';
    }

    // lightweight festival footnote -- purely informational (how many of the
    // matched records happen to be tagged 暑假/連假/寒假/過年), never turned into
    // a computed "節慶 costs +NT$X" stat (many 節慶-tagged rows are actually
    // early-bird promo prices, so an aggregate premium claim would mislead)
    var festivalNote = document.getElementById('festivalNote');
    var festCounts = {};
    filtered.forEach(function(r){
      if(r.festival) festCounts[r.festival] = (festCounts[r.festival] || 0) + 1;
    });
    var festKeys = Object.keys(festCounts);
    if(festKeys.length){
      var festParts = festKeys.map(function(k){ return k + ' ' + festCounts[k] + ' 筆'; });
      festivalNote.innerHTML = '<div class="festival-note">📌 這 ' + n + ' 筆裡有 ' + festParts.join('、') + ' 是節慶期間查到的，價格可能不完全代表平常水準。</div>';
    } else {
      festivalNote.innerHTML = '';
    }

    var p25 = percentile(prices, 25), p50 = percentile(prices, 50), p75 = percentile(prices, 75);

    var whyContent = document.getElementById('whyContent');
    whyContent.innerHTML =
      '<div class="why-row"><span>' + d.flag + ' ' + destName + '（' + comboLabel + '）歷史中位數</span><b>' + fmtTWD(Math.round(p50)) + '</b></div>' +
      '<div class="why-row"><span>歷史最低</span><b>' + fmtTWD(min) + '</b></div>' +
      '<div class="why-row"><span>你查到的價格</span><b>' + fmtTWD(priceVal) + '</b></div>' +
      '<div class="why-row"><span>比較結果</span><b>比 ' + displayPct + '% 的歷史查票' + compareWord + '</b></div>' +
      '<div class="why-season">💡 如果是旺季、連假、寒暑假前後查到的，價格本來就會比平日高一些，不一定代表不划算，可以綜合考慮再決定。</div>';

    var table = document.getElementById('statTable');
    table.innerHTML =
      '<tr><th>統計項目</th><th>最低</th><th>25%位</th><th>中位數</th><th>75%位</th><th>最高</th><th>你輸入</th></tr>' +
      '<tr><td>' + destName + '（' + n + ' 筆）</td>' +
      '<td>' + fmtTWD(min) + '</td>' +
      '<td>' + fmtTWD(Math.round(p25)) + '</td>' +
      '<td>' + fmtTWD(Math.round(p50)) + '</td>' +
      '<td>' + fmtTWD(Math.round(p75)) + '</td>' +
      '<td>' + fmtTWD(max) + '</td>' +
      '<td style="font-weight:700;color:var(' + v.varName + ')">' + fmtTWD(priceVal) + '</td></tr>';
  });
})();
