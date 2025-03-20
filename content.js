let badWordsMap = new Map();
let wordsLoaded = false;

async function loadBadWordsFromJson() {
  try {
  
    const response = await fetch(chrome.runtime.getURL('words.json'));
    if (!response.ok) {
      throw new Error(`HTTP ошибка: ${response.status}`);
    }
    const jsonText = await response.text();
    const wordsData = JSON.parse(jsonText);
    
  
    badWordsMap.clear();
    
  
    wordsData.forEach(item => {
      if (item.word && typeof item.word === 'string') {
        badWordsMap.set(item.word.toLowerCase(), item.id);
      }
    });
    
  
    const userItems = await new Promise(resolve => {
      chrome.storage.sync.get({ userWordList: [] }, resolve);
    });
    
    userItems.userWordList.forEach(word => {
      if (word && typeof word === 'string' && word.trim()) {
      
        badWordsMap.set(word.toLowerCase().trim(), '-' + badWordsMap.size);
      }
    });
    
    console.log(`WordFilter: Загружено ${badWordsMap.size} слов`);
    wordsLoaded = true;
    return true;
  } catch (error) {
    console.error('WordFilter: Ошибка при загрузке слов:', error);
  
    badWordsMap.clear();
    
  
    try {
      const userItems = await new Promise(resolve => {
        chrome.storage.sync.get({ userWordList: [] }, resolve);
      });
      
      userItems.userWordList.forEach(word => {
        if (word && typeof word === 'string' && word.trim()) {
          badWordsMap.set(word.toLowerCase().trim(), '-' + badWordsMap.size);
        }
      });
      
      console.log(`WordFilter: Загружено ${badWordsMap.size} пользовательских слов`);
      wordsLoaded = true;
    } catch (e) {
      console.error('WordFilter: Ошибка при загрузке пользовательских слов:', e);
    }
    return badWordsMap.size > 0;
  }
}

function filterText(node, replacement) {
  if (!wordsLoaded || badWordsMap.size === 0) return;
  
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.nodeValue;
    if (!text || text.trim() === '') return;
    
    const tokens = text.split(/(\s+|[^\wа-яА-ЯёЁ]+)/);
    let changed = false;
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
    
      if (/[а-яА-ЯёЁa-zA-Z]/.test(token)) {
        const cleanToken = token.toLowerCase();
        if (badWordsMap.has(cleanToken)) {
          tokens[i] = replacement.repeat(token.length);
          changed = true;
        }
      }
    }
    
    if (changed) {
      node.nodeValue = tokens.join('');
    }
  } else if (node.nodeType === Node.ELEMENT_NODE && 
             node.nodeName !== 'SCRIPT' && 
             node.nodeName !== 'STYLE' &&
             node.nodeName !== 'TEXTAREA' &&
             node.nodeName !== 'INPUT') {
    Array.from(node.childNodes).forEach(child => {
      filterText(child, replacement);
    });
  }
}

async function filterPage() {
  const settings = await new Promise(resolve => {
    chrome.storage.sync.get({
      enabled: false,
      replacement: '*'
    }, resolve);
  });
  
  if (settings.enabled) {
  
    if (!wordsLoaded) {
      await loadBadWordsFromJson();
    }
    
    if (badWordsMap.size > 0) {
      console.log("WordFilter: Запуск фильтрации");
      filterText(document.body, settings.replacement);
    }
  }
}

async function initialize() {

  await loadBadWordsFromJson();
  console.log("initialized");
  

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(filterPage, 500));
  } else {
    setTimeout(filterPage, 500);
  }
  

  const observer = new MutationObserver(mutations => {
    chrome.storage.sync.get({ enabled: false }, function(items) {
      if (items.enabled && wordsLoaded && badWordsMap.size > 0) {
        let shouldFilter = false;
        
        for (const mutation of mutations) {
          if ((mutation.type === 'childList' && mutation.addedNodes.length > 0) || 
              mutation.type === 'characterData') {
            shouldFilter = true;
            break;
          }
        }
        
        if (shouldFilter) {
          chrome.storage.sync.get({ replacement: '*' }, function(items) {
            for (const mutation of mutations) {
              if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                  if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
                    filterText(node, items.replacement);
                  }
                });
              } else if (mutation.type === 'characterData') {
                filterText(mutation.target, items.replacement);
              }
            }
          });
        }
      }
    });
  });
  

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
    });
  }
}

initialize();

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'updateFilter') {
    console.log("WordFilter: Получена команда на обновление фильтра");
    loadBadWordsFromJson().then(() => {
      filterPage();
      sendResponse({success: true, wordCount: badWordsMap.size});
    });
    return true;
  } else if (request.action === 'getStats') {
    sendResponse({wordCount: badWordsMap.size});
    return true;
  }
});