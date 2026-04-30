// ---------- STATE ----------
const State = {
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  view: 'dashboard',
  currentProject: null,
};

// ---------- API ----------
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (State.token) headers.Authorization = `Bearer ${State.token}`;
  const res = await fetch(path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ---------- HELPERS ----------
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');
const statusLabel = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
const statusColor = {
  todo: 'bg-slate-200 text-slate-700',
  in_progress: 'bg-amber-200 text-amber-800',
  done: 'bg-green-200 text-green-800',
};

function setAuth(token, user) {
  State.token = token;
  State.user = user;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  State.token = null;
  State.user = null;
  render();
}

// ---------- AUTH UI ----------
function showAuthError(msg) {
  $('#auth-error').textContent = msg || '';
}

function bindAuthScreen() {
  const tabLogin = $('#tab-login');
  const tabSignup = $('#tab-signup');
  const loginForm = $('#login-form');
  const signupForm = $('#signup-form');

  function showTab(which) {
    showAuthError('');
    if (which === 'login') {
      tabLogin.classList.add('border-blue-600', 'text-blue-600');
      tabLogin.classList.remove('border-transparent', 'text-slate-500');
      tabSignup.classList.remove('border-blue-600', 'text-blue-600');
      tabSignup.classList.add('border-transparent', 'text-slate-500');
      loginForm.classList.remove('hidden');
      signupForm.classList.add('hidden');
    } else {
      tabSignup.classList.add('border-blue-600', 'text-blue-600');
      tabSignup.classList.remove('border-transparent', 'text-slate-500');
      tabLogin.classList.remove('border-blue-600', 'text-blue-600');
      tabLogin.classList.add('border-transparent', 'text-slate-500');
      signupForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
    }
  }
  tabLogin.onclick = () => showTab('login');
  tabSignup.onclick = () => showTab('signup');

  loginForm.onsubmit = async (e) => {
    e.preventDefault();
    showAuthError('');
    const fd = new FormData(loginForm);
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }),
      });
      setAuth(data.token, data.user);
      render();
    } catch (err) {
      showAuthError(err.message);
    }
  };

  signupForm.onsubmit = async (e) => {
    e.preventDefault();
    showAuthError('');
    const fd = new FormData(signupForm);
    try {
      const data = await api('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          name: fd.get('name'),
          email: fd.get('email'),
          password: fd.get('password'),
        }),
      });
      setAuth(data.token, data.user);
      render();
    } catch (err) {
      showAuthError(err.message);
    }
  };
}

// ---------- VIEWS ----------
function taskListItem(t, today_) {
  const overdue = t.status !== 'done' && t.due_date && t.due_date < today_;
  return `
    <div class="py-3 flex flex-wrap items-center justify-between gap-2">
      <div class="min-w-0">
        <div class="font-medium">${escapeHtml(t.title)}</div>
        <div class="text-xs text-slate-500">
          ${escapeHtml(t.project_name)} · Assignee: ${t.assignee_name ? escapeHtml(t.assignee_name) : 'Unassigned'} · Due: ${fmtDate(t.due_date)}
          ${overdue ? '<span class="ml-1 text-red-600 font-semibold">OVERDUE</span>' : ''}
        </div>
      </div>
      <span class="badge px-2 py-0.5 rounded text-xs font-semibold ${statusColor[t.status]}">${statusLabel[t.status]}</span>
    </div>`;
}

