// posts.js

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

// -----------------------------------------------------------
// AUTH GATE — restore the “must log in to interact” feature
// -----------------------------------------------------------
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
    createBtn.style.display = "none";
  } else {
    createBtn.style.display = "inline-block";
  }
}

// -----------------------------------------------------------
// LOAD POSTS
// -----------------------------------------------------------
async function loadPosts() {
  const feed = document.getElementById("posts-feed");
  feed.innerHTML = "";

  const res = await fetch("/api/posts");
  const posts = await res.json();

  posts.forEach((p) => {
    const card = document.createElement("article");
    card.className =
      "bg-white rounded-xl border p-4 shadow-sm flex flex-col justify-between";

    let controls = "";
    if (currentUser && currentUser.username === p.username) {
      controls = `
        <div class="flex gap-2 mt-2">
          <button class="edit-post px-2 py-1 bg-yellow-500 text-white rounded" data-id="${p.post_id}">Edit</button>
          <button class="delete-post px-2 py-1 bg-red-600 text-white rounded" data-id="${p.post_id}">Delete</button>
        </div>
      `;
    }

    card.innerHTML = `
      <h3 class="font-semibold text-lg">${p.title}</h3>
      <p class="text-slate-600 my-2">${p.content}</p>
      <p class="text-xs text-slate-400">Posted by ${p.username} • ${new Date(
      p.created_at
    ).toLocaleDateString()}</p>
      ${controls}
    `;

    feed.appendChild(card);
  });

  attachPostEventListeners();
}

// -----------------------------------------------------------
// EVENT LISTENERS
// -----------------------------------------------------------
function attachPostEventListeners() {
  document.querySelectorAll(".delete-post").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      await fetch(`/api/posts/${id}`, { method: "DELETE" });
      loadPosts();
    });
  });

  document.querySelectorAll(".edit-post").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const post = await fetch(`/api/posts/${id}`).then((r) => r.json());
      openEditPostModal(post);
    });
  });
}

// -----------------------------------------------------------
// MODALS
// -----------------------------------------------------------
function initCreatePostModal() {
  const button = document.getElementById("open-create-post");
  button.addEventListener("click", () => openCreatePostModal());
}

function openCreatePostModal() {
  showPostModal({
    mode: "create",
    title: "",
    content: "",
    onSubmit: async (title, content) => {
      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
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
    onSubmit: async (title, content) => {
      await fetch(`/api/posts/${post.post_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
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
    "fixed inset-0 bg-black/40 flex items-center justify-center p-4";

  modal.innerHTML = `
    <div class="bg-white rounded-xl p-6 w-full max-w-md">
      <h2 class="text-xl font-semibold mb-4">${
        mode === "create" ? "Create Post" : "Edit Post"
      }</h2>

      <input id="post-title" value="${title}" placeholder="Title"
             class="w-full border px-3 py-2 rounded mb-3">

      <textarea id="post-content" placeholder="Write something..."
                class="w-full border px-3 py-2 rounded mb-3 h-32">${content}</textarea>

      <div class="flex justify-end gap-2">
        <button id="close-post-modal" class="px-4 py-2 bg-slate-300 rounded">Cancel</button>
        <button id="submit-post" class="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("close-post-modal").onclick = closePostModal;
  document.getElementById("submit-post").onclick = () => {
    const t = document.getElementById("post-title").value.trim();
    const c = document.getElementById("post-content").value.trim();
    onSubmit(t, c);
  };
}

function closePostModal() {
  const modal = document.getElementById("post-modal");
  if (modal) modal.remove();
}
