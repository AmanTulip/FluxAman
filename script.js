// DOM Elements
const modal = document.getElementById('post-modal');
const openModalBtn = document.getElementById('open-post-modal');
const closeModalBtn = document.querySelector('.close-modal');
const postBtn = document.getElementById('post-btn');
const postText = document.getElementById('post-text');
const mediaPreviewContainer = document.getElementById('media-preview-container');
const contentSection = document.querySelector('.content-section');

// State
let currentMedia = null;
let currentMediaType = null; // 'image', 'video', 'document'

// --- Modal Functions ---

function openModal(type = 'text') {
    modal.style.display = 'flex';
    postText.focus();

    // If opened via specific media button, trigger that input
    if (type === 'image') document.getElementById('file-input-image').click();
    if (type === 'video') document.getElementById('file-input-video').click();
    if (type === 'document') document.getElementById('file-input-doc').click();
}

function closeModal() {
    modal.style.display = 'none';
    resetForm();
}

// Close modal when clicking outside
window.onclick = function (event) {
    if (event.target == modal) {
        closeModal();
    }
}

openModalBtn.addEventListener('click', () => openModal('text'));
closeModalBtn.addEventListener('click', closeModal);

// --- File Handling ---

function handleFileSelect(input, type) {
    const file = input.files[0];
    if (!file) return;

    currentMedia = file;
    currentMediaType = type;

    renderPreview(file, type);
    validatePost();
}

function renderPreview(file, type) {
    mediaPreviewContainer.innerHTML = '';
    mediaPreviewContainer.classList.remove('hidden');

    const removeBtn = document.createElement('span');
    removeBtn.className = 'remove-media';
    removeBtn.innerHTML = '&times;';
    removeBtn.onclick = removeMedia;

    if (type === 'image') {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        mediaPreviewContainer.appendChild(img);
    } else if (type === 'video') {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.controls = true;
        mediaPreviewContainer.appendChild(video);
    } else if (type === 'document') {
        const docDiv = document.createElement('div');
        docDiv.className = 'doc-preview';
        docDiv.innerHTML = `
            <i class="fa-solid fa-file-alt doc-icon"></i>
            <div class="doc-info">
                <span class="doc-name">${file.name}</span>
                <span class="doc-size">${(file.size / 1024).toFixed(1)} KB</span>
            </div>
        `;
        mediaPreviewContainer.appendChild(docDiv);
    }

    mediaPreviewContainer.appendChild(removeBtn);
}

function removeMedia() {
    currentMedia = null;
    currentMediaType = null;
    mediaPreviewContainer.innerHTML = '';
    mediaPreviewContainer.classList.add('hidden');

    // Reset inputs
    document.getElementById('file-input-image').value = '';
    document.getElementById('file-input-video').value = '';
    document.getElementById('file-input-doc').value = '';

    validatePost();
}

// --- Post Creation ---

postText.addEventListener('input', validatePost);

function validatePost() {
    if (postText.value.trim().length > 0 || currentMedia) {
        postBtn.disabled = false;
        postBtn.style.opacity = '1';
    } else {
        postBtn.disabled = true;
        postBtn.style.opacity = '0.5';
    }
}

postBtn.addEventListener('click', createPost);

