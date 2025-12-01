// YouTube Content Script

let settings = null;
let observer = null;

// 設定を読み込む
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['settings']);
    settings = result.settings || {
      common: {
        enabled: true,
        alwaysOn: false,
        activeDays: [],
        timeSlots: [{start: '07:00', end: '12:00'}],
        grayscale: false
      },
      youtube: {
        enabled: true,
        alwaysOn: true,
        activeDays: [],
        timeSlots: [{start: '07:00', end: '12:00'}],
        hideShorts: true,
        redirectHome: true,
        hideRelated: true,
        hideEndscreen: true,
        hideComments: true,
        disableAutoplay: false,
        hideHeaderBadges: false
      }
    };
    applyRestrictions();
  } catch (error) {
    console.error('YouTube: 設定の読み込みに失敗:', error);
  }
}

// 制限を適用すべきかどうかを判定
function shouldApplyRestrictions() {
  // 共通設定のチェック
  if (settings?.common?.alwaysOn) {
    return true;
  }
  
  // YouTube設定のチェック
  if (!settings || !settings.youtube || !settings.youtube.enabled) {
    return false;
  }
  
  // 常にONの場合
  if (settings.youtube.alwaysOn) {
    return true;
  }
  
  // 現在の日時を取得
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  // 共通設定の時間チェック
  if (settings.common && settings.common.activeDays?.includes(currentDay)) {
    for (const slot of (settings.common.timeSlots || [])) {
      const [startHour, startMinute] = slot.start.split(':').map(Number);
      const [endHour, endMinute] = slot.end.split(':').map(Number);
      const startTimeMinutes = startHour * 60 + startMinute;
      const endTimeMinutes = endHour * 60 + endMinute;
      
      if (endTimeMinutes > startTimeMinutes) {
        if (currentTime >= startTimeMinutes && currentTime <= endTimeMinutes) {
          return true;
        }
      } else {
        if (currentTime >= startTimeMinutes || currentTime <= endTimeMinutes) {
          return true;
        }
      }
    }
  }
  
  // YouTube設定の時間チェック
  if (!settings.youtube.activeDays?.includes(currentDay)) {
    return false;
  }
  
  for (const slot of (settings.youtube.timeSlots || [])) {
    const [startHour, startMinute] = slot.start.split(':').map(Number);
    const [endHour, endMinute] = slot.end.split(':').map(Number);
    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;
    
    if (endTimeMinutes > startTimeMinutes) {
      if (currentTime >= startTimeMinutes && currentTime <= endTimeMinutes) {
        return true;
      }
    } else {
      if (currentTime >= startTimeMinutes || currentTime <= endTimeMinutes) {
        return true;
      }
    }
  }
  
  return false;
}

// 制限を適用
function applyRestrictions() {
  const isRestricted = shouldApplyRestrictions();
  
  if (!isRestricted) {
    // 制限時間外の場合はすべての制限を解除
    document.body.classList.remove('acis-youtube-active');
    document.body.classList.remove('acis-youtube-shorts-hidden');
    document.body.classList.remove('acis-youtube-related-hidden');
    document.body.classList.remove('acis-youtube-comments-hidden');
    document.body.classList.remove('acis-grayscale');
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    return;
  }
  
  // 制限時間内の場合、各機能のトグル状態に応じて制限を適用
  document.body.classList.add('acis-youtube-active');
  
  // グレースケールモード（共通設定かつ制限時間内のみ）
  if (settings.common?.grayscale) {
    document.body.classList.add('acis-grayscale');
  } else {
    document.body.classList.remove('acis-grayscale');
  }
  
  // Shortsを非表示（制限時間内のみ）
  if (settings.youtube.hideShorts) {
    document.body.classList.add('acis-youtube-shorts-hidden');
    hideShorts();
  } else {
    document.body.classList.remove('acis-youtube-shorts-hidden');
  }
  
  // 関連動画を非表示（制限時間内のみ）
  if (settings.youtube.hideRelated) {
    document.body.classList.add('acis-youtube-related-hidden');
    hideRelatedVideos();
  } else {
    document.body.classList.remove('acis-youtube-related-hidden');
  }
  
  // コメントを非表示（制限時間内のみ）
  if (settings.youtube.hideComments) {
    document.body.classList.add('acis-youtube-comments-hidden');
    hideComments();
  } else {
    document.body.classList.remove('acis-youtube-comments-hidden');
  }
  
  // DOMの変更を監視
  if (!observer) {
    startObserver();
  }
}

// Shortsを非表示
function hideShorts() {
  // Shortsセクション
  const shortsShelf = document.querySelectorAll('[title="Shorts"], [aria-label*="Shorts"]');
  shortsShelf.forEach(el => {
    const section = el.closest('ytd-rich-section-renderer, ytd-reel-shelf-renderer');
    if (section) {
      section.style.display = 'none';
    }
  });
  
  // Shortsタブ
  const shortsTab = document.querySelector('a[title="Shorts"]');
  if (shortsTab) {
    const entry = shortsTab.closest('ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer');
    if (entry) {
      entry.style.display = 'none';
    }
  }
  
  // Shortsビデオ
  const shortsVideos = document.querySelectorAll('a[href*="/shorts/"]');
  shortsVideos.forEach(video => {
    const renderer = video.closest('ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer');
    if (renderer) {
      renderer.style.display = 'none';
    }
  });
}

// 関連動画を非表示
function hideRelatedVideos() {
  // 動画再生ページの関連動画（右側）
  const secondary = document.querySelector('#secondary, #related, #secondary-inner');
  if (secondary) {
    secondary.style.display = 'none';
  }
  
  // 動画プレイヤーを広げる
  const primary = document.querySelector('#primary');
  if (primary) {
    primary.style.maxWidth = '100%';
  }
}

// コメントを非表示
function hideComments() {
  // コメントセクション
  const comments = document.querySelector('#comments, ytd-comments, ytd-comments#comments');
  if (comments) {
    comments.style.display = 'none';
  }
  
  // コメント関連の他の要素
  const commentElements = document.querySelectorAll(
    'ytd-comments, #comment-section, .ytd-comments, ' +
    'ytd-comment-thread-renderer, ytd-comment-renderer'
  );
  commentElements.forEach(el => {
    el.style.display = 'none';
  });
}

// DOMの変更を監視
function startObserver() {
  observer = new MutationObserver(() => {
    if (settings.youtube.hideShorts) {
      hideShorts();
    }
    if (settings.youtube.hideRelated) {
      hideRelatedVideos();
    }
    if (settings.youtube.hideComments) {
      hideComments();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// メッセージリスナー（設定更新時）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateSettings') {
    settings = request.settings;
    applyRestrictions();
  }
});

// ページ読み込み完了後に実行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadSettings);
} else {
  loadSettings();
}

// 定期的に制限状態をチェック（時間制限のため）
setInterval(() => {
  if (settings) {
    applyRestrictions();
  }
}, 60000); // 1分ごとにチェック