async function viewDashboard() {
  const main = $('#main-content');
  main.innerHTML = '<p class="text-slate-500">Loading…</p>';
  try {
    const { counts, projectsCount, myTasks, allTasks } = await api('/api/dashboard');
    const today_ = today();
    main.innerHTML = `
      <h2 class="text-2xl font-bold mb-1">Dashboard</h2>
      <p class="text-sm text-slate-500 mb-4">Overview across all projects you are part of.</p>

      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        ${statCard('Projects', projectsCount, 'bg-blue-100 text-blue-700')}
        ${statCard('Total Tasks', counts.total, 'bg-slate-100 text-slate-700')}
        ${statCard('To Do', counts.todo, 'bg-slate-200 text-slate-800')}
        ${statCard('In Progress', counts.in_progress, 'bg-amber-100 text-amber-800')}
        ${statCard('Done', counts.done, 'bg-green-100 text-green-700')}
        ${statCard('Overdue', counts.overdue, 'bg-red-100 text-red-700')}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="bg-white rounded-xl shadow p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold">Assigned to me</h3>
            <span class="text-xs text-slate-500">${counts.my_total} task${counts.my_total === 1 ? '' : 's'}${counts.my_overdue ? ` · <span class="text-red-600 font-semibold">${counts.my_overdue} overdue</span>` : ''}</span>
          </div>
          ${myTasks.length === 0
            ? '<p class="text-slate-500 text-sm">No tasks assigned to you yet.</p>'
            : `<div class="divide-y">${myTasks.map((t) => taskListItem(t, today_)).join('')}</div>`}
        </div>

        <div class="bg-white rounded-xl shadow p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold">All recent tasks</h3>
            <span class="text-xs text-slate-500">across your projects</span>
          </div>
          ${allTasks.length === 0
            ? '<p class="text-slate-500 text-sm">No tasks yet. Create a project and add tasks to see them here.</p>'
            : `<div class="divide-y">${allTasks.slice(0, 15).map((t) => taskListItem(t, today_)).join('')}</div>`}
        </div>
      </div>
    `;
  } catch (err) {
    main.innerHTML = `<p class="text-red-600">${escapeHtml(err.message)}</p>`;
  }
}

function statCard(label, value, color) {
  return `<div class="rounded-xl p-4 shadow ${color}">
    <div class="text-xs uppercase tracking-wide opacity-80">${label}</div>
    <div class="text-3xl font-bold">${value}</div>
  </div>`;
}

