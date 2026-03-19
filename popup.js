(function () {
  'use strict';

  function getStorageKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function loadStats() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['inzenDailyStats', 'inzenTimeStats'], (data) => {
        const key = getStorageKey();
        const daily = data.inzenDailyStats || {};
        const dayData = daily[key] || { normal: 0, manipülasyon: 0, reklam: 0 };
        const timeData = data.inzenTimeStats || {};
        const dayTime = timeData[key] || { feedTimeSeconds: 0, noiseTimeSeconds: 0 };
        resolve({
          normal: dayData.normal || 0,
          manipülasyon: dayData.manipülasyon || 0,
          reklam: dayData.reklam || 0,
          feedTimeSeconds: dayTime.feedTimeSeconds || 0,
          noiseTimeSeconds: dayTime.noiseTimeSeconds || 0
        });
      });
    });
  }

  function updateUI(stats) {
    const noiseCount = stats.manipülasyon + stats.reklam;
    const totalPosts = stats.normal + stats.manipülasyon + stats.reklam;
    const manipulationRate = totalPosts > 0
      ? Math.round((noiseCount / totalPosts) * 100)
      : 0;
    const trapMinutes = Math.round(stats.noiseTimeSeconds / 60);

    document.getElementById('noise-count').textContent = noiseCount;
    document.getElementById('trap-time').textContent =
      'Algoritma seni ' + trapMinutes + ' dakika boyunca etkileşim tuzaklarında tutmaya çalıştı.';
    document.getElementById('manipulation-rate').textContent = '%' + manipulationRate;
    document.getElementById('footer-date').textContent = 'Bugün: ' + getStorageKey();
  }

  function resetData() {
    if (!confirm('Tüm InZen verileri silinecek. Emin misiniz?')) return;

    chrome.storage.local.remove(['inzenDailyStats', 'inzenTimeStats', 'inzenMutedAuthors'], () => {
      updateUI({
        normal: 0,
        manipülasyon: 0,
        reklam: 0,
        feedTimeSeconds: 0,
        noiseTimeSeconds: 0
      });
    });
  }

  document.getElementById('reset-btn').addEventListener('click', resetData);

  loadStats().then(updateUI);
})();
