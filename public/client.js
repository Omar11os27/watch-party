// API Base URL
const API_URL = 'https://watch-party-v2gx.onrender.com';

// Sample videos
const SAMPLE_VIDEOS = [
    {
        name: 'Big Buck Bunny',
        url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
        description: 'رسوم متحركة كلاسيكية'
    },
    {
        name: 'Jellyfish',
        url: 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4',
        description: 'عينة HD مع دعم الترجمة'
    },
    {
        name: 'Sintel',
        url: 'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4',
        description: 'مشهد طبيعي جميل'
    }
];

// Subtitle source
let currentSubtitleSource = 'url'; // 'url' or 'file'
let selectedSubtitleFile = null;

// DOM Elements
const createModal = document.getElementById('create-modal');
const roomsList = document.getElementById('rooms-list');
const createForm = document.getElementById('create-form');

// Load rooms on page load
document.addEventListener('DOMContentLoaded', () => {
    loadRooms();
    // Check for saved username
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
        document.getElementById('host-name').value = savedUsername;
    }
});

// Open create modal
function openCreateModal() {
    createModal.classList.remove('hidden');
    document.getElementById('room-name').focus();
}

// Close create modal
function closeCreateModal() {
    createModal.classList.add('hidden');
    resetForm();
}

// Reset form
function resetForm() {
    createForm.reset();
    setSubtitleSource('url');
    removeSubtitleFile();
    hideFormStatus();
}

