// Twitter/X Content Script

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
      twitter: {
        enabled: true,
        alwaysOn: true,
        activeDays: [],
        timeSlots: [{start: '07:00', end: '12:00'}],
        defaultFollowing: true,
        hideRecommendations: false,
        hideTrends: true,
        stopAutoplay: false
      }
    };
    applyRestrictions();
  } catch (error) {
    console.error('Twitter: 設定の読み込みに失敗:', error);
  }
}

// 制限を適用すべきかどうかを判定
function shouldApplyRestrictions() {
  // 共通設定のチェック
  if (settings?.common?.alwaysOn) {
    return true;
  }
  
  // Twitter設定のチェック
  if (!settings || !settings.twitter || !settings.twitter.enabled) {
    return false;
  }
  
  // 常にONの場合
  if (settings.twitter.alwaysOn) {
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
  
  // Twitter設定の時間チェック
  if (!settings.twitter.activeDays?.includes(currentDay)) {
    return false;
  }
  
  for (const slot of (settings.twitter.timeSlots || [])) {
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
    document.body.classList.remove('acis-twitter-active');
    document.body.classList.remove('acis-twitter-recommendations-hidden');
    document.body.classList.remove('acis-twitter-trends-hidden');
    document.body.classList.remove('acis-grayscale');
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    return;
  }
  
  // 制限時間内の場合、各機能のトグル状態に応じて制限を適用
  document.body.classList.add('acis-twitter-active');
  
  // グレースケールモード（共通設定かつ制限時間内のみ）
  if (settings.common?.grayscale) {
    document.body.classList.add('acis-grayscale');
  } else {
    document.body.classList.remove('acis-grayscale');
  }
  
  // デフォルトのTLを「フォロー中」に変更（制限時間内のみ）
  if (settings.twitter?.defaultFollowing !== false) {
    switchToFollowingTab();
  }
  
  // おすすめを非表示（制限時間内のみ）
  if (settings.twitter.hideRecommendations) {
    document.body.classList.add('acis-twitter-recommendations-hidden');
    hideRecommendations();
  } else {
    document.body.classList.remove('acis-twitter-recommendations-hidden');
  }
  
  // トレンドを非表示（制限時間内のみ）
  if (settings.twitter.hideTrends) {
    document.body.classList.add('acis-twitter-trends-hidden');
    hideTrends();
  } else {
    document.body.classList.remove('acis-twitter-trends-hidden');
  }
  
  // 自動再生を停止（制限時間内のみ）
  if (settings.twitter.stopAutoplay) {
    stopAutoplay();
  }
  
  // DOMの変更を監視
  if (!observer) {
    startObserver();
  }
}

// フォロー中タブに自動切り替え（初回のみ）
function switchToFollowingTab() {
  // ホームページの場合のみ実行
  if (location.pathname === '/home') {
    // セッション内で既に切り替え済みかチェック
    const sessionKey = 'dfs-twitter-tab-switched';
    if (sessionStorage.getItem(sessionKey)) {
      return; // 既に切り替え済みなら何もしない
    }
    
    const tabs = document.querySelectorAll('[role="tab"]');
    let switched = false;
    
    tabs.forEach(tab => {
      const text = tab.textContent;
      if ((text === 'Following' || text === 'フォロー中') && tab.getAttribute('aria-selected') !== 'true') {
        tab.click();
        switched = true;
      }
    });
    
    // 切り替えが成功したらセッションに記録
    if (switched) {
      sessionStorage.setItem(sessionKey, 'true');
    }
  }
}

// おすすめを非表示
function hideRecommendations() {
  // "For you" タブを非表示にして "Following" タブに切り替え
  // ただし、タブの切り替えは初回のみ実行
  const tabs = document.querySelectorAll('[role="tab"]');
  let followingTab = null;
  let forYouTab = null;
  
  tabs.forEach(tab => {
    const text = tab.textContent;
    if (text === 'For you' || text === 'おすすめ') {
      forYouTab = tab;
      tab.style.visibility = 'hidden';
      tab.style.width = '0';
      tab.style.padding = '0';
      tab.style.overflow = 'hidden';
    } else if (text === 'Following' || text === 'フォロー中') {
      followingTab = tab;
    }
  });
  
  // フォロー中タブが選択されていない場合のみクリック
  if (followingTab && forYouTab && followingTab.getAttribute('aria-selected') !== 'true') {
    followingTab.click();
  }
  
  // "Who to follow" セクション
  const whoToFollow = document.querySelectorAll('[aria-label*="Who to follow"], [aria-label*="おすすめユーザー"]');
  whoToFollow.forEach(section => {
    const container = section.closest('section, aside');
    if (container) {
      container.style.display = 'none';
    }
  });
  
  // "Topics to follow" セクション
  const topics = document.querySelectorAll('[aria-label*="Topics"], [aria-label*="トピック"]');
  topics.forEach(section => {
    const container = section.closest('section, aside');
    if (container) {
      container.style.display = 'none';
    }
  });
}

// トレンドを非表示（右側のサイドバーのみ）
function hideTrends() {
  // 右側のサイドバーを取得
  const sidebarColumn = document.querySelector('[data-testid="sidebarColumn"]');
  if (!sidebarColumn) return;
  
  // 右側のサイドバー内の特定セクションを非表示
  const sections = sidebarColumn.querySelectorAll('section, aside, div[aria-label]');
  sections.forEach(section => {
    // aria-labelまたは内部のテキストで判定
    const label = section.getAttribute('aria-label') || '';
    const heading = section.querySelector('h2, h1');
    const headingText = heading ? heading.textContent : '';
    
    // トレンド、ニュース、おすすめユーザー関連のセクションを非表示
    // 注意：「話題」は左側メニューの「話題を検索」と被るので使用しない
    if (label.includes('Trending') || label.includes('トレンド') || 
        label.includes('What') || label.includes('いま') ||
        label.includes('News') || label.includes('ニュース') ||
        label.includes('Follow') || label.includes('おすすめ') ||
        headingText.includes('Trending') || headingText.includes('トレンド') || 
        headingText.includes('What') || headingText.includes('いま') ||
        headingText.includes('News') || headingText.includes('ニュース') ||
        headingText.includes('Follow') || headingText.includes('おすすめ')) {
      section.style.display = 'none';
    }
  });
  
  // 「「いま」を見つけよう」セクション（右側のみ）
  const whatHappening = sidebarColumn.querySelectorAll('[aria-label*="happening"], [aria-label*="いま"]');
  whatHappening.forEach(section => {
    const container = section.closest('section, aside, div');
    if (container && sidebarColumn.contains(container)) {
      container.style.display = 'none';
    }
  });
  
  // 「本日のニュース」セクション（右側のみ）
  const news = sidebarColumn.querySelectorAll('[aria-label*="News"], [aria-label*="ニュース"]');
  news.forEach(section => {
    const container = section.closest('section, aside, div');
    if (container && sidebarColumn.contains(container)) {
      container.style.display = 'none';
    }
  });
  
  // 「おすすめのユーザー」セクション（右側のみ）
  const whoToFollow = sidebarColumn.querySelectorAll('[aria-label*="follow"], [aria-label*="おすすめ"]');
  whoToFollow.forEach(section => {
    const container = section.closest('section, aside, div');
    if (container && sidebarColumn.contains(container)) {
      container.style.display = 'none';
    }
  });
}

// 自動再生を停止
function stopAutoplay() {
  // 動画要素を探して自動再生のみ無効化
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    // 自動再生属性を削除
    video.removeAttribute('autoplay');
    
    // 手動再生フラグが設定されていない場合のみ停止
    if (!video.hasAttribute('data-manual-play')) {
      // 既に再生中の動画を一時停止
      if (!video.paused) {
        video.pause();
      }
      
      // playイベントを監視して自動再生をブロック
      if (!video.hasAttribute('data-autoplay-blocked')) {
        video.setAttribute('data-autoplay-blocked', 'true');
        
        // 再生イベントリスナー
        const handlePlay = (e) => {
          if (!video.hasAttribute('data-manual-play')) {
            e.preventDefault();
            video.pause();
          }
        };
        
        video.addEventListener('play', handlePlay);
        
        // クリックイベントで手動再生を許可
        const enableManualPlay = () => {
          video.setAttribute('data-manual-play', 'true');
          video.removeEventListener('play', handlePlay);
          // 少し遅延を入れて確実に再生
          setTimeout(() => {
            video.play().catch(() => {});
          }, 50);
        };
        
        // ビデオ要素への直接クリック
        video.addEventListener('click', enableManualPlay, { once: true });
        
        // 再生ボタンのクリックも検出
        const videoContainer = video.closest('[data-testid="videoPlayer"], [data-testid="videoComponent"], article');
        if (videoContainer) {
          // 再生ボタンを探す
          const playButtons = videoContainer.querySelectorAll('[aria-label*="Play"], [aria-label*="再生"], [role="button"]');
          playButtons.forEach(button => {
            button.addEventListener('click', enableManualPlay, { once: true });
          });
          
          // コンテナ全体のクリックも監視（ボタンが見つからない場合のフォールバック）
          videoContainer.addEventListener('click', (e) => {
            // ビデオ要素またはその親要素がクリックされた場合
            if (e.target === video || video.contains(e.target) || e.target.closest('[data-testid*="video"]')) {
              enableManualPlay();
            }
          }, { once: true });
        }
      }
    }
  });
}

// DOMの変更を監視
function startObserver() {
  observer = new MutationObserver(() => {
    if (settings.twitter?.defaultFollowing !== false) {
      switchToFollowingTab();
    }
    if (settings.twitter.hideRecommendations) {
      hideRecommendations();
    }
    if (settings.twitter.hideTrends) {
      hideTrends();
    }
    if (settings.twitter.stopAutoplay) {
      stopAutoplay();
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

// SPAのナビゲーションを検出
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(() => {
      if (settings) {
        applyRestrictions();
      }
    }, 500);
  }
}).observe(document, { subtree: true, childList: true });
