// Socket.IO connection
let socket = null;
let roomId = null;
let username = null;
let room = null;
let syncingFromSocket = false;
let syncTimeout = null;

// Video player state
let ignoreNextSeek = false;

// DOM Elements
const video = document.getElementById('video-player');
const playPauseBtn = document.getElementById('btn-play-pause');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const progressFilled = document.getElementById('progress-filled');
const progressHandle = document.getElementById('progress-handle');
const currentTimeEl = document.getElementById('current-time');
const currentTimeMobileEl = document.getElementById('current-time-mobile');
const durationEl = document.getElementById('duration');
const durationMobileEl = document.getElementById('duration-mobile');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const usernameModal = document.getElementById('username-modal');
const toastContainer = document.getElementById('toast-container');

// Get room ID from URL
const urlParams = new URLSearchParams(window.location.search);
roomId = urlParams.get('id');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check if room ID exists
    if (!roomId) {
        showToast('معرف الغرفة غير موجود', 'error');
        setTimeout(() => {
            window.location.href = '/client.html';
        }, 2000);
        return;
    }

    // Check for saved username
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
        username = savedUsername;
        init();
    }
});

// Join room
function joinRoom() {
    const usernameInput = document.getElementById('username-input');
    const enteredUsername = usernameInput.value.trim();
    
    if (!enteredUsername) {
        showToast('يرجى إدخال اسمك', 'error');
        return;
    }

    username = enteredUsername;
    localStorage.setItem('username', username);
    
    usernameModal.classList.add('hidden');
    init();
}

// Initialize socket and room
async function init() {
    // Initialize socket
    socket = io('https://watch-party-v2gx.onrender.com',{
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000
    });

    // Setup socket events
    setupSocketEvents();

    // Join room
    socket.emit('join-room', { roomId, username });

    console.log(`Joining room ${roomId} as ${username}`);
}

// Setup socket events
function setupSocketEvents() {
    // Connection events
    socket.on('connect', () => {
        console.log('Connected to server');
        showToast('تم الاتصال بالخادم', 'success');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        showToast('فقد الاتصال... جاري إعادة الاتصال', 'warning');
    });

    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        showToast('فشل الاتصال. حاول تحديث الصفحة.', 'error');
    });

    // Room events
    socket.on('room-joined', (data) => {
        room = data.room;
        loadChatMessages(data.messages);
        updateUI();
        loadVideo();
    });

    socket.on('error', (data) => {
        showToast(data.message, 'error');
        setTimeout(() => {
            window.location.href = '/client.html';
        }, 3000);
    });

    // User events
    socket.on('user-joined', (data) => {
        updateUserCount(data.userCount);
        showToast(`انضم ${data.username}`, 'info');
    });

    socket.on('user-left', (data) => {
        updateUserCount(data.userCount);
        showToast(`غادر ${data.username}`, 'info');
    });

    // Video sync events
    socket.on('sync-play', (data) => {
        if (syncingFromSocket) return;
        
        syncingFromSocket = true;
        const playPromise = video.play();
        
        playPromise
            .then(() => {
                if (Math.abs(video.currentTime - data.currentTime) > 2) {
                    video.currentTime = data.currentTime;
                }
                if (room) room.isPlaying = true;
                updatePlayPauseButton(true);
                showToast(`شغل ${data.username} الفيديو`, 'play');
            })
            .catch(err => {
                console.error('Playback error:', err);
            })
            .finally(() => {
                clearTimeout(syncTimeout);
                syncTimeout = setTimeout(() => {
                    syncingFromSocket = false;
                }, 800);
            });
    });

    socket.on('sync-pause', (data) => {
        if (syncingFromSocket) return;
        
        syncingFromSocket = true;
        video.pause();
        
        if (Math.abs(video.currentTime - data.currentTime) > 2) {
            video.currentTime = data.currentTime;
        }
        if (room) room.isPlaying = false;
        updatePlayPauseButton(false);
        showToast(`أوقف ${data.username} الفيديو`, 'pause');
        
        clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
            syncingFromSocket = false;
        }, 800);
    });

    socket.on('sync-seek', (data) => {
        if (syncingFromSocket) return;
        
        syncingFromSocket = true;
        ignoreNextSeek = true;
        
        video.currentTime = data.currentTime;
        if (room) room.currentTime = data.currentTime;
        
        showToast(`قفز ${data.username} إلى ${formatTime(data.currentTime)}`, 'seek');
        
        clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
            syncingFromSocket = false;
            setTimeout(() => {
                ignoreNextSeek = false;
            }, 500);
        }, 800);
    });

    socket.on('sync-rate', (data) => {
        video.playbackRate = data.playbackRate || 1;
        showToast(`غير ${data.username} السرعة إلى ${data.playbackRate}x`, 'rate');
    });

    // Sync request (for new joiners)
    socket.on('sync-request', ({ requesterId }) => {
        if (video && room) {
            const state = {
                currentTime: video.currentTime,
                isPlaying: !video.paused,
                playbackRate: video.playbackRate
            };
            socket.emit('send-sync-state', { requesterId, state });
        }
    });

    socket.on('sync-state', (state) => {
        if (syncingFromSocket) return;
        
        syncingFromSocket = true;
        video.playbackRate = state.playbackRate;
        video.currentTime = state.currentTime;
        
        const playPromise = state.isPlaying 
            ? video.play() 
            : Promise.resolve();
            
        playPromise
            .then(() => {
                if (room) {
                    room.isPlaying = state.isPlaying;
                    room.currentTime = state.currentTime;
                }
                updatePlayPauseButton(state.isPlaying);
                showToast('تمت مزامنة الفيديو', 'success');
            })
            .catch(err => {
                console.error('Sync playback error:', err);
            })
            .finally(() => {
                clearTimeout(syncTimeout);
                syncTimeout = setTimeout(() => {
                    syncingFromSocket = false;
                }, 800);
            });
    });

    // Chat events
    socket.on('chat-message', (message) => {
        addChatMessage(message);
    });
}

