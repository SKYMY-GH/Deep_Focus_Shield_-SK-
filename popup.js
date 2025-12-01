// デフォルト設定
const DEFAULT_SETTINGS = {
  common: {
    enabled: true,
    alwaysOn: true,
    activeDays: [],
    timeSlots: [{start: '07:00', end: '12:00'}],
    grayscale: false
  },
  youtube: {
    enabled: true,
    alwaysOn: true,
    hideShorts: true,
    redirectHome: true,
    hideRelated: true,
    hideComments: true
  },
  twitter: {
    enabled: true,
    alwaysOn: true,
    defaultFollowing: true,
    hideRecommendations: false,
    hideTrends: true,
    stopAutoplay: false
  },
  tiktok: {
    block: true
  },
  darkMode: false
};

let currentSettings = null;

// 設定を読み込む
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['settings']);
    currentSettings = result.settings || DEFAULT_SETTINGS;
    
    // ダークモード
    if (currentSettings.darkMode) {
      document.body.classList.add('dark-mode');
      document.getElementById('dark-mode-toggle').textContent = '☀️';
    }
    
    // 共通設定
    applyPlatformSettings('common');
    document.getElementById('common-grayscale').checked = currentSettings.common?.grayscale || false;
    
    // YouTube設定を適用
    document.getElementById('youtube-hide-shorts').checked = currentSettings.youtube.hideShorts;
    document.getElementById('youtube-redirect-home').checked = currentSettings.youtube.redirectHome;
    document.getElementById('youtube-hide-related').checked = currentSettings.youtube.hideRelated;
    document.getElementById('youtube-hide-comments').checked = currentSettings.youtube?.hideComments ?? true;
    
    // Twitter設定を適用
    document.getElementById('twitter-default-following').checked = currentSettings.twitter?.defaultFollowing ?? true;
    document.getElementById('twitter-hide-recommendations').checked = currentSettings.twitter.hideRecommendations;
    document.getElementById('twitter-hide-trends').checked = currentSettings.twitter.hideTrends;
    document.getElementById('twitter-stop-autoplay').checked = currentSettings.twitter.stopAutoplay;
    
    // TikTok設定を適用
    document.getElementById('tiktok-block').checked = currentSettings.tiktok.block;
    
  } catch (error) {
    console.error('設定の読み込みに失敗しました:', error);
    showStatus('設定の読み込みに失敗しました', 'error');
  }
}

// プラットフォームごとの設定を適用
function applyPlatformSettings(platform) {
  // 共通機能のみ時間設定を適用
  if (platform !== 'common') return;
  
  const settings = currentSettings[platform];
  if (!settings) return;
  
  // 常にON設定
  document.getElementById(`${platform}-always-on`).checked = settings.alwaysOn;
  
  // 曜日設定
  document.querySelectorAll(`[data-platform="${platform}"]`).forEach(checkbox => {
    const day = parseInt(checkbox.dataset.day);
    checkbox.checked = settings.activeDays?.includes(day) || false;
  });
  
  // 時間スロット
  const timeSlotsContainer = document.getElementById(`${platform}-time-slots`);
  timeSlotsContainer.innerHTML = '';
  
  const timeSlots = settings.timeSlots || [{start: '07:00', end: '12:00'}];
  timeSlots.forEach((slot, index) => {
    addTimeSlot(platform, slot, index > 0);
  });
}

// 時間スロットを追加
function addTimeSlot(platform, slot = {start: '21:00', end: '24:00'}, showRemove = true) {
  const container = document.getElementById(`${platform}-time-slots`);
  const div = document.createElement('div');
  div.className = 'time-selector';
  div.innerHTML = `
    <span>制限時間：</span>
    <input type="time" class="start-time" value="${slot.start}">
    <span>～</span>
    <input type="time" class="end-time" value="${slot.end}">
    <button class="remove-time-btn" ${showRemove ? '' : 'style="display:none;"'}>✕</button>
  `;
  
  // 削除ボタンのイベント
  if (showRemove) {
    div.querySelector('.remove-time-btn').addEventListener('click', () => {
      div.remove();
      saveSettings();
    });
  }
  
  // 時間変更のイベント
  div.querySelectorAll('input[type="time"]').forEach(input => {
    input.addEventListener('change', saveSettings);
  });
  
  container.appendChild(div);
}

