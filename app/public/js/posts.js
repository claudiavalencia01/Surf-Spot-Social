// posts.js

let currentUser = null;

// -----------------------------------------------------------
// LOAD CURRENT USER
// -----------------------------------------------------------
async function loadUser() {
  try {
    const res = await fetch("/me");
    const data = await res.json();
    currentUser = data.user || null;
  } catch {
    currentUser = null;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadUser();
  setupAuthGate();

  if (currentUser) {
    await loadSpots();
    initCreatePostModal();
    loadPosts();
  }
});

// -----------------------------------------------------------
// AUTH GATE
// -----------------------------------------------------------
function setupAuthGate() {
  const feed = document.getElementById("posts-feed");
  const createBtn = document.getElementById("open-create-post");

  if (!currentUser) {
    feed.innerHTML = `
      <div class="text-center text-slate-600 p-6">
        <p class="text-lg font-semibold">You must be logged in to view or create posts.</p>
      </div>`;
    createBtn.style.display = "none";
  } else {
    createBtn.style.display = "inline-block";
  }
}

// -----------------------------------------------------------
// LOAD SURF SPOTS (for dropdown)
// -----------------------------------------------------------
let allSpots = [];

async function loadSpots() {
  const res = await fetch("/api/spots");
  allSpots = await res.json();
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

    const spotName = p.spot_id
      ? allSpots.find(s => s.id === p.spot_id)?.name || "Unknown Spot"
      : "General";

    const myPost = currentUser && currentUser.username === p.username;

    card.innerHTML = `
      ${p.image_url ? `<img src="${p.image_url}" class="w-full h-48 object-cover rounded mb-3">` : ""}

      <h3 class="font-semibold text-lg">${p.title}</h3>

      <p class="text-slate-600 my-2">${p.content}</p>

      <p class="text-xs text-slate-500 mb-2">
        <b>${spotName}</b> • Posted by <b>${p.username}</b> •
        ${new Date(p.created_at).toLocaleDateString()}
      </p>

      <div class="flex items-center gap-4 mt-2">
        <button class="like-btn text-blue-600" data-id="${p.post_id}">
          ❤️ ${p.likes}
        </button>

        <button class="comment-btn text-slate-600" data-id="${p.post_id}">
          💬 Comments
        </button>

        ${myPost ? `
          <button class="edit-post px-2 py-1 bg-yellow-500 text-white rounded" data-id="${p.post_id}">
            Edit
          </button>
          <button class="delete-post px-2 py-1 bg-red-600 text-white rounded" data-id="${p.post_id}">
            Delete
          </button>
        ` : ""}
      </div>
    `;

    feed.appendChild(card);
  });

  attachPostEventListeners();
}

// -----------------------------------------------------------
// EVENT LISTENERS
// -----------------------------------------------------------
function attachPostEventListeners() {
  // Delete
  document.querySelectorAll(".delete-post").forEach((btn) => {
    btn.onclick = async () => {
      await fetch(`/api/posts/${btn.dataset.id}`, { method: "DELETE" });
      loadPosts();
    };
  });

  // Edit
  document.querySelectorAll(".edit-post").forEach((btn) => {
    btn.onclick = async () => {
      const post = await fetch(`/api/posts/${btn.dataset.id}`).then((r) => r.json());
      openEditPostModal(post);
    };
  });

  // Like
  document.querySelectorAll(".like-btn").forEach((btn) => {
    btn.onclick = async () => {
      await fetch(`/api/posts/${btn.dataset.id}/like`, { method: "POST" });
      loadPosts();
    };
  });

  // Comments (later hookup)
  document.querySelectorAll(".comment-btn").forEach((btn) => {
    btn.onclick = () => alert("Comments UI coming next.");
  });
}

// -----------------------------------------------------------
// MODALS
// -----------------------------------------------------------
function initCreatePostModal() {
  document.getElementById("open-create-post").onclick = () => openPostModal();
}

function openCreatePostModal() {
  openPostModal();
}

function openEditPostModal(post) {
  openPostModal(post);
}

function openPostModal(post = null) {
  const mode = post ? "edit" : "create";

  const modal = document.createElement("div");
  modal.id = "post-modal";
  modal.className = "fixed inset-0 bg-black/40 flex items-center justify-center p-4";

  const titleVal = post?.title || "";
  const contentVal = post?.content || "";
  const spotVal = post?.spot_id || "";

  modal.innerHTML = `
    <div class="bg-white rounded-xl p-6 w-full max-w-md">
      <h2 class="text-xl font-semibold mb-4">
        ${mode === "create" ? "Create Post" : "Edit Post"}
      </h2>

      <input id="post-title" value="${titleVal}" placeholder="Title"
             class="w-full border px-3 py-2 rounded mb-3">

      <textarea id="post-content" placeholder="Write something..."
        class="w-full border px-3 py-2 rounded mb-3 h-32">${contentVal}</textarea>

      <select id="post-spot" class="w-full border px-3 py-2 rounded mb-3">
        <option value="">General / No Spot</option>
        ${allSpots
          .map(s => `<option value="${s.id}" ${s.id === spotVal ? "selected" : ""}>${s.name}</option>`)
          .join("")}
      </select>

      <label class="block mb-3">
        <span class="text-sm text-slate-600">Image (optional)</span>
        <input type="file" id="post-image" class="mt-1">
      </label>

      <div class="flex justify-end gap-2">
        <button id="close-post-modal" class="px-4 py-2 bg-slate-300 rounded">Cancel</button>
        <button id="submit-post" class="px-4 py-2 bg-blue-600 text-white rounded">
          ${mode === "create" ? "Create" : "Save"}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("close-post-modal").onclick = closePostModal;

  document.getElementById("submit-post").onclick = async () => {
    const title = document.getElementById("post-title").value.trim();
    const content = document.getElementById("post-content").value.trim();
    const spot_id = document.getElementById("post-spot").value;
    const imageFile = document.getElementById("post-image").files[0];

    const form = new FormData();
    form.append("title", title);
    form.append("content", content);
    form.append("spot_id", spot_id);

    if (imageFile) form.append("image", imageFile);

    if (mode === "create") {
      await fetch("/api/posts", { method: "POST", body: form });
    } else {
      await fetch(`/api/posts/${post.post_id}`, {
        method: "PUT",
        body: form,
      });
    }

    closePostModal();
    loadPosts();
  };
}

function closePostModal() {
  const modal = document.getElementById("post-modal");
  if (modal) modal.remove();
}
