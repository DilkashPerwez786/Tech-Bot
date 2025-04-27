document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const typingIndicator = document.getElementById('typing-indicator');
    const priorityOptions = document.querySelectorAll('.priority-option');
    
    // Tech support categories and common issues
    const techCategories = {
        hardware: [
            "computer won't start",
            "slow performance",
            "overheating",
            "strange noises",
            "display issues",
            "peripheral problems"
        ],
        software: [
            "application crashes",
            "system updates",
            "driver issues",
            "error messages",
            "software installation",
            "compatibility problems"
        ],
        network: [
            "internet connection",
            "wifi problems",
            "network speed",
            "connection drops",
            "vpn issues",
            "network security"
        ],
        security: [
            "virus infection",
            "malware",
            "password issues",
            "data protection",
            "unauthorized access",
            "security updates"
        ],
        performance: [
            "slow startup",
            "application lag",
            "memory issues",
            "disk space",
            "system optimization",
            "resource usage"
        ]
    };
    
    let currentIssue = {
        deviceType: "",
        osType: "",
        category: "",
        priority: "",
        description: "",
        steps: []
    };

    // Priority level definitions
    const priorityLevels = {
        low: {
            responseTime: "Within 24 hours",
            description: "Issue does not impact core functionality",
            keywords: ["minor", "cosmetic", "occasional", "slight", "small"]
        },
        medium: {
            responseTime: "Within 8 hours",
            description: "Issue affects work but has workarounds",
            keywords: ["slow", "inconvenient", "partial", "sometimes", "intermittent"]
        },
        high: {
            responseTime: "Within 2 hours",
            description: "Critical issue needs immediate attention",
            keywords: ["crash", "broken", "error", "failed", "urgent", "critical", "not working", "stopped"]
        }
    };
    
    // Add Gemini API integration
    async function generateAIResponse(message) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are a tech support assistant. Provide clear, step-by-step troubleshooting instructions based on the priority level (${currentIssue.priority || 'unspecified'}). Keep responses concise and technical. Current issue details: ${JSON.stringify(currentIssue)}. User message: ${message}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 200,
                        topP: 0.8,
                        topK: 40
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error:', errorData);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('API Response:', data);
            
            if (data.error) {
                throw new Error(data.error.message || 'API Error');
            }

            if (data.candidates && data.candidates[0].content.parts[0].text) {
                let response = data.candidates[0].content.parts[0].text;
                response = response.replace(/[•\-\*]/g, '').trim();
                response = response.split('\n').map(line => line.trim()).filter(line => line).join('\n');
                return response;
            } else {
                throw new Error('Invalid response format from API');
            }
        } catch (error) {
            console.error('Error generating AI response:', error);
            if (error.message.includes('API key')) {
                return "There's an issue with the API configuration. Please check your API key.";
            } else if (error.message.includes('HTTP error')) {
                return "There's a network issue. Please check your internet connection and try again.";
            } else {
                return "I apologize, but I'm having trouble generating a response right now. Please try again.";
            }
        }
    }

    function detectPriority(message) {
        const lowerMessage = message.toLowerCase();
        
        for (const [level, info] of Object.entries(priorityLevels)) {
            if (info.keywords.some(keyword => lowerMessage.includes(keyword))) {
                return level;
            }
        }
        
        return null;
    }

    function isTechRelated(message) {
        const techKeywords = [
            // Hardware
            'computer', 'laptop', 'desktop', 'device', 'hardware', 'screen', 'monitor', 'keyboard',
            'mouse', 'printer', 'speaker', 'microphone', 'camera', 'usb', 'battery', 'power',
            'charger', 'adapter', 'cable', 'port', 'drive', 'memory', 'ram', 'cpu', 'processor',
            'gpu', 'graphics', 'fan', 'heat', 'temperature', 'noise',
            
            // Software
            'software', 'program', 'app', 'application', 'windows', 'mac', 'linux', 'android',
            'ios', 'update', 'install', 'uninstall', 'download', 'driver', 'system', 'os',
            'operating system', 'browser', 'chrome', 'firefox', 'safari', 'edge', 'file',
            'folder', 'delete', 'backup', 'restore', 'settings', 'configuration',
            
            // Network
            'internet', 'wifi', 'network', 'connection', 'ethernet', 'router', 'modem',
            'wireless', 'bluetooth', 'ip', 'dns', 'server', 'vpn', 'proxy', 'firewall',
            'bandwidth', 'speed', 'ping', 'latency', 'packet', 'protocol',
            
            // Security
            'virus', 'malware', 'spyware', 'antivirus', 'security', 'password', 'login',
            'authentication', 'encryption', 'hack', 'breach', 'phishing', 'spam', 'threat',
            'protection', 'firewall', 'backup', 'recovery',
            
            // Performance
            'slow', 'fast', 'speed', 'performance', 'lag', 'freeze', 'crash', 'hang',
            'response', 'boot', 'startup', 'shutdown', 'memory', 'storage', 'disk',
            'space', 'cache', 'temporary', 'process', 'task', 'resource',
            
            // Error related
            'error', 'issue', 'problem', 'bug', 'glitch', 'failure', 'crash', 'blue screen',
            'bsod', 'restart', 'reboot', 'fix', 'repair', 'troubleshoot', 'solve', 'help',
            'support', 'diagnostic', 'debug'
        ];

        const lowerMessage = message.toLowerCase();
        const hasTechKeyword = techKeywords.some(keyword => lowerMessage.includes(keyword));
        
        if (hasTechKeyword) {
            return true;
        }
        
        const isSimpleResponse = ['yes', 'no', 'ok', 'okay', 'sure', 'thanks', 'thank you'].some(word => 
            lowerMessage.trim() === word
        );
        
        return isSimpleResponse;
    }

    async function processMessage(message) {
        message = message.toLowerCase();
        
        // Check if message is tech-related
        if (!isTechRelated(message)) {
            addMessage("I'm sorry, but I can only assist with technical support issues. Please ask me about hardware, software, network, or other tech-related problems.", 'bot');
            return;
        }
        
        // Auto-detect priority if not set
        if (!currentIssue.priority) {
            const detectedPriority = detectPriority(message);
            if (detectedPriority) {
                currentIssue.priority = detectedPriority;
                const priorityInfo = priorityLevels[detectedPriority];
                addMessage(`Based on your description, this appears to be a ${detectedPriority} priority issue. Expected response time: ${priorityInfo.responseTime}. ${priorityInfo.description}.`, 'bot');
                
                // Update UI to reflect detected priority
                priorityOptions.forEach(option => {
                    if (option.dataset.priority === detectedPriority) {
                        option.classList.add('selected');
                    } else {
                        option.classList.remove('selected');
                    }
                });
            }
        }
        
        // Check device type
        const deviceTypeInput = document.getElementById('device-type');
        if (deviceTypeInput.value === '' && (message.includes('computer') || message.includes('laptop') || 
            message.includes('desktop') || message.includes('device') || message.includes('mobile') || 
            message.includes('tablet'))) {
            addMessage("What type of device are you using? (Desktop, Laptop, Mobile, Tablet, or Other)", 'bot');
            return;
        }
        
        // Check operating system
        const osTypeInput = document.getElementById('os-type');
        if (osTypeInput.value === '' && (message.includes('windows') || message.includes('mac') || 
            message.includes('linux') || message.includes('android') || message.includes('ios'))) {
            addMessage("What operating system are you using? (Windows, macOS, Linux, Android, or iOS)", 'bot');
            return;
        }
        
        // Check issue category
        const issueCategoryInput = document.getElementById('issue-category');
        if (issueCategoryInput.value === '') {
            for (const category in techCategories) {
                if (techCategories[category].some(issue => message.includes(issue))) {
                    currentIssue.category = category;
                    issueCategoryInput.value = category;
                    addMessage(`I understand this is a ${category} issue. Can you provide more details about the specific problem?`, 'bot');
            return;
                }
            }
        }
        
        // Update current issue details
        currentIssue.deviceType = deviceTypeInput.value;
        currentIssue.osType = osTypeInput.value;
        currentIssue.category = issueCategoryInput.value;
        
        if (!currentIssue.description) {
            currentIssue.description = message;
        }
        
        // Generate response based on the issue details
        const aiResponse = await generateAIResponse(message);
        addMessage(aiResponse, 'bot');
        
        // Store troubleshooting steps
        if (aiResponse.includes('1.') || aiResponse.includes('Step')) {
            currentIssue.steps.push(aiResponse);
        }
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (message) {
        addMessage(message, 'user');
        userInput.value = '';
        typingIndicator.style.display = 'flex';
        await processMessage(message);
        typingIndicator.style.display = 'none';
        }
    }
    
    function addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.textContent = content;
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }
    
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Event Listeners
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Priority selection
    priorityOptions.forEach(option => {
        option.addEventListener('click', () => {
            const priority = option.dataset.priority;
            priorityOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            currentIssue.priority = priority;
            
            // Show priority level information
            const priorityInfo = priorityLevels[priority];
            addMessage(`Priority level set to ${priority}. Expected response time: ${priorityInfo.responseTime}. ${priorityInfo.description}`, 'bot');
        });
    });
    
    // Initial greeting
    addMessage("Hello! I'm your tech support assistant. I can help you troubleshoot hardware, software, network, and other technical issues. Please describe your problem or select a category from the sidebar.", 'bot');
}); 