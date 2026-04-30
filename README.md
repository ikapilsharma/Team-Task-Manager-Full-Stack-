# Team Task Manager

A simple full-stack team task manager with authentication, projects, role-based access (Admin/Member), tasks, and a dashboard.

## Stack

- **Backend:** Node.js + Express
- **Database:** SQLite (better-sqlite3)
- **Auth:** JWT + bcrypt
- **Frontend:** Vanilla JS + Tailwind (CDN), single-page

## Features

- Signup / Login (JWT)
- Create projects (creator becomes Admin)
- Add/remove team members by email, change roles
- Create / assign / update / delete tasks (Admin)
- Members can update status of tasks assigned to them
- Dashboard: counts, my tasks, overdue indicator
- Role-based access enforced server-side

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000

## 🚀 Live demo

**[https://team-task-manager-full-stack-production-fabd.up.railway.app/](https://team-task-manager-full-stack-production-fabd.up.railway.app/)**

Sign up with any valid email and password (≥ 6 chars) to try it out.

## Environment variables

| Var          | Default              | Notes                           |
|--------------|----------------------|---------------------------------|
| `PORT`       | `3000`               | Set automatically on Railway    |
| `JWT_SECRET` | `dev-secret-change-me` | **Set this in production**    |
| `DB_PATH`    | `./data/app.db`      | Use `/data/app.db` on Railway   |

## Deploy to Railway (3 steps)

1. **Push the code to GitHub** (any new repo).
2. On [railway.app](https://railway.app):
   - **New Project → Deploy from GitHub repo** → pick this repo.
   - Open the service → **Variables** tab → add:
     - `JWT_SECRET` = a long random string
     - `DB_PATH` = `/data/app.db`
   - **Settings → Volumes → New Volume** → mount path `/data` (so the SQLite file survives restarts).
3. Click **Generate Domain** under Settings → Networking. Done.

Railway auto-detects Node, runs `npm install`, then `npm start`.

## API summary

```
POST   /api/auth/signup          { name, email, password }
POST   /api/auth/login           { email, password }
GET    /api/auth/me

GET    /api/projects
POST   /api/projects             { name, description }
GET    /api/projects/:id
DELETE /api/projects/:id                        (admin)
POST   /api/projects/:id/members { email, role } (admin)
PUT    /api/projects/:id/members/:userId { role } (admin)
DELETE /api/projects/:id/members/:userId         (admin)

GET    /api/projects/:id/tasks
POST   /api/projects/:id/tasks   { title, description, assignee_id, due_date, status } (admin)
PUT    /api/tasks/:taskId        admin: any field; member: status only on own tasks
DELETE /api/tasks/:taskId                       (admin)

GET    /api/dashboard
```

All endpoints (except signup/login) require `Authorization: Bearer <token>`.

## Roles

- **Admin** (project owner is admin by default) — manages members, creates/edits/deletes tasks, deletes the project.
- **Member** — sees the project, can change status of tasks assigned to them.