// Load video
function loadVideo() {
    if (!room) return;

    video.src = room.videoUrl;
    video.load();
    
    // Load subtitles if available
    const subtitleTrack = document.getElementById('subtitle-track');
    if (room.subtitlePath) {
        subtitleTrack.src = room.subtitlePath;
        document.getElementById('subtitle-display').textContent = 'متوفرة (ملف)';
        document.querySelector('.info-item-subtitle').style.display = 'flex';
    } else {
        subtitleTrack.removeAttribute('src');
        document.getElementById('subtitle-display').textContent = 'لا توجد';
        document.querySelector('.info-item-subtitle').style.display = 'none';
    }

    console.log('Loading video:', room.videoUrl);
}

// Update UI
function updateUI() {
    if (!room) return;

    // Update room name
    document.getElementById('room-name-display').textContent = room.name;
    document.getElementById('room-name-main').textContent = room.name;
    
    // Update host
    document.getElementById('room-host').textContent = `من ${room.hostName}`;
    
    // Update video URL display
    document.getElementById('video-url-display').textContent = room.videoUrl;
}

// Update user count
function updateUserCount(count) {
    document.getElementById('users-count').querySelector('.users-number').textContent = count;
    document.getElementById('chat-users-number').textContent = count;
}

// Update play/pause button
function updatePlayPauseButton(isPlaying) {
    if (isPlaying) {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
    } else {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
    }
}

// Video events
video.addEventListener('loadedmetadata', () => {
    durationEl.textContent = formatTime(video.duration);
    durationMobileEl.textContent = formatTime(video.duration);
});

video.addEventListener('timeupdate', () => {
    const current = video.currentTime;
    const duration = video.duration;
    
    // Update time displays
    currentTimeEl.textContent = formatTime(current);
    currentTimeMobileEl.textContent = formatTime(current);
    
    // Update progress bar
    if (duration > 0) {
        const percent = (current / duration) * 100;
        progressFilled.style.width = `${percent}%`;
        progressHandle.style.left = `${percent}%`;
    }
    
    // Update room state
    if (room && !syncingFromSocket) {
        room.currentTime = current;
        room.isPlaying = !video.paused;
    }
});

video.addEventListener('play', () => {
    if (!syncingFromSocket) {
        updatePlayPauseButton(true);
        socket.emit('video-play', { roomId, currentTime: video.currentTime });
        if (room) room.isPlaying = true;
    }
});

