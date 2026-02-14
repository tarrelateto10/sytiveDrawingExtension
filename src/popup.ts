
// popup.ts
interface StatusUpdate {
    status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
    currentIndex: number;
    total: number;
    currentPrompt: string;
}

document.addEventListener('DOMContentLoaded', () => {
    const promptsInput = document.getElementById('prompts') as HTMLTextAreaElement;
    const playBtn = document.getElementById('play') as HTMLButtonElement;
    const stopBtn = document.getElementById('stop') as HTMLButtonElement;
    const resetBtn = document.getElementById('reset') as HTMLButtonElement;
    const statusText = document.getElementById('status-text') as HTMLSpanElement;
    const progressText = document.getElementById('progress-text') as HTMLSpanElement;
    const currentPromptDisplay = document.getElementById('current-prompt-display') as HTMLParagraphElement;

    // Load saved state
    chrome.storage.local.get(['prompts'], (result) => {
        if (result.prompts) {
            promptsInput.value = result.prompts;
        }
    });

    // Poll for status from content script
    setInterval(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'GET_STATUS' }, (response: StatusUpdate) => {
                    if (chrome.runtime.lastError || !response) return; // Content script might not be ready

                    updateUI(response);
                });
            }
        });
    }, 1000);

    playBtn.addEventListener('click', () => {
        const prompts = promptsInput.value;
        chrome.storage.local.set({ prompts });

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'PLAY',
                    prompts: prompts.split('<end>').filter(a => a.includes('<start>')).map(item => item.replace("<start>", "").replace('"', "").trim())
                });
            }
        });
    });

    stopBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'STOP' });
            }
        });
    });

    resetBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'RESET' });
            }
        });
    });

    function updateUI(status: StatusUpdate) {
        statusText.innerText = status.status;
        progressText.innerText = `${status.currentIndex} / ${status.total}`;
        currentPromptDisplay.innerText = status.currentPrompt || 'None';

        if (status.status === 'RUNNING') {
            playBtn.disabled = true;
            stopBtn.disabled = false;
        } else {
            playBtn.disabled = false;
            stopBtn.disabled = true;
        }
    }
});