// Load rooms from API
async function loadRooms() {
    try {
        roomsList.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>جاري تحميل الغرف...</p>
            </div>
        `;

        const response = await fetch(`${API_URL}/rooms`);
        const data = await response.json();

        if (data.rooms && data.rooms.length > 0) {
            renderRooms(data.rooms);
        } else {
            renderNoRooms();
        }
    } catch (error) {
        console.error('Error loading rooms:', error);
        roomsList.innerHTML = `
            <div class="error-state">
                <span class="error-icon">⚠️</span>
                <p>فشل تحميل الغرف. حاول مرة أخرى.</p>
                <button class="btn btn-primary" onclick="loadRooms()">🔄 إعادة المحاولة</button>
            </div>
        `;
    }
}

// Render rooms list
function renderRooms(rooms) {
    roomsList.innerHTML = rooms.map(room => `
        <div class="room-card" onclick="joinRoom('${room.id}')">
            <div class="room-header">
                <h3 class="room-name">${escapeHtml(room.name)}</h3>
                ${room.isPlaying ? '<span class="room-status live">🔴 مباشر</span>' : ''}
            </div>
            <div class="room-body">
                <div class="room-info">
                    <span class="room-info-icon">👤</span>
                    <span class="room-info-text">من ${escapeHtml(room.hostName)}</span>
                </div>
                <div class="room-info">
                    <span class="room-info-icon">🎬</span>
                    <span class="room-info-text room-video-url">${escapeHtml(room.videoUrl)}</span>
                </div>
                ${room.subtitlePath ? `
                    <div class="room-info">
                        <span class="room-info-icon">📝</span>
                        <span class="room-info-text">ترجمات متوفرة</span>
                    </div>
                ` : ''}
                <div class="room-info">
                    <span class="room-info-icon">🕐</span>
                    <span class="room-info-text">${formatDate(room.createdAt)}</span>
                </div>
            </div>
            <button class="btn btn-primary btn-block">انضمام للغرفة</button>
        </div>
    `).join('');
}

// Render no rooms state
function renderNoRooms() {
    roomsList.innerHTML = `
        <div class="no-rooms">
            <div class="no-rooms-icon">🎬</div>
            <h3 class="no-rooms-title">لا توجد غرف حالياً</h3>
            <p class="no-rooms-text">كن أول من ينشئ غرفة مشاهدة ويبدأ بمشاركة الأفلام مع أصدقائك!</p>
            <button class="btn btn-primary" onclick="openCreateModal()">
                <span class="plus">+</span>
                <span>إنشاء أول غرفة</span>
            </button>
        </div>
    `;
}

// Set subtitle source
function setSubtitleSource(source) {
    currentSubtitleSource = source;
    
    // Update UI
    document.querySelectorAll('.source-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.source === source) {
            btn.classList.add('active');
        }
    });

    // Show/hide appropriate input group
    const urlGroup = document.getElementById('url-subtitle-group');
    const fileGroup = document.getElementById('file-subtitle-group');
    
    if (source === 'url') {
        urlGroup.classList.remove('hidden');
        fileGroup.classList.add('hidden');
        removeSubtitleFile();
    } else {
        urlGroup.classList.add('hidden');
        fileGroup.classList.remove('hidden');
    }
}

// Handle subtitle file selection
function handleSubtitleFile(input) {
    const file = input.files[0];
    if (!file) return;

    // Validate file type
    const validExtensions = ['.vtt', '.srt', '.ass', '.ssa'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
        showToast('صيغة الملف غير مدعومة. الصيغ المدعومة: VTT, SRT, ASS, SSA', 'error');
        input.value = '';
        return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
        showToast('حجم الملف كبير جداً. الحد الأقصى 10MB', 'error');
        input.value = '';
        return;
    }

    selectedSubtitleFile = file;
    const fileInfo = document.getElementById('file-info');
    const fileName = fileInfo.querySelector('.file-name');
    
    fileName.textContent = file.name;
    fileInfo.classList.remove('hidden');
}

// Remove subtitle file
function removeSubtitleFile() {
    selectedSubtitleFile = null;
    const fileInput = document.getElementById('subtitle-file');
    const fileInfo = document.getElementById('file-info');
    
    fileInput.value = '';
    fileInfo.classList.add('hidden');
}

// Select sample video
function selectSample(index) {
    const video = SAMPLE_VIDEOS[index];
    document.getElementById('video-url').value = video.url;
    
    // Auto-fill room name
    document.getElementById('room-name').value = `مشاهدة: ${video.name}`;
    
    showToast(`تم اختيار: ${video.name}`, 'success');
    
    // Close sample panel if open
    const panel = document.getElementById('sample-videos-panel');
    panel.classList.add('hidden');
}

// Toggle sample videos panel
function toggleSampleVideos() {
    const panel = document.getElementById('sample-videos-panel');
    panel.classList.toggle('hidden');
}

// Show form status
function showFormStatus(message, type) {
    const status = document.getElementById('form-status');
    const statusText = status.querySelector('.status-text');
    
    statusText.textContent = message;
    status.classList.remove('hidden');
    
    if (type === 'loading') {
        status.classList.add('loading');
    } else if (type === 'error') {
        status.classList.add('error');
    }
}

function hideFormStatus() {
    const status = document.getElementById('form-status');
    status.classList.add('hidden');
    status.classList.remove('loading', 'error');
}

// Create room
async function createRoom() {
    const name = document.getElementById('room-name').value.trim();
    const videoUrl = document.getElementById('video-url').value.trim();
    const subtitleUrl = document.getElementById('subtitle-url').value.trim();
    const hostName = document.getElementById('host-name').value.trim();

    // Validation
    if (!name || !videoUrl || !hostName) {
        showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }

    // Validate video URL
    try {
        new URL(videoUrl);
    } catch {
        showToast('رابط الفيديو غير صالح', 'error');
        return;
    }

    showFormStatus('جاري إنشاء الغرفة...', 'loading');

    try {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('videoUrl', videoUrl);
        formData.append('hostName', hostName);
        
        if (currentSubtitleSource === 'url' && subtitleUrl) {
            formData.append('subtitleUrl', subtitleUrl);
        }
        
        if (currentSubtitleSource === 'file' && selectedSubtitleFile) {
            formData.append('subtitle', selectedSubtitleFile);
        }

        const response = await fetch(`${API_URL}/rooms`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            // Save username
            localStorage.setItem('username', hostName);
            
            showToast('تم إنشاء الغرفة بنجاح!', 'success');
            
            // Redirect to room page
            window.location.href = `/client-room.html?id=${data.room.id}`;
        } else {
            showToast(data.error || 'فشل إنشاء الغرفة', 'error');
            hideFormStatus();
        }
    } catch (error) {
        console.error('Error creating room:', error);
        showToast('فشل إنشاء الغرفة. حاول مرة أخرى.', 'error');
        hideFormStatus();
    }
}

// Join room
function joinRoom(roomId) {
    window.location.href = `/room.html?id=${roomId}`;
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) {
        return 'الآن';
    } else if (diff < 3600000) {
        return `منذ ${Math.floor(diff / 60000)} دقيقة`;
    } else if (diff < 86400000) {
        return `منذ ${Math.floor(diff / 3600000)} ساعة`;
    } else {
        return date.toLocaleDateString('ar-SA', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show toast notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️'}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !createModal.classList.contains('hidden')) {
        closeCreateModal();
    }
});

// Close modal on outside click
createModal.addEventListener('click', (e) => {
    if (e.target === createModal) {
        closeCreateModal();
    }
});
