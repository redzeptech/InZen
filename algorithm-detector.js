/**
 * InZen - Algorithm Detector & Matrix Overlay
 * Her post için Manipulation Score hesaplar ve Matrix Overlay gösterir.
 */

(function (global) {
  'use strict';

  const EMOJI_REGEX = /^[\p{Emoji}\s]+$/u;
  const SHORT_COMMENT_WORD_LIMIT = 3;
  const POD_WORDS = [
    'tebrikler', 'harika', 'katılıyorum', 'congratulations', 'congrats',
    'great', 'awesome', 'agree', 'agreed', 'nice', 'güzel', 'bravo',
    'amazing', 'wonderful', 'excellent', 'mükemmel', 'süper', '👍', '🎉'
  ];

  function countWords(text) {
    return (text || '').trim().split(/\s+/).filter(Boolean).length;
  }

  function isEmojiOnly(text) {
    const cleaned = (text || '').replace(/\s/g, '');
    return cleaned.length > 0 && EMOJI_REGEX.test(cleaned);
  }

  function isShortOrEmojiComment(text) {
    if (!text || !text.trim()) return false;
    return countWords(text) < SHORT_COMMENT_WORD_LIMIT || isEmojiOnly(text);
  }

  function getComments(post) {
    const comments = [];
    const selectors = [
      '[class*="comment"] [class*="update-components"]',
      '[class*="comments"] [class*="comment"]',
      '[class*="social-details-comments"] span',
      '.comments-comments-list__comment-item span',
      '[data-id] [class*="comment"] span'
    ];
    for (const sel of selectors) {
      try {
        const nodes = post.querySelectorAll(sel);
        nodes.forEach((el) => {
          const text = (el.textContent || '').trim();
          if (text.length > 1 && text.length < 500 && !comments.includes(text)) {
            comments.push(text);
          }
        });
        if (comments.length >= 10) break;
      } catch (_) {}
    }
    return comments;
  }

  function getCommentCount(post) {
    const allText = (post.innerText || post.textContent || '');
    const patterns = [
      /(\d+)\s*(yorum|comment)/i,
      /(yorum|comment)s?\s*(\d+)/i,
      /(\d+)\s*·\s*(yorum|comment)/i
    ];
    for (const p of patterns) {
      const m = allText.match(p);
      if (m) {
        const n = parseInt(m[1], 10) || parseInt(m[2], 10);
        return isNaN(n) ? 0 : n;
      }
    }
    return 0;
  }

  function hasPodDominance(comments) {
    if (comments.length < 2) return false;
    let matchCount = 0;
    comments.forEach((c) => {
      const lower = (c || '').toLowerCase();
      if (POD_WORDS.some((w) => lower.includes(w))) matchCount++;
    });
    return matchCount / comments.length >= 0.5;
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
    const match = t.match(/(\d+)\s*(m|min|minute|h|hour|d|day|w|week|mo|month|y|year)s?/);
    if (!match) return null;
    const val = parseInt(match[1], 10);
    const unit = match[2];
    if (unit === 'm' || unit === 'min' || unit === 'minute') return val;
    if (unit === 'h' || unit === 'hour') return val * 60;
    if (unit === 'd' || unit === 'day') return val * 1440;
    if (unit === 'w' || unit === 'week') return val * 10080;
    if (unit === 'mo' || unit === 'month') return val * 43200;
    if (unit === 'y' || unit === 'year') return val * 525600;
    return null;
  }

  function getEngagementData(post) {
    let likeCount = 0;
    let timeMinutes = null;
    const allText = post.innerText || post.textContent || '';

    const likeSelectors = [
      '[class*="social-details-social-counts"]',
      '[class*="social-details-social-counts__reactions"]',
      '[class*="reactions"]'
    ];
    for (const sel of likeSelectors) {
      const el = post.querySelector(sel);
      if (el) {
        const parsed = parseLikeCount((el.textContent || '').replace(/\s/g, ''));
        if (parsed > likeCount) likeCount = parsed;
      }
    }

    const timePatterns = [
      /(\d+)\s*(m|min|h|hr|d|day|w|week|mo|month|y|year)s?\s*(ago)?/gi,
      /(\d+)(m|h|d|w|mo|y)\b/g
    ];
    for (const pattern of timePatterns) {
      try {
        for (const m of allText.matchAll(pattern)) {
          const mins = parseTimeToMinutes(m[0]);
          if (mins !== null && (timeMinutes === null || mins < timeMinutes)) {
            timeMinutes = mins;
          }
        }
      } catch (_) {}
    }
    return { likeCount, timeMinutes };
  }

  function analyzePost(post, options = {}) {
    const alerts = [];
    let score = 0;

    if (options.isPromoted) {
      return {
        score: 100,
        manipulation: 'Yüksek',
        alerts: ['Reklam %100'],
        isPromoted: true,
        commentCount: 0,
        timeMinutes: null,
        likeCount: 0
      };
    }

    const comments = getComments(post);
    const commentCount = Math.max(comments.length, getCommentCount(post));
    const { likeCount, timeMinutes } = getEngagementData(post);

    let suspiciousComments = 0;
    comments.forEach((c) => {
      if (isShortOrEmojiComment(c)) suspiciousComments++;
    });
    if (suspiciousComments > 0) {
      score += Math.min(40, suspiciousComments * 12);
      alerts.push(`${suspiciousComments} kısa/emoji yorum tespit edildi.`);
    }

    if (commentCount > 50 && timeMinutes !== null && timeMinutes < 60) {
      score += 45;
      alerts.push('Hızlı Etkileşim (Algoritma Tetikleyici)');
    } else if (timeMinutes !== null && timeMinutes < 60 && likeCount > 100) {
      score += 35;
      alerts.push('Kısa sürede yüksek beğeni (şüpheli).');
    }

    if (comments.length >= 2 && hasPodDominance(comments)) {
      score += 40;
      alerts.push('Yapay Etkileşim Grubu (Pod) Şüphesi');
    }

    score = Math.min(100, score);
    const manipulation = score >= 50 ? 'Yüksek' : 'Düşük';

    return {
      score,
      manipulation,
      alerts: alerts.length > 0 ? alerts : ['Analiz tamamlandı.'],
      isPromoted: false,
      commentCount,
      timeMinutes,
      likeCount,
      comments
    };
  }

  function createMatrixOverlay(post, result) {
    if (post.querySelector('.inzen-matrix-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'inzen-matrix-overlay';

    const badges = result.alerts.map((a) => `<span class="inzen-overlay-badge">${a}</span>`).join('');
    overlay.innerHTML = `
      <div class="inzen-overlay-header">
        <span class="inzen-overlay-title">InZen Analiz</span>
        <span class="inzen-overlay-score">%${result.score}</span>
      </div>
      <div class="inzen-overlay-badges">${badges}</div>
      <div class="inzen-overlay-manipulation">Manipülasyon: ${result.manipulation}</div>
    `;

    if (result.isPromoted) {
      post.classList.add('inzen-promoted-overlay');
    } else if (result.score >= 70) {
      post.classList.add('inzen-high-manipulation');
    }

    if (getComputedStyle(post).position === 'static') {
      post.style.position = 'relative';
    }
    post.appendChild(overlay);
  }

  function processPost(post, options = {}) {
    if (!post || post.dataset.inzenHidden === 'true') return;
    if (post.querySelector('.inzen-matrix-overlay')) return;

    const result = analyzePost(post, options);
    createMatrixOverlay(post, result);

    if (options.isPromoted) {
      post.classList.add('inzen-promoted-overlay');
    }
  }

  global.InZenAlgorithmDetector = {
    analyzePost,
    processPost,
    createMatrixOverlay,
    getComments,
    getCommentCount,
    getEngagementData
  };
})(typeof window !== 'undefined' ? window : this);
