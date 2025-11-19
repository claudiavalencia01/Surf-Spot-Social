// app/public/js/posts.js

let currentUser = null;

async function loadUser() {
  try {
    const res = await fetch("/me");
    const data = await res.json();
    currentUser = data.user || null;
  } catch (e) {
    currentUser = null;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadUser();
  setupAuthGate();
  if (currentUser) {
    initCreatePostModal();
    loadPosts();
  }
});

// -----------------------------
// AUTH GATE
// -----------------------------
function setupAuthGate() {
  const feed = document.getElementById("posts-feed");
  const createBtn = document.getElementById("open-create-post");

  if (!currentUser) {
    feed.innerHTML = `
      <div class="text-center text-slate-600 p-6">
        <p class="text-lg font-semibold">You must be logged in to view or create posts.</p>
        <p class="mt-2">Please log in using the button in the top-right.</p>
      </div>
    `;
    if (createBtn) createBtn.style.display = "none";
  } else {
    if (createBtn) createBtn.style.display = "inline-block";
  }
}

function formatDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString();
}

// -----------------------------
// LOAD POSTS
// -----------------------------
async function loadPosts() {
  const feed = document.getElementById("posts-feed");
  if (!feed) return;
  feed.innerHTML = "";

  const res = await fetch("/api/posts");
  const posts = await res.json();

  posts.forEach((p) => {
    const card = document.createElement("article");
    card.className =
      "bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col";

    // Image
    let imageHTML = "";
    if (p.image_url) {
      imageHTML = `
        <div class="w-full h-56 overflow-hidden rounded-t-2xl">
          <img src="${p.image_url}" class="w-full h-full object-cover" />
        </div>
      `;
    }

    // Edit / delete controls (only owner)
    let ownerControls = "";
    if (currentUser && currentUser.username === p.username) {
      ownerControls = `
        <div class="mt-4 flex gap-2">
          <button 
            class="edit-post px-3 py-1 rounded-lg bg-amber-400 text-white text-sm font-medium"
            data-id="${p.post_id}"
          >
            Edit
          </button>
          <button 
            class="delete-post px-3 py-1 rounded-lg bg-red-600 text-white text-sm font-medium"
            data-id="${p.post_id}"
          >
            Delete
          </button>
        </div>
      `;
    }

    const likeCount = p.likes || 0;
    const commentCount = p.comment_count || 0;

    card.innerHTML = `
      ${imageHTML}

      <div class="p-5 flex flex-col flex-1">
        <h3 class="font-semibold text-lg mb-1">${p.title}</h3>
        <p class="text-slate-600 text-sm mb-3 whitespace-pre-line">${p.content}</p>

        <p class="text-xs text-slate-400 mb-3">
          Posted by <span class="font-medium">${p.username}</span> • ${formatDate(
      p.created_at
    )}
        </p>

        <div class="mt-auto flex items-center justify-between border-t border-slate-200 pt-3">
          <button 
            class="like-post flex items-center gap-1 text-sm text-rose-600 hover:opacity-80"
            data-id="${p.post_id}"
          >
            <span>❤️</span>
            <span class="like-count">${likeCount}</span>
          </button>

          <button 
            class="toggle-comments flex items-center gap-1 text-sm text-slate-600 hover:underline"
            data-id="${p.post_id}"
          >
            <span>💬</span>
            <span class="comment-count">${commentCount}</span>
            <span>Comments</span>
          </button>
        </div>

        <div 
          id="comments-${p.post_id}" 
          class="hidden mt-3 pl-3 border-l border-slate-200 space-y-3"
        >
          <p class="text-slate-500 text-sm italic">Loading comments...</p>
        </div>

        ${ownerControls}
      </div>
    `;

    feed.appendChild(card);
  });

  attachPostEventListeners();
  attachCommentToggles();
  attachLikeHandlers();
}

// -----------------------------
// LIKE HANDLERS
// -----------------------------
function attachLikeHandlers() {
  document.querySelectorAll(".like-post").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      try {
        await fetch(`/api/posts/${id}/like`, { method: "POST" });
        // Simple option: reload posts to get updated like counts
        loadPosts();
      } catch (e) {
        console.error("Like error", e);
      }
    };
  });
}

// -----------------------------
// COMMENT TOGGLING
// -----------------------------
function attachCommentToggles() {
  document.querySelectorAll(".toggle-comments").forEach((btn) => {
    btn.onclick = async () => {
      const postId = btn.dataset.id;
      const box = document.getElementById(`comments-${postId}`);
      if (!box) return;

      if (box.classList.contains("hidden")) {
        box.classList.remove("hidden");
        loadComments(postId);
      } else {
        box.classList.add("hidden");
      }
    };
  });
}

// -----------------------------
// LOAD COMMENTS FOR A POST
// -----------------------------
async function loadComments(postId) {
  const container = document.getElementById(`comments-${postId}`);
  if (!container) return;

  try {
    const res = await fetch(`/api/comments/${postId}`);
    const comments = await res.json();

    container.innerHTML = `
      <div class="space-y-3">
        ${comments
          .map(
            (c) => `
          <div class="bg-slate-100 p-2 rounded flex justify-between items-start">
            <div>
              <p class="text-sm">
                <span class="font-semibold">${c.username}</span>
                <span> ${c.content}</span>
              </p>
              <p class="text-xs text-slate-500">${new Date(
                c.created_at
              ).toLocaleString()}</p>
            </div>
            ${
              currentUser && currentUser.username === c.username
                ? `<button 
                    class="delete-comment text-red-600 text-xs"
                    data-id="${c.comment_id}"
                    data-post="${postId}"
                  >
                    Delete
                  </button>`
                : ""
            }
          </div>
        `
          )
          .join("")}
      </div>

      <div class="mt-3 flex gap-2">
        <input 
          id="new-comment-${postId}" 
          class="flex-1 border rounded px-2 py-1 text-sm"
          placeholder="Add a comment..."
        >
        <button 
          class="add-comment bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium"
          data-id="${postId}"
        >
          Post
        </button>
      </div>
    `;

    attachAddCommentHandlers();
    attachDeleteCommentHandlers();
  } catch (e) {
    console.error("loadComments error", e);
    container.innerHTML =
      '<p class="text-sm text-red-600">Error loading comments.</p>';
  }
}