async function viewProjects() {
  const main = $('#main-content');
  main.innerHTML = '<p class="text-slate-500">Loading…</p>';
  try {
    const { projects } = await api('/api/projects');
    main.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-bold">Projects</h2>
        <button id="new-project-btn" class="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700">+ New Project</button>
      </div>
      ${projects.length === 0
        ? '<div class="bg-white rounded-xl shadow p-8 text-center text-slate-500">No projects yet. Create one to get started.</div>'
        : `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${projects
            .map(
              (p) => `
          <div class="bg-white rounded-xl shadow p-5 hover:shadow-md cursor-pointer project-card" data-id="${p.id}">
            <div class="flex justify-between items-start mb-2">
              <h3 class="font-bold text-lg">${escapeHtml(p.name)}</h3>
              <span class="text-xs px-2 py-0.5 rounded ${p.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}">${p.role}</span>
            </div>
            <p class="text-sm text-slate-600 line-clamp-2">${escapeHtml(p.description || 'No description')}</p>
          </div>`
            )
            .join('')}</div>`}
    `;
    $('#new-project-btn').onclick = openNewProjectModal;
    $$('.project-card').forEach((el) => {
      el.onclick = () => openProject(Number(el.dataset.id));
    });
  } catch (err) {
    main.innerHTML = `<p class="text-red-600">${escapeHtml(err.message)}</p>`;
  }
}

async function openProject(projectId) {
  State.currentProject = projectId;
  State.view = 'project';
  const main = $('#main-content');
  main.innerHTML = '<p class="text-slate-500">Loading…</p>';
  try {
    const [{ project, members }, { tasks }] = await Promise.all([
      api(`/api/projects/${projectId}`),
      api(`/api/projects/${projectId}/tasks`),
    ]);
    const isAdmin = project.role === 'admin';
    const today_ = today();

    main.innerHTML = `
      <div class="mb-4">
        <button id="back-btn" class="text-sm text-blue-600 hover:underline">← Back to Projects</button>
      </div>
      <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 class="text-2xl font-bold">${escapeHtml(project.name)}</h2>
          <p class="text-slate-600 text-sm">${escapeHtml(project.description || '')}</p>
        </div>
        <div class="flex gap-2">
          ${isAdmin ? '<button id="add-member-btn" class="bg-slate-700 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800">+ Member</button>' : ''}
          ${isAdmin ? '<button id="new-task-btn" class="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">+ Task</button>' : ''}
          ${isAdmin ? '<button id="delete-project-btn" class="bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-red-700">Delete</button>' : ''}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2 bg-white rounded-xl shadow p-4">
          <h3 class="font-semibold mb-3">Tasks (${tasks.length})</h3>
          ${tasks.length === 0
            ? '<p class="text-slate-500 text-sm">No tasks yet.</p>'
            : `<div class="space-y-2">${tasks.map((t) => taskRow(t, project, today_)).join('')}</div>`}
        </div>
        <div class="bg-white rounded-xl shadow p-4">
          <h3 class="font-semibold mb-3">Team (${members.length})</h3>
          <div class="divide-y">
            ${members
              .map(
                (m) => `
              <div class="py-2 flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <div class="font-medium truncate">${escapeHtml(m.name)} ${m.id === project.owner_id ? '<span class="text-xs text-slate-500">(owner)</span>' : ''}</div>
                  <div class="text-xs text-slate-500 truncate">${escapeHtml(m.email)}</div>
                </div>
                <div class="flex items-center gap-1">
                  <span class="text-xs px-2 py-0.5 rounded ${m.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}">${m.role}</span>
                  ${isAdmin && m.id !== project.owner_id
                    ? `<button data-uid="${m.id}" data-role="${m.role}" class="role-toggle text-xs text-blue-600 hover:underline">↻</button>
                       <button data-uid="${m.id}" class="remove-member text-xs text-red-600 hover:underline">×</button>`
                    : ''}
                </div>
              </div>`
              )
              .join('')}
          </div>
        </div>
      </div>
    `;

    $('#back-btn').onclick = () => {
      State.view = 'projects';
      State.currentProject = null;
      render();
    };
    if (isAdmin) {
      $('#new-task-btn').onclick = () => openTaskModal(project, members);
      $('#add-member-btn').onclick = () => openAddMemberModal(project);
      $('#delete-project-btn').onclick = async () => {
        if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
        try {
          await api(`/api/projects/${project.id}`, { method: 'DELETE' });
          State.view = 'projects';
          State.currentProject = null;
          render();
        } catch (err) {
          alert(err.message);
        }
      };
      $$('.role-toggle').forEach((b) => {
        b.onclick = async () => {
          const newRole = b.dataset.role === 'admin' ? 'member' : 'admin';
          try {
            await api(`/api/projects/${project.id}/members/${b.dataset.uid}`, {
              method: 'PUT',
              body: JSON.stringify({ role: newRole }),
            });
            openProject(project.id);
          } catch (err) {
            alert(err.message);
          }
        };
      });
      $$('.remove-member').forEach((b) => {
        b.onclick = async () => {
          if (!confirm('Remove this member?')) return;
          try {
            await api(`/api/projects/${project.id}/members/${b.dataset.uid}`, { method: 'DELETE' });
            openProject(project.id);
          } catch (err) {
            alert(err.message);
          }
        };
      });
    }

    $$('.task-status-select').forEach((sel) => {
      sel.onchange = async () => {
        try {
          await api(`/api/tasks/${sel.dataset.id}`, {
            method: 'PUT',
            body: JSON.stringify({ status: sel.value }),
          });
          openProject(project.id);
        } catch (err) {
          alert(err.message);
        }
      };
    });
    $$('.task-edit').forEach((b) => {
      b.onclick = () => {
        const t = tasks.find((x) => x.id === Number(b.dataset.id));
        openTaskModal(project, members, t);
      };
    });
    $$('.task-delete').forEach((b) => {
      b.onclick = async () => {
        if (!confirm('Delete this task?')) return;
        try {
          await api(`/api/tasks/${b.dataset.id}`, { method: 'DELETE' });
          openProject(project.id);
        } catch (err) {
          alert(err.message);
        }
      };
    });
  } catch (err) {
    main.innerHTML = `<p class="text-red-600">${escapeHtml(err.message)}</p>`;
  }
}

function taskRow(t, project, today_) {
  const isAdmin = project.role === 'admin';
  const canChangeStatus = isAdmin || t.assignee_id === State.user.id;
  const overdue = t.status !== 'done' && t.due_date && t.due_date < today_;
  const statusOptions = ['todo', 'in_progress', 'done']
    .map((s) => `<option value="${s}" ${t.status === s ? 'selected' : ''}>${statusLabel[s]}</option>`)
    .join('');
  return `
    <div class="border rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div class="font-medium">${escapeHtml(t.title)} ${overdue ? '<span class="ml-1 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">OVERDUE</span>' : ''}</div>
        ${t.description ? `<div class="text-sm text-slate-600">${escapeHtml(t.description)}</div>` : ''}
        <div class="text-xs text-slate-500 mt-1">
          Assignee: ${t.assignee_name ? escapeHtml(t.assignee_name) : 'Unassigned'} · Due: ${fmtDate(t.due_date)}
        </div>
      </div>
      <div class="flex items-center gap-2">
        ${canChangeStatus
          ? `<select data-id="${t.id}" class="task-status-select border rounded px-2 py-1 text-sm">${statusOptions}</select>`
          : `<span class="text-xs px-2 py-1 rounded ${statusColor[t.status]}">${statusLabel[t.status]}</span>`}
        ${isAdmin
          ? `<button data-id="${t.id}" class="task-edit text-sm text-blue-600 hover:underline">Edit</button>
             <button data-id="${t.id}" class="task-delete text-sm text-red-600 hover:underline">Delete</button>`
          : ''}
      </div>
    </div>
  `;
}

// ---------- MODALS ----------
function modal(html) {
  const root = $('#modal-root');
  root.innerHTML = `
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-6">${html}</div>
    </div>
  `;
  return {
    close: () => (root.innerHTML = ''),
    root,
  };
}

function openNewProjectModal() {
  const m = modal(`
    <h3 class="text-lg font-bold mb-3">New Project</h3>
    <form id="np-form" class="space-y-3">
      <input name="name" placeholder="Project name" required class="w-full border rounded-lg px-3 py-2" />
      <textarea name="description" placeholder="Description (optional)" rows="3" class="w-full border rounded-lg px-3 py-2"></textarea>
      <p id="np-error" class="text-sm text-red-600"></p>
      <div class="flex justify-end gap-2">
        <button type="button" id="np-cancel" class="px-4 py-2 rounded-lg border">Cancel</button>
        <button class="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold">Create</button>
      </div>
    </form>
  `);
  $('#np-cancel', m.root).onclick = m.close;
  $('#np-form', m.root).onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: fd.get('name'), description: fd.get('description') }),
      });
      m.close();
      viewProjects();
    } catch (err) {
      $('#np-error', m.root).textContent = err.message;
    }
  };
}

function openTaskModal(project, members, task) {
  const editing = !!task;
  const memberOpts = members
    .map(
      (mem) =>
        `<option value="${mem.id}" ${task && task.assignee_id === mem.id ? 'selected' : ''}>${escapeHtml(mem.name)} (${escapeHtml(mem.email)})</option>`
    )
    .join('');
  const m = modal(`
    <h3 class="text-lg font-bold mb-3">${editing ? 'Edit Task' : 'New Task'}</h3>
    <form id="t-form" class="space-y-3">
      <input name="title" placeholder="Title" required value="${escapeHtml(task?.title || '')}" class="w-full border rounded-lg px-3 py-2" />
      <textarea name="description" placeholder="Description" rows="3" class="w-full border rounded-lg px-3 py-2">${escapeHtml(task?.description || '')}</textarea>
      <label class="block text-sm">Assignee
        <select name="assignee_id" class="w-full border rounded-lg px-3 py-2 mt-1">
          <option value="">Unassigned</option>
          ${memberOpts}
        </select>
      </label>
      <label class="block text-sm">Due date
        <input name="due_date" type="date" value="${task?.due_date || ''}" class="w-full border rounded-lg px-3 py-2 mt-1" />
      </label>
      <label class="block text-sm">Status
        <select name="status" class="w-full border rounded-lg px-3 py-2 mt-1">
          <option value="todo" ${task?.status === 'todo' || !task ? 'selected' : ''}>To Do</option>
          <option value="in_progress" ${task?.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
          <option value="done" ${task?.status === 'done' ? 'selected' : ''}>Done</option>
        </select>
      </label>
      <p id="t-error" class="text-sm text-red-600"></p>
      <div class="flex justify-end gap-2">
        <button type="button" id="t-cancel" class="px-4 py-2 rounded-lg border">Cancel</button>
        <button class="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold">${editing ? 'Save' : 'Create'}</button>
      </div>
    </form>
  `);
  $('#t-cancel', m.root).onclick = m.close;
  $('#t-form', m.root).onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      title: fd.get('title'),
      description: fd.get('description'),
      assignee_id: fd.get('assignee_id') ? Number(fd.get('assignee_id')) : null,
      due_date: fd.get('due_date') || null,
      status: fd.get('status'),
    };
    try {
      if (editing) {
        await api(`/api/tasks/${task.id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await api(`/api/projects/${project.id}/tasks`, { method: 'POST', body: JSON.stringify(body) });
      }
      m.close();
      openProject(project.id);
    } catch (err) {
      $('#t-error', m.root).textContent = err.message;
    }
  };
}

