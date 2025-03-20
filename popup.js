document.addEventListener('DOMContentLoaded', function() {
  const enableFilterToggle = document.getElementById('enableFilter');
  const statusText = document.getElementById('statusText');
  const replacementInput = document.getElementById('replacement');
  const wordListTextArea = document.getElementById('wordList');
  const saveButton = document.getElementById('saveButton');
  const resetButton = document.getElementById('resetButton');
  const settingsIcon = document.getElementById('settingsIcon');
  const settingsModal = document.getElementById('settingsModal');
  const closeModal = document.getElementById('closeModal');
  const wordCountSpan = document.getElementById('wordCount');
  const logoAnimation = document.getElementById('logoAnimation');
  const checkButton = document.getElementById('checkButton');

  chrome.storage.sync.get({
    enabled: false,
    replacement: '*',
    userWordList: []
  }, function(items) {
    enableFilterToggle.checked = items.enabled;
    statusText.textContent = items.enabled ? 'Фильтр включен' : 'Фильтр выключен';
    replacementInput.value = items.replacement;
    wordListTextArea.value = items.userWordList.join('\n');

    if (items.enabled) {
      logoAnimation.classList.add('active');
    } else {
      logoAnimation.classList.remove('active');
    }
    
    updateWordCount();
  });
  
  
  function updateWordCount() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'getStats'}, function(response) {
          if (response && response.wordCount !== undefined) {
            wordCountSpan.textContent = response.wordCount;
          } else {
            wordCountSpan.textContent = 'Нет данных';
          }
        });
      }
    });
  }
  
  settingsIcon.addEventListener('click', function() {
    settingsModal.style.display = 'block';
  });
  
  closeModal.addEventListener('click', function() {
    settingsModal.style.display = 'none';
    wordListTextArea.style.display = 'none';
    checkButton.style.display = 'block';
  });

  checkButton.addEventListener('click', function(){
    wordListTextArea.style.display = 'block';
    checkButton.style.display = 'none';
  });
  
  window.addEventListener('click', function(event) {
    if (event.target === settingsModal) {
      settingsModal.style.display = 'none';
      wordListTextArea.style.display = 'none';
      checkButton.style.display = 'block';
    }
  });
  
  enableFilterToggle.addEventListener('change', function() {
    const isEnabled = enableFilterToggle.checked;
    statusText.textContent = isEnabled ? 'Фильтр включен' : 'Фильтр выключен';
    
    if (isEnabled) {
      logoAnimation.classList.add('active');
    } else {
      logoAnimation.classList.remove('active');
    }
    
    chrome.storage.sync.set({ enabled: isEnabled }, function() {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'updateFilter' }, function(response) {
            if (response) {
              updateWordCount();
            }
          });
        }
      });
    });
  });
  
  saveButton.addEventListener('click', function() {
    const replacement = replacementInput.value || '*';
    const userWordList = wordListTextArea.value
      .split('\n')
      .map(word => word.trim())
      .filter(word => word.length > 0);
    
    chrome.storage.sync.set({
      replacement: replacement,
      userWordList: userWordList
    }, function() {
      saveButton.textContent = 'Сохранено!';
      setTimeout(() => { saveButton.textContent = 'Сохранить'; }, 1500);
      
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'updateFilter' }, function(response) {
            if (response) {
              updateWordCount();
            }
          });
        }
      });
      
      setTimeout(() => { 
        settingsModal.style.display = 'none';
        wordListTextArea.style.display = 'none';
        checkButton.style.display = 'block';
      }, 1500);
    });
  });
  
  resetButton.addEventListener('click', function() {
    if (confirm('Вы уверены, что хотите сбросить все настройки?')) {
      chrome.storage.sync.set({
        enabled: false,
        replacement: '*',
        userWordList: []
      }, function() {
        enableFilterToggle.checked = false;
        statusText.textContent = 'Фильтр выключен';
        replacementInput.value = '*';
        wordListTextArea.value = '';
        
        logoAnimation.classList.remove('active');
        
        resetButton.textContent = 'Сброшено!';
        setTimeout(() => { resetButton.textContent = 'Сбросить'; }, 1500);
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'updateFilter' }, function(response) {
              if (response) {
                updateWordCount();
              }
            });
          }
        });
      });
    }
  });
});