video.addEventListener('pause', () => {
    if (!syncingFromSocket) {
        updatePlayPauseButton(false);
        socket.emit('video-pause', { roomId, currentTime: video.currentTime });
        if (room) room.isPlaying = false;
    }
});

video.addEventListener('seeked', () => {
    if (!syncingFromSocket && !ignoreNextSeek) {
        socket.emit('video-seek', { roomId, currentTime: video.currentTime });
        if (room) room.currentTime = video.currentTime;
    }
});

video.addEventListener('ratechange', () => {
    if (room) {
        const speedButtons = document.querySelectorAll('.btn-speed');
        speedButtons.forEach(btn => {
            if (parseFloat(btn.dataset.speed) === video.playbackRate) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
});

// Control functions
function togglePlay() {
    if (video.paused) {
        video.play();
    } else {
        video.pause();
    }
}

function skip(seconds) {
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
}

function setSpeed(rate) {
    video.playbackRate = rate;
    socket.emit('video-rate', { roomId, playbackRate: rate });
}

function seekToPosition(event) {
    if (!video.duration) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percent = x / rect.width;
    const newTime = percent * video.duration;
    
    video.currentTime = newTime;
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        video.requestFullscreen().catch(err => {
            console.error('Fullscreen error:', err);
            showToast('فشل تفعيل ملء الشاشة', 'error');
        });
    } else {
        document.exitFullscreen();
    }
}

// Speed control buttons
document.querySelectorAll('.btn-speed').forEach(btn => {
    btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed);
        setSpeed(speed);
    });
});

// Chat functions
function addChatMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    
    const isMe = message.username === username;
    messageDiv.classList.add(isMe ? 'my-message' : 'other-message');
    
    const time = new Date(message.timestamp).toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-username">${escapeHtml(message.username)}</span>
            <span class="message-time">${time}</span>
        </div>
        <div class="message-content">${escapeHtml(message.message)}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function loadChatMessages(messages) {
    // Keep welcome message
    chatMessages.innerHTML = `
        <div class="chat-welcome">
            <span class="chat-welcome-text">👋 مرحباً! شارك أفلامك مع أصدقائك في الوقت الحقيقي</span>
        </div>
    `;
    
    messages.forEach(msg => addChatMessage(msg));
}

function sendMessage() {
    const message = chatInput.value.trim();
    
    if (!message || !socket) return;
    
    socket.emit('send-message', { roomId, message });
    chatInput.value = '';
}

function handleChatKeypress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Share room
function shareRoom() {
    const url = window.location.href;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            showToast('تم نسخ الرابط!', 'success');
        }).catch(err => {
            console.error('Copy error:', err);
            fallbackCopy(url);
        });
    } else {
        fallbackCopy(url);
    }
}

function fallbackCopy(url) {
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showToast('تم نسخ الرابط!', 'success');
}

function goHome() {
    if (confirm('هل تريد بالتأكيد مغادرة الغرفة؟')) {
        window.location.href = '/client.html';
    }
}

// Format time
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'error') icon = '⚠️';
    else if (type === 'success') icon = '✅';
    else if (type === 'warning') icon = '⚡';
    else if (type === 'play') icon = '▶️';
    else if (type === 'pause') icon = '⏸';
    else if (type === 'seek') icon = '⏭';
    else if (type === 'rate') icon = '⚡';
    
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove based on type
    let duration = 5000;
    if (type === 'play' || type === 'pause' || type === 'seek' || type === 'rate') {
        duration = 2500;
    }
    
    setTimeout(() => {
        toast.remove();
    }, duration);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Only if not typing in input
    if (document.activeElement.tagName === 'INPUT') return;
    
    switch(e.key) {
        case ' ':
        e.preventDefault();
            togglePlay();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            skip(-10);
            break;
        case 'ArrowRight':
            e.preventDefault();
            skip(10);
            break;
        case 'f':
            e.preventDefault();
            toggleFullscreen();
            break;
        case 'Escape':
            if (!usernameModal.classList.contains('hidden')) {
                // Don't exit modal with Escape
                e.preventDefault();
            }
            break;
    }
});
