
// content.ts

interface State {
    status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
    prompts: string[];
    currentIndex: number;
}

let state: State = {
    status: 'IDLE',
    prompts: [],
    currentIndex: 0
};

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_STATUS') {
        sendResponse({
            status: state.status,
            currentIndex: state.currentIndex,
            total: state.prompts.length,
            currentPrompt: state.prompts[state.currentIndex] || ''
        });
    } else if (request.action === 'PLAY') {
        if (request.prompts && state.status === 'IDLE') {
            state.prompts = request.prompts;
            state.currentIndex = 0;
        }
        // If paused, we resume. If IDLE, we start.
        state.status = 'RUNNING';
        processQueue();
        sendResponse({ status: 'STARTED' });
    } else if (request.action === 'STOP') {
        state.status = 'PAUSED';
        sendResponse({ status: 'STOPPED' });
    } else if (request.action === 'RESET') {
        state.status = 'IDLE';
        state.currentIndex = 0;
        state.prompts = [];
        sendResponse({ status: 'RESET' });
    }
    return true; // Keep channel open for async response if needed
});

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to wait for a condition
async function waitForCondition(checkFn: () => boolean | Promise<boolean>, interval = 300): Promise<void> {
    while (true) {
        if (state.status !== 'RUNNING') throw new Error('STOPPED'); // Break loop if stopped
        const result = await checkFn();
        if (result) return;
        await delay(interval);
    }
}

async function checkSendAvailable() {
    await waitForCondition(() => {
        const el = document.querySelector('.mic-button-container');
        const sendButton = document.querySelector('.send-button-container');

        // Logic from user: wait until mic is hidden? Or check if send is visible?
        // User code:
        // if (el && el.classList.contains('hidden')) {
        //     if (sendButton && sendButton.classList.contains('visible')) {
        //         return true; 
        //     }
        // }

        // NOTE: Interpreting user logic. It seems they wait until mic is hidden AND send is visible? 
        // Or just broken out of loop when that happens.

        // User's original code explanation:
        // `break` when mic hidden and send visible.

        if (el && el.classList.contains('hidden')) {
            if (sendButton && sendButton.classList.contains('visible') || (sendButton && !sendButton.classList.contains('hidden'))) {
                // visible class might not be present, it might just NOT be hidden. 
                // We'll stick to user logic as close as possible but make it robust.
                return true;
            }
        }
        return false;
    });
}

async function checkFontIconDisappear() {
    await waitForCondition(() => {
        const el = document.querySelector('[fonticon="stop"]');
        return !el; // Return true if el is gone
    });
}

async function processQueue() {
    if (state.status !== 'RUNNING') return;

    while (state.currentIndex < state.prompts.length) {
        if (state.status !== 'RUNNING') break;

        try {
            const currentPrompt = state.prompts[state.currentIndex];
            console.log(`[Automation] Processing: ${currentPrompt}`);

            const p = document.querySelector('.ql-editor p') as HTMLElement;

            await checkFontIconDisappear();

            if (p) {
                // Set text
                p.innerText = currentPrompt;

                // Trigger input events so the UI knows it changed (React/Frameworks often need this)
                p.dispatchEvent(new Event('input', { bubbles: true }));

                await delay(3000);

                await checkSendAvailable();

                const sendBtn = document.querySelector('[aria-label="ส่งข้อความ"]') as HTMLElement;
                if (sendBtn) {
                    sendBtn.click();
                } else {
                    console.error("Send button not found!");
                }

                await delay(3000);
            } else {
                console.error("Editor paragraph not found");
                await delay(1000); // Wait and retry loop might be stuck without this
            }

            state.currentIndex++;

        } catch (e) {
            if ((e as Error).message === 'STOPPED') {
                console.log('Automation Stopped');
                break;
            }
            console.error('Error in automation loop:', e);
            await delay(1000); // Retry logic or pause?
        }
    }

    if (state.currentIndex >= state.prompts.length) {
        state.status = 'COMPLETED';
        console.log('Automation Completed');
    }
}