function openAddMemberModal(project) {
  const m = modal(`
    <h3 class="text-lg font-bold mb-3">Add Team Member</h3>
    <form id="am-form" class="space-y-3">
      <input name="email" type="email" placeholder="User's email" required class="w-full border rounded-lg px-3 py-2" />
      <label class="block text-sm">Role
        <select name="role" class="w-full border rounded-lg px-3 py-2 mt-1">
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <p class="text-xs text-slate-500">User must already have an account.</p>
      <p id="am-error" class="text-sm text-red-600"></p>
      <div class="flex justify-end gap-2">
        <button type="button" id="am-cancel" class="px-4 py-2 rounded-lg border">Cancel</button>
        <button class="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold">Add</button>
      </div>
    </form>
  `);
  $('#am-cancel', m.root).onclick = m.close;
  $('#am-form', m.root).onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api(`/api/projects/${project.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: fd.get('email'), role: fd.get('role') }),
      });
      m.close();
      openProject(project.id);
    } catch (err) {
      $('#am-error', m.root).textContent = err.message;
    }
  };
}

// ---------- ROUTING ----------
function render() {
  if (!State.token || !State.user) {
    $('#auth-screen').classList.remove('hidden');
    $('#app-screen').classList.add('hidden');
    return;
  }
  $('#auth-screen').classList.add('hidden');
  $('#app-screen').classList.remove('hidden');
  $('#user-name').textContent = State.user.name;

  if (State.view === 'project' && State.currentProject) {
    openProject(State.currentProject);
  } else if (State.view === 'projects') {
    viewProjects();
  } else {
    State.view = 'dashboard';
    viewDashboard();
  }
}

function bindNav() {
  $$('.nav-btn').forEach((b) => {
    b.onclick = () => {
      State.view = b.dataset.view;
      State.currentProject = null;
      render();
    };
  });
  $('#logout-btn').onclick = logout;
}

// ---------- INIT ----------
bindAuthScreen();
bindNav();
render();