async function createPost() {
    const text = postText.value;

    const formData = new FormData();
    formData.append('text', text);
    if (currentMedia) {
        formData.append('media', currentMedia);
    }

    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const newPost = await response.json();
            renderPost(newPost);
            closeModal();
        } else {
            const errorText = await response.text();
            console.error('Server Error:', errorText);
            alert(`Failed to create post. Server responded with: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error creating post:', error);
        alert(`Error creating post: ${error.message}.`);
    }
}

function renderPost(post) {
    const newPost = document.createElement('div');
    newPost.className = 'card';
    newPost.style.animation = 'fadeIn 0.5s ease';

    let mediaContent = '';

    if (post.media) {
        if (post.mediaType === 'image') {
            mediaContent = `<img src="${post.media}" class="post-image" alt="Post Image">`;
        } else if (post.mediaType === 'video') {
            mediaContent = `<video src="${post.media}" class="video" controls></video>`;
        } else if (post.mediaType === 'document') {
            mediaContent = `
                <div class="doc-preview" style="margin-top: 15px;">
                    <i class="fa-solid fa-file-alt doc-icon"></i>
                    <div class="doc-info">
                        <span class="doc-name">${post.originalName}</span>
                        <a href="${post.media}" download="${post.originalName}" class="doc-size" style="color: var(--accent);">Download</a>
                    </div>
                </div>
            `;
        }
    }

    // Convert newlines to <br> for text
    const formattedText = post.text.replace(/\n/g, '<br>');
    const timeString = new Date(post.timestamp).toLocaleString();

    newPost.innerHTML = `
        <div class="post-header">
            <img src="Photo.png" class="mini-dp" alt="dp">
            <div class="post-meta">
                <h3>Aman Kumar</h3>
                <span>${timeString}</span>
            </div>
        </div>
        <div class="post-text">
            ${formattedText}
            ${mediaContent}
        </div>
    `;

    // Insert after the create-post-card
    const createPostCard = document.querySelector('.create-post-card');
    contentSection.insertBefore(newPost, createPostCard.nextSibling);
}

async function loadPosts() {
    try {
        const response = await fetch('/api/posts');
        const posts = await response.json();
        // Reverse to show newest first if API returns oldest first, 
        // but our API appends to top of array, so we might need to check order.
        // Actually server unshifts, so index 0 is newest.
        // But we are appending to DOM. If we iterate 0..N and append after create-post-card,
        // we need to be careful.
        // If we use insertBefore(newPost, createPostCard.nextSibling), we are prepending to the feed.
        // So we should iterate from Oldest to Newest (End to Start) if we want Newest on top?
        // Wait, if we use insertBefore(..., nextSibling), the last inserted element will be closest to createPostCard (top).
        // So we should iterate from Oldest (bottom) to Newest (top).

        // Server returns [Newest, ..., Oldest]
        // If we iterate:
        // 1. Newest -> Insert after Card -> [Card, Newest]
        // 2. 2nd Newest -> Insert after Card -> [Card, 2nd Newest, Newest]
        // This reverses the order! 

        // So we should iterate in reverse (Oldest to Newest) OR append to end of container?
        // But we have other static content (Education).

        // Let's just append them in order after the create-post-card, but we need to maintain order.
        // If we want [Card, Newest, 2nd Newest], we should:
        // 1. Take Newest.
        // 2. Take 2nd Newest.
        // ...

        // Actually, let's simplify. We can just insert them one by one.
        // If we use `insertBefore(newPost, createPostCard.nextSibling)`, we are pushing existing posts down.
        // So if we process [Newest, 2nd Newest],
        // 1. Insert Newest -> [Card, Newest]
        // 2. Insert 2nd Newest -> [Card, 2nd Newest, Newest] -> WRONG.

        // So we should process from Oldest to Newest (reverse array).
        // [Oldest, ..., Newest]
        // 1. Insert Oldest -> [Card, Oldest]
        // ...
        // N. Insert Newest -> [Card, Newest, ..., Oldest] -> CORRECT.

        posts.reverse().forEach(renderPost);

    } catch (error) {
        console.error('Error loading posts:', error);
    }
}

// Load posts on startup
loadPosts();

function resetForm() {
    postText.value = '';
    removeMedia();
    validatePost();
}

// --- Admin Mode ---

function toggleAdmin() {
    const createPostSection = document.getElementById('create-post-section');
    const adminTrigger = document.getElementById('admin-trigger');

    if (createPostSection.classList.contains('hidden')) {
        const password = prompt("Enter Admin Password:");
        if (password === "admin123") {
            createPostSection.classList.remove('hidden');
            adminTrigger.classList.add('unlocked');
            adminTrigger.innerHTML = '<i class="fa-solid fa-unlock"></i>';
        } else if (password !== null) {
            alert("Incorrect Password!");
        }
    } else {
        createPostSection.classList.add('hidden');
        adminTrigger.classList.remove('unlocked');
        adminTrigger.innerHTML = '<i class="fa-solid fa-lock"></i>';
    }
}