function updateCommentCount(postId, delta) {
  const btn = document.querySelector(`.toggle-comments[data-id="${postId}"]`);
  if (!btn) return;
  const span = btn.querySelector(".comment-count");
  if (!span) return;
  let num = parseInt(span.textContent, 10) || 0;
  num = Math.max(0, num + delta);
  span.textContent = num;
}

// -----------------------------
// ADD COMMENT
// -----------------------------
function attachAddCommentHandlers() {
  document.querySelectorAll(".add-comment").forEach((btn) => {
    btn.onclick = async () => {
      const postId = btn.dataset.id;
      const input = document.getElementById(`new-comment-${postId}`);
      if (!input) return;

      const content = input.value.trim();
      if (!content) return;

      try {
        await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ post_id: postId, content }),
        });

        input.value = "";
        updateCommentCount(postId, 1);
        loadComments(postId);
      } catch (e) {
        console.error("add comment error", e);
      }
    };
  });
}

// -----------------------------
// DELETE COMMENT
// -----------------------------
function attachDeleteCommentHandlers() {
  document.querySelectorAll(".delete-comment").forEach((btn) => {
    btn.onclick = async () => {
      const commentId = btn.dataset.id;
      const postId = btn.dataset.post;

      try {
        await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
        updateCommentCount(postId, -1);
        loadComments(postId);
      } catch (e) {
        console.error("delete comment error", e);
      }
    };
  });
}

// -----------------------------
// EDIT + DELETE POST LISTENERS
// -----------------------------
function attachPostEventListeners() {
  // Delete with confirmation
  document.querySelectorAll(".delete-post").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const sure = window.confirm("Are you sure you want to delete this post?");
      if (!sure) return;

      try {
        await fetch(`/api/posts/${id}`, { method: "DELETE" });
        loadPosts();
      } catch (e) {
        console.error("delete post error", e);
      }
    };
  });

  // Edit
  document.querySelectorAll(".edit-post").forEach((btn) => {
    btn.onclick = async () => {
      try {
        const post = await fetch(`/api/posts/${btn.dataset.id}`).then((r) =>
          r.json()
        );
        openEditPostModal(post);
      } catch (e) {
        console.error("load single post error", e);
      }
    };
  });
}

// -----------------------------
// POST MODALS (with image upload)
// -----------------------------
function initCreatePostModal() {
  const button = document.getElementById("open-create-post");
  if (!button) return;
  button.addEventListener("click", () => openCreatePostModal());
}

function openCreatePostModal() {
  showPostModal({
    mode: "create",
    title: "",
    content: "",
    onSubmit: async ({ title, content, imageFile }) => {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      if (imageFile) formData.append("image", imageFile);

      await fetch("/api/posts", {
        method: "POST",
        body: formData,
      });

      closePostModal();
      loadPosts();
    },
  });
}

function openEditPostModal(post) {
  showPostModal({
    mode: "edit",
    title: post.title,
    content: post.content,
    onSubmit: async ({ title, content, imageFile }) => {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      if (imageFile) formData.append("image", imageFile);

      await fetch(`/api/posts/${post.post_id}`, {
        method: "PUT",
        body: formData,
      });

      closePostModal();
      loadPosts();
    },
  });
}

function showPostModal({ mode, title, content, onSubmit }) {
  const modal = document.createElement("div");
  modal.id = "post-modal";
  modal.className =
    "fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50";

  modal.innerHTML = `
    <div class="bg-white rounded-2xl p-6 w-full max-w-md">
      <h2 class="text-xl font-semibold mb-4">
        ${mode === "create" ? "Create New Post" : "Edit Post"}
      </h2>

      <label class="block text-sm font-medium mb-1">Title</label>
      <input 
        id="post-title" 
        value="${title}" 
        placeholder="Title"
        class="w-full border px-3 py-2 rounded mb-3 text-sm"
      >

      <label class="block text-sm font-medium mb-1">Content</label>
      <textarea 
        id="post-content" 
        placeholder="Write something..."
        class="w-full border px-3 py-2 rounded mb-3 h-32 text-sm"
      >${content}</textarea>

      <label class="block text-sm font-medium mb-1">Image (optional)</label>
      <input 
        id="post-image"
        type="file"
        accept="image/*"
        class="w-full text-sm mb-4"
      >

      <div class="flex justify-end gap-2">
        <button 
          id="close-post-modal" 
          class="px-4 py-2 bg-slate-300 rounded text-sm"
        >
          Cancel
        </button>
        <button 
          id="submit-post" 
          class="px-4 py-2 bg-blue-600 text-white rounded text-sm font-semibold"
        >
          Save
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("close-post-modal").onclick = closePostModal;
  document.getElementById("submit-post").onclick = () => {
    const t = document.getElementById("post-title").value.trim();
    const c = document.getElementById("post-content").value.trim();
    const fileInput = document.getElementById("post-image");
    const imageFile = fileInput && fileInput.files.length > 0 ? fileInput.files[0] : null;

    onSubmit({ title: t, content: c, imageFile });
  };
}

function closePostModal() {
  const modal = document.getElementById("post-modal");
  if (modal) modal.remove();
}