// 設定を保存
async function saveSettings() {
  
  try {
    // 共通設定
    const commonDays = [];
    document.querySelectorAll('[data-platform="common"]:checked').forEach(checkbox => {
      commonDays.push(parseInt(checkbox.dataset.day));
    });
    const commonTimeSlots = [];
    document.querySelectorAll('#common-time-slots .time-selector').forEach(selector => {
      commonTimeSlots.push({
        start: selector.querySelector('.start-time').value,
        end: selector.querySelector('.end-time').value
      });
    });
    
    const settings = {
      common: {
        enabled: true,
        alwaysOn: document.getElementById('common-always-on').checked,
        activeDays: commonDays,
        timeSlots: commonTimeSlots,
        grayscale: document.getElementById('common-grayscale').checked
      },
      youtube: {
        enabled: true,
        hideShorts: document.getElementById('youtube-hide-shorts').checked,
        redirectHome: document.getElementById('youtube-redirect-home').checked,
        hideRelated: document.getElementById('youtube-hide-related').checked,
        hideComments: document.getElementById('youtube-hide-comments').checked
      },
      twitter: {
        enabled: true,
        defaultFollowing: document.getElementById('twitter-default-following').checked,
        hideRecommendations: document.getElementById('twitter-hide-recommendations').checked,
        hideTrends: document.getElementById('twitter-hide-trends').checked,
        stopAutoplay: document.getElementById('twitter-stop-autoplay').checked
      },
      tiktok: {
        block: document.getElementById('tiktok-block').checked
      },
      darkMode: document.body.classList.contains('dark-mode')
    };
    
    currentSettings = settings;
    await chrome.storage.sync.set({ settings });
    
    // 全てのタブに設定更新を通知
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.url && (
          tab.url.includes('youtube.com') || 
          tab.url.includes('twitter.com') || 
          tab.url.includes('x.com') ||
          tab.url.includes('tiktok.com')
        )) {
          try {
            await chrome.tabs.sendMessage(tab.id, { action: 'updateSettings', settings });
          } catch (e) {
            // タブが準備できていない場合は無視
            console.log('Tab not ready:', tab.id);
          }
        }
      }
    } catch (error) {
      console.log('Failed to send messages to tabs:', error);
    }
    
    showStatus('設定を保存しました', 'success');
    
  } catch (error) {
    console.error('設定の保存に失敗しました:', error);
    showStatus('設定の保存に失敗しました', 'error');
  }
}

// ステータスメッセージを表示
function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status show ${type}`;
  
  setTimeout(() => {
    status.classList.remove('show');
  }, 3000);
}

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  
  // ダークモード切り替え
  document.getElementById('dark-mode-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const btn = document.getElementById('dark-mode-toggle');
    btn.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
    saveSettings(true);
  });
  
  // 時間制限の折りたたみ機能
  document.querySelectorAll('.schedule-header').forEach(header => {
    header.addEventListener('click', () => {
      const platform = header.dataset.platform;
      const content = document.querySelector(`.schedule-content[data-platform="${platform}"]`);
      header.classList.toggle('collapsed');
      content.classList.toggle('collapsed');
    });
  });
  
  // 制限時間追加ボタン
  document.querySelectorAll('.add-time-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const platform = e.target.dataset.platform;
      addTimeSlot(platform, {start: '21:00', end: '24:00'}, true);
      saveSettings();
    });
  });
  
  // 全ての入力要素に変更リスナーを追加
  const inputs = document.querySelectorAll('input[type="checkbox"]');
  inputs.forEach(input => {
    input.addEventListener('change', () => saveSettings());
  });
  
  // 時間入力フィールドにもリスナーを追加
  document.querySelectorAll('input[type="time"]').forEach(input => {
    input.addEventListener('input', () => saveSettings());
  });
});
