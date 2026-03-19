/**
 * InZen - Algoritma Dedektörü
 * Etkileşim hızı ve yorum kalitesi analizi. Cyberpunk modu overlay.
 */

(function () {
  'use strict';

  const processedPosts = new WeakSet();
  const GENERIC_WORDS = [
    'tebrikler', 'harika', 'congrats', 'congratulations', 'katılıyorum',
    'great', 'awesome', 'agree', 'agreed', 'nice', 'güzel', 'bravo',
    'amazing', 'wonderful', 'excellent', 'mükemmel', 'süper', '👍', '🎉'
  ];

  const CRINGE_WORDS = ['uzmanı', 'kesin doğrular', 'herkes', 'başarı hikayesi', 'fırsat'];

  const HOOK_WORDS = ['uzmanı', 'herkes', 'kesin bilgi', 'asla', 'başarı'];

  const NOISE_WORDS = ['humbled', 'proud', 'announcement', 'excited', 'guru', 'mentor', 'vizyoner'];

  const ALGORITHM_TRAP_WORDS = [
    'Katılıyor musunuz?',
    'Yorumlarda buluşalım',
    'Sizin fikriniz?',
    'Nokta koyun'
  ];

  const LOAD_MORE_PATTERNS = [
    'daha fazla yorum yükle',
    'load more comments',
    'view more comments',
    'view previous comments',
    'daha fazla yorum',
    'yorumları görüntüle',
    'tüm yorumları gör'
  ];

  // Anti-Forensics: Dijital izi bulanıklaştırma - algoritmayı şaşırtacak rastgele sinyaller
  function ghostInteract() {
    console.log('InZen: Dijital iziniz bulanıklaştırılıyor (Anti-Forensics)...');
    try {
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * window.innerHeight;
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }));
      const dy = Math.round((Math.random() - 0.5) * 2);
      const dx = Math.round((Math.random() - 0.5) * 2);
      if (dx !== 0 || dy !== 0) {
        window.scrollBy(dx, dy);
        setTimeout(() => window.scrollBy(-dx, -dy), 80 + Math.random() * 120);
      }
    } catch (_) {}
  }

  const POST_SELECTORS = [
    '.feed-shared-update-v2',
    '.feed-shared-update-v3',
    '[data-id^="urn:li:activity:"]',
    'article[data-activity-urn^="urn:li:activity:"]',
    '[class*="feed-shared-update"]',
    'div[data-urn]',
    '.relative.display-flex',
    '.display-flex.relative'
  ];

  function findFeedPost(el) {
    let current = el;
    while (current && current !== document.body) {
      for (const sel of POST_SELECTORS) {
        try {
          if (current.matches?.(sel)) return current;
          const found = current.closest?.(sel);
          if (found) return found;
        } catch (_) {}
      }
      const id = current.getAttribute?.('data-id') || current.getAttribute?.('data-activity-urn') || current.getAttribute?.('data-urn') || '';
      if (id.startsWith('urn:li:activity:')) return current;
      current = current.parentElement;
    }
    return null;
  }

  function parseLikeCount(text) {
    if (!text) return 0;
    const cleaned = String(text).replace(/[^\d.KkMm]/g, '');
    if (!cleaned) return 0;
    const num = parseFloat(cleaned);
    if (cleaned.toLowerCase().includes('k')) return num * 1000;
    if (cleaned.toLowerCase().includes('m')) return num * 1000000;
    return num;
  }

  function parseTimeToMinutes(text) {
    if (!text) return null;
    const t = String(text).toLowerCase().trim();
    const m = t.match(/(\d+)\s*(m|min|h|hr|d|day|w|week|mo|y)s?/);
    if (!m) return null;
    const val = parseInt(m[1], 10);
    const u = m[2];
    if (u === 'm' || u === 'min') return val;
    if (u === 'h' || u === 'hr') return val * 60;
    if (u === 'd' || u === 'day') return val * 1440;
    if (u === 'w' || u === 'week') return val * 10080;
    if (u === 'mo') return val * 43200;
    if (u === 'y') return val * 525600;
    return null;
  }

  function getEngagement(post) {
    const allText = (post.innerText || post.textContent || '');
    let likeCount = 0;
    let timeMinutes = null;

    const likeEls = post.querySelectorAll('[class*="social-details-social-counts"], [class*="reactions"]');
    likeEls.forEach((el) => {
      const n = parseLikeCount((el.textContent || '').replace(/\s/g, ''));
      if (n > likeCount) likeCount = n;
    });

    const timePatterns = [/(\d+)\s*(m|min|h|hr|d|day|w|week|mo|y)s?\s*(ago)?/gi, /(\d+)(m|h|d|w|mo|y)\b/g];
    for (const p of timePatterns) {
      try {
        for (const match of allText.matchAll(p)) {
          const mins = parseTimeToMinutes(match[0]);
          if (mins != null && (timeMinutes == null || mins < timeMinutes)) timeMinutes = mins;
        }
      } catch (_) {}
    }
    return { likeCount, timeMinutes };
  }

  function getPostText(post) {
    const desc = post.querySelector('.feed-shared-update-v2__description, [class*="feed-shared-update"] [class*="description"]');
    return (desc?.innerText || desc?.textContent || post.innerText || post.textContent || '').toLowerCase();
  }

  function countHookWords(post) {
    const text = getPostText(post);
    return HOOK_WORDS.filter((w) => text.includes(w)).length;
  }

  function countNoiseWords(post) {
    const text = getPostText(post);
    return NOISE_WORDS.filter((w) => text.toLowerCase().includes(w.toLowerCase())).length;
  }

  function countAlgorithmTrapPhrases(post) {
    const text = (post.innerText || post.textContent || '').toLowerCase();
    return ALGORITHM_TRAP_WORDS.filter((p) => text.includes(p.toLowerCase())).length;
  }

  function getCommentCount(post) {
    const allText = (post.innerText || post.textContent || '');
    const m = allText.match(/(\d+)\s*(yorum|comment)/i) || allText.match(/(yorum|comment)s?\s*(\d+)/i);
    if (m) return parseInt(m[1], 10) || parseInt(m[2], 10) || 0;
    return 0;
  }

  function getComments(post) {
    const comments = [];
    const sel = '[class*="comment"] span, [class*="comments"] span, .comments-comments-list__comment-item span';
    try {
      post.querySelectorAll(sel).forEach((el) => {
        const t = (el.textContent || '').trim();
        if (t.length > 1 && t.length < 400 && !comments.includes(t)) comments.push(t);
      });
    } catch (_) {}
    return comments.slice(0, 10);
  }

  function hasGenericDominance(comments) {
    if (comments.length < 1) return false;
    let match = 0;
    comments.forEach((c) => {
      const lower = (c || '').toLowerCase();
      if (GENERIC_WORDS.some((w) => lower.includes(w))) match++;
    });
    return match / comments.length >= 0.5;
  }

  function countCringeWords(post) {
    const text = (post.innerText || post.textContent || '').toLowerCase();
    return CRINGE_WORDS.filter((w) => text.includes(w)).length;
  }

  function isPromoted(post) {
    const text = (post.innerText || post.textContent || '');
    return /Promoted|Promosyon/i.test(text) ||
      Array.from(post.querySelectorAll('span, div, p')).some((el) => {
        const t = (el.textContent || '').trim();
        return t === 'Promoted' || t.startsWith('Promoted');
      });
  }

  function getAuthorId(post) {
    const link = post.querySelector('a[href*="/in/"]');
    if (!link) return null;
    const href = (link.getAttribute('href') || '').split('?')[0];
    const match = href.match(/\/in\/([^/]+)/);
    return match ? match[1] : href;
  }

  function loadMutedAuthors() {
    return new Promise((resolve) => {
      if (typeof chrome?.storage?.local?.get !== 'function') {
        resolve([]);
        return;
      }
      chrome.storage.local.get(['inzenMutedAuthors'], (data) => {
        resolve(data.inzenMutedAuthors || []);
      });
    });
  }

  function saveMutedAuthors(authors) {
    if (typeof chrome?.storage?.local?.set !== 'function') return;
    chrome.storage.local.set({ inzenMutedAuthors: authors });
  }

  function addToMuteList(authorId) {
    loadMutedAuthors().then((authors) => {
      if (!authorId || authors.includes(authorId)) return;
      authors.push(authorId);
      saveMutedAuthors(authors);
    });
  }

  function hasLoadMoreCommentsButton(post) {
    const allText = (post.innerText || post.textContent || '').toLowerCase();
    for (const p of LOAD_MORE_PATTERNS) {
      if (allText.includes(p)) return true;
    }
    return false;
  }

  function analyzePost(post) {
    const { likeCount, timeMinutes } = getEngagement(post);
    const comments = getComments(post);

    let velocityScore = 0;
    if (timeMinutes != null && timeMinutes < 60 && likeCount > 50) {
      velocityScore = 50;
    }

    let manipulationScore = 0;
    if (comments.length >= 2 && hasGenericDominance(comments)) {
      manipulationScore += 45;
    }
    if (velocityScore >= 50) {
      manipulationScore += 25;
    }
    const cringeCount = countCringeWords(post);
    if (cringeCount > 2) {
      manipulationScore += 20;
    }

    const hookCount = countHookWords(post);
    if (hookCount > 0) {
      manipulationScore += hookCount * 15;
    }

    const noiseCount = countNoiseWords(post);
    if (noiseCount > 0) {
      manipulationScore += noiseCount * 12;
    }

    const trapCount = countAlgorithmTrapPhrases(post);
    if (trapCount > 0) {
      manipulationScore += trapCount * 25;
    }

    const commentCount = Math.max(comments.length, getCommentCount(post));
    if (likeCount > 0 && commentCount > likeCount * 0.2) {
      manipulationScore += 35;
    }

    let engagementLoopScore = 0;
    if (hasLoadMoreCommentsButton(post)) {
      engagementLoopScore = 30;
      manipulationScore += engagementLoopScore;
    }
    manipulationScore = Math.min(100, manipulationScore);

    return {
      velocityScore,
      manipulationScore,
      engagementLoopScore,
      engagementLoopWarning: engagementLoopScore > 0,
      status: 'Tamamlandı'
    };
  }

  function getPostCategory(post, result) {
    if (isPromoted(post)) return 'reklam';
    if (result.manipulationScore > 70) return 'manipülasyon';
    return 'normal';
  }

  function getStorageKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function loadDailyStats() {
    return new Promise((resolve) => {
      if (typeof chrome?.storage?.local?.get !== 'function') {
        resolve({ normal: 0, manipülasyon: 0, reklam: 0, feedTimeSeconds: 0, noiseTimeSeconds: 0 });
        return;
      }
      chrome.storage.local.get(['inzenDailyStats', 'inzenTimeStats'], (data) => {
        const key = getStorageKey();
        const daily = data.inzenDailyStats || {};
        const dayData = daily[key] || { normal: 0, manipülasyon: 0, reklam: 0 };
        const timeData = data.inzenTimeStats || {};
        const dayTime = timeData[key] || { feedTimeSeconds: 0, noiseTimeSeconds: 0 };
        resolve({
          ...dayData,
          feedTimeSeconds: dayTime.feedTimeSeconds || 0,
          noiseTimeSeconds: dayTime.noiseTimeSeconds || 0
        });
      });
    });
  }

  function saveDailyStats(updates) {
    if (typeof chrome?.storage?.local?.get !== 'function') return;
    const key = getStorageKey();
    chrome.storage.local.get(['inzenDailyStats', 'inzenTimeStats'], (data) => {
      const daily = data.inzenDailyStats || {};
      const timeData = data.inzenTimeStats || {};
      daily[key] = { ...(daily[key] || { normal: 0, manipülasyon: 0, reklam: 0 }), ...updates.posts };
      timeData[key] = {
        feedTimeSeconds: updates.feedTimeSeconds ?? (timeData[key]?.feedTimeSeconds || 0),
        noiseTimeSeconds: updates.noiseTimeSeconds ?? (timeData[key]?.noiseTimeSeconds || 0)
      };
      chrome.storage.local.set({ inzenDailyStats: daily, inzenTimeStats: timeData });
    });
  }

  function incrementCategory(category) {
    loadDailyStats().then((stats) => {
      const posts = {
        normal: stats.normal || 0,
        manipülasyon: stats.manipülasyon || 0,
        reklam: stats.reklam || 0
      };
      posts[category] = (posts[category] || 0) + 1;
      saveDailyStats({ posts });
    });
  }

  function createCyberpunkOverlay(post, result) {
    if (post.querySelector('.inzen-analysis-badge')) return;

    const isHigh = result.manipulationScore > 70;
    if (isHigh) {
      post.classList.add('inzen-low-quality');
    }

    const box = document.createElement('div');
    box.className = 'inzen-analysis-badge inzen-matrix-box' + (isHigh ? ' inzen-cyberpunk--red' : ' inzen-cyberpunk--green');
    const engagementWarning = result.engagementLoopWarning
      ? '<div class="inzen-cyberpunk-line inzen-engagement-warning">⚠️ Bu post seni içeride tutmak için tasarlanmış olabilir.</div>'
      : '';
    box.innerHTML = `
      <div class="inzen-cyberpunk-line inzen-manipulation-main">MANIPULATION: %${result.manipulationScore}</div>
      <div class="inzen-cyberpunk-line">🚀 Hız: %${result.velocityScore}</div>
      <div class="inzen-cyberpunk-line">🔄 Engagement Loop: %${result.engagementLoopScore}</div>
      ${engagementWarning}
      <div class="inzen-cyberpunk-line inzen-cyberpunk-status">📢 Durum: ${result.status}</div>
    `;

    const authorId = getAuthorId(post);
    if (authorId) {
      const muteBtn = document.createElement('button');
      muteBtn.className = 'inzen-mute-btn';
      muteBtn.type = 'button';
      muteBtn.title = 'Bu yazarı sessize al (Global Mute)';
      muteBtn.textContent = 'Mute';
      muteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        addToMuteList(authorId);
        post.style.display = 'none';
        post.dataset.inzenMuted = 'true';
      });
      box.appendChild(muteBtn);
    }

    if (getComputedStyle(post).position === 'static') {
      post.style.position = 'relative';
    }
    post.appendChild(box);
  }

  function processPost(post) {
    if (!post || processedPosts.has(post)) return;
    if (post.querySelector('.inzen-analysis-badge')) return;
    if (post.dataset.inzenMuted === 'true') return;
    if (post.dataset.inzenProcessing === 'true') return;
    if (post.offsetParent == null || post.offsetHeight < 40) return;

    const authorId = getAuthorId(post);
    post.dataset.inzenProcessing = 'true';

    const finishProcess = () => {
      delete post.dataset.inzenProcessing;
      doProcessPost(post);
    };

    if (authorId) {
      loadMutedAuthors().then((muted) => {
        if (muted.includes(authorId)) {
          post.style.display = 'none';
          post.dataset.inzenMuted = 'true';
          delete post.dataset.inzenProcessing;
          return;
        }
        finishProcess();
      });
    } else {
      finishProcess();
    }
  }

  function doProcessPost(post) {
    if (processedPosts.has(post)) return;
    processedPosts.add(post);
    post.style.border = '2px solid red';
    post.dataset.inzenDetected = 'true';
    const result = analyzePost(post);
    const category = getPostCategory(post, result);
    incrementCategory(category);
    createCyberpunkOverlay(post, result);
  }

  function scanPosts() {
    const candidates = document.querySelectorAll(
      '.feed-shared-update-v2, .feed-shared-update-v3, [class*="feed-shared-update"], ' +
      'article, [data-id^="urn:li:activity:"], div[data-urn], .relative.display-flex, .display-flex.relative'
    );
    candidates.forEach((el) => {
      const post = findFeedPost(el) || el;
      if (post) processPost(post);
    });
  }

  function injectStyles() {
    if (document.getElementById('inzen-cyberpunk-styles')) return;
    const style = document.createElement('style');
    style.id = 'inzen-cyberpunk-styles';
    style.textContent = `
      .inzen-cyberpunk-line {
        margin-bottom: 4px;
      }
      .inzen-cyberpunk-line:last-child {
        margin-bottom: 0;
      }
      .inzen-loop-warning {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 2147483646;
        padding: 18px 24px;
        background: rgba(15, 15, 18, 0.75);
        border: 1px solid rgba(0, 255, 65, 0.15);
        border-radius: 8px;
        color: rgba(228, 228, 231, 0.75);
        font-size: 13px;
        line-height: 1.6;
        text-align: center;
        max-width: 300px;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
        animation: inzen-fade-in 0.5s ease;
      }
      @keyframes inzen-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .inzen-mute-btn {
        margin-top: 8px;
        padding: 4px 10px;
        font-size: 10px;
        background: rgba(239, 68, 68, 0.2);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.4);
        border-radius: 4px;
        cursor: pointer;
        width: 100%;
      }
      .inzen-mute-btn:hover {
        background: rgba(239, 68, 68, 0.35);
      }
      .inzen-forensic-toast {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483645;
        max-width: 340px;
        padding: 14px 18px;
        background: rgba(30, 30, 35, 0.95);
        border: 1px solid rgba(245, 158, 11, 0.4);
        border-radius: 8px;
        color: rgba(228, 228, 231, 0.9);
        font-size: 12px;
        line-height: 1.5;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        animation: inzen-fade-in 0.4s ease;
      }
      .inzen-forensic-toast::before {
        content: '🔍 Forensic Monitor';
        display: block;
        font-size: 10px;
        font-weight: 600;
        color: #f59e0b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
      }
    `;
    document.head.appendChild(style);
  }

  function showForensicAlert(message) {
    const existing = document.getElementById('inzen-forensic-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'inzen-forensic-toast';
    toast.className = 'inzen-forensic-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s';
      setTimeout(() => toast.remove(), 400);
    }, 5000);
  }

  function initForensicMonitor() {
    let scrollDepthShown = false;
    const hoverTimers = new WeakMap();

    window.addEventListener('scroll', () => {
      if (scrollDepthShown) return;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      const pct = Math.round((scrollTop / scrollHeight) * 100);
      if (pct >= 70) {
        scrollDepthShown = true;
        showForensicAlert('Şu an sayfanın %70\'ine indiniz, ilgi alanınız haritalandı.');
      }
    }, { passive: true });

    document.body.addEventListener('mouseover', (e) => {
      const post = e.target.closest?.('.feed-shared-update-v2, .feed-shared-update-v3, [class*="feed-shared-update"], article, [data-id^="urn:li:activity:"]');
      if (!post) return;
      const timer = setTimeout(() => {
        showForensicAlert('Bir postun üzerinde 3 saniye durdunuz, bu konu profilinize etiketlendi.');
      }, 3000);
      hoverTimers.set(post, timer);
    }, true);

    document.body.addEventListener('mouseout', (e) => {
      const post = e.target.closest?.('.feed-shared-update-v2, .feed-shared-update-v3, [class*="feed-shared-update"], article, [data-id^="urn:li:activity:"]');
      if (post) {
        const timer = hoverTimers.get(post);
        if (timer) {
          clearTimeout(timer);
          hoverTimers.delete(post);
        }
      }
    }, true);

    document.body.addEventListener('click', (e) => {
      const link = e.target.closest?.('a[href]');
      if (!link || link.getAttribute('href')?.startsWith('#')) return;
      showForensicAlert('Tıkladığınız her bağlantı dijital parmak izinizle mühürlendi.');
    }, true);
  }

  function checkConsecutiveNoiseAndWarn() {
    const candidates = document.querySelectorAll(
      '[data-inzen-detected="true"]'
    );
    const unique = [];
    const seen = new WeakSet();
    candidates.forEach((post) => {
      if (!seen.has(post)) {
        seen.add(post);
        unique.push(post);
      }
    });

    const sorted = unique.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    const viewportBottom = window.innerHeight + 1500;
    const viewportTop = -1500;

    let maxConsecutive = 0;
    let current = 0;

    for (const post of sorted) {
      const rect = post.getBoundingClientRect();
      if (rect.top > viewportBottom) break;
      if (rect.bottom < viewportTop) continue;

      if (post.classList.contains('inzen-low-quality')) {
        current++;
        maxConsecutive = Math.max(maxConsecutive, current);
      } else {
        current = 0;
      }
    }

    if (maxConsecutive >= 10 && !document.getElementById('inzen-loop-warning')) {
      const overlay = document.createElement('div');
      overlay.id = 'inzen-loop-warning';
      overlay.className = 'inzen-loop-warning';
      overlay.textContent = 'Algoritma şu an seni bir döngüye sokmaya çalışıyor. Derin bir nefes al ve çıkmayı düşün.';
      document.body.appendChild(overlay);
      setTimeout(() => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.5s';
        setTimeout(() => overlay.remove(), 500);
      }, 5000);
    }
  }

  function initTimeTracking() {
    let feedStart = null;
    let noiseStart = null;
    let sessionFeedSeconds = 0;
    let sessionNoiseSeconds = 0;

    function persistTime() {
      if (sessionFeedSeconds === 0 && sessionNoiseSeconds === 0) return;
      loadDailyStats().then((stats) => {
        const feedTotal = (stats.feedTimeSeconds || 0) + sessionFeedSeconds;
        const noiseTotal = (stats.noiseTimeSeconds || 0) + sessionNoiseSeconds;
        saveDailyStats({ feedTimeSeconds: feedTotal, noiseTimeSeconds: noiseTotal });
        sessionFeedSeconds = 0;
        sessionNoiseSeconds = 0;
      });
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        feedStart = Date.now();
      } else {
        if (feedStart) {
          sessionFeedSeconds += (Date.now() - feedStart) / 1000;
          feedStart = null;
        }
        if (noiseStart) {
          sessionNoiseSeconds += (Date.now() - noiseStart) / 1000;
          noiseStart = null;
        }
        persistTime();
      }
    });

    document.body.addEventListener('mouseover', (e) => {
      if (e.target.closest('.inzen-low-quality')) {
        if (!noiseStart) noiseStart = Date.now();
      }
    });
    document.body.addEventListener('mouseout', (e) => {
      if (noiseStart && !e.relatedTarget?.closest('.inzen-low-quality')) {
        sessionNoiseSeconds += (Date.now() - noiseStart) / 1000;
        noiseStart = null;
      }
    });

    if (document.visibilityState === 'visible') {
      feedStart = Date.now();
    }

    setInterval(() => {
      if (document.visibilityState === 'visible' && feedStart) {
        sessionFeedSeconds += (Date.now() - feedStart) / 1000;
        feedStart = Date.now();
        persistTime();
      }
    }, 30000);
  }

  function init() {
    injectStyles();
    initTimeTracking();
    initForensicMonitor();
    setInterval(ghostInteract, 180000 + Math.random() * 120000);

    const run = () => requestAnimationFrame(scanPosts);

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.addedNodes?.length) {
          run();
          break;
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    let scrollT;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollT);
      scrollT = setTimeout(() => {
        run();
        checkConsecutiveNoiseAndWarn();
      }, 150);
    }, { passive: true });
  }

  init();
})();
