/**
 * EVERIUM TEST PLATFORM — MAIN APP CONTROLLER v2.0
 * • Course Test Management dashboard
 * • SkillTrack sync panel
 * • User management read-only (no add/delete)
 * • Per-course question banks
 * • Custom timer per course
 */

const App = {
  currentPage: null,

  async init() {
    Toast.init();
    Loading.init();
    Auth.init();

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => { if (e.target === overlay) Modal.close(overlay.id); });
    });
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => Modal.close(btn.dataset.closeModal));
    });

    Loading.hide();

    if (Auth.isLoggedIn) {
      this.redirectToDashboard();
    } else {
      this.showPage('login');
    }
  },

  showPage(pageId) {
    // Map pageId to body class
    const classMap = {
      'login':               'page-login',
      'student-dashboard':   'page-student-dash',
      'course-selection':    'page-course-select',
      'test':                'page-test',
      'completion':          'page-completion',
      'teacher-dashboard':   'page-teacher-dash',
      'admin-dashboard':     'page-admin-dash',
    };
    const bodyClass = classMap[pageId] || ('page-' + pageId);
    document.body.className = bodyClass;
    this.currentPage = pageId;
    window.scrollTo(0, 0);
  },

  redirectToDashboard() {
    const role = Auth.role;
    if      (role === 'admin')   { this.showPage('admin-dashboard');   AdminDash.init();   }
    else if (role === 'teacher') { this.showPage('teacher-dashboard'); TeacherDash.init(); }
    else if (role === 'student') { this.showPage('student-dashboard'); StudentDash.init(); }
    else this.showPage('login');
  },

  async logout() {
    if (!confirm('Are you sure you want to log out?')) return;
    Loading.show('Signing out…');
    await Auth.logout();
    ExamTimer.stop();
    Loading.hide();
    Toast.info('You have been signed out.');
    document.body.className = '';
    this.showPage('login');
    LoginPage.init();
  },
};

// ── LOGIN PAGE ──────────────────────────────────────────────
const LoginPage = {
  init() {
    const form = document.getElementById('login-form');
    if (!form) return;
    form.onsubmit = async (e) => {
      e.preventDefault();
      clearAlert('login-alert');
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      if (!username || !password) { showAlert('login-alert', 'Please enter both username and password.', 'error'); return; }

      const btn = document.getElementById('login-btn');
      btn.classList.add('loading');
      try {
        const result = await Auth.login(username, password);
        if (result.success) {
          Toast.success(`Welcome, ${result.user.name}!`);
          App.redirectToDashboard();
        } else {
          showAlert('login-alert', result.message || 'Login failed. Please check your credentials.', 'error');
        }
      } catch (err) {
        showAlert('login-alert', 'Connection error. Please check your internet and try again.', 'error');
      } finally {
        btn.classList.remove('loading');
      }
    };

    const toggle = document.getElementById('password-toggle');
    const pwInput = document.getElementById('login-password');
    if (toggle && pwInput) {
      toggle.addEventListener('click', () => {
        const isText = pwInput.type === 'text';
        pwInput.type = isText ? 'password' : 'text';
        toggle.innerHTML = isText
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
      });
    }
  },
};

// ── STUDENT DASHBOARD ───────────────────────────────────────
const StudentDash = {
  async init() {
    if (!Auth.requireRole('student')) return;
    document.querySelectorAll('.sidebar-user-name').forEach(el => el.textContent = Auth.name);
    document.querySelectorAll('.sidebar-user-role').forEach(el => el.textContent = 'Student');
    document.querySelectorAll('.sidebar-user-avatar').forEach(el => el.textContent = Auth.name[0].toUpperCase());
    initSidebar();

    // Check for active/completed attempt
    try {
      const courses = await API.getCourses();
      if (courses.success && courses.data.length > 0) {
        // Find the course assigned to this student
        const userCourseId = Auth.session?.courseId;
        const studentCourses = courses.data.filter(c => !userCourseId || c.id === userCourseId);
        const course = studentCourses[0] || courses.data[0];

        if (course) {
          const cfg = await API.getTestConfig(course.id);
          const duration = cfg.success ? (cfg.data.duration || 45) : 45;

          // Update dashboard info
          const infoGrid = document.getElementById('student-info-grid');
          if (infoGrid) {
            infoGrid.innerHTML = `
              <div class="info-item"><label>Course</label><span>${course.name}</span></div>
              <div class="info-item"><label>Duration</label><span>${duration} Minutes</span></div>
              <div class="info-item"><label>Questions</label><span>${course.totalQuestions || 'Varies'}</span></div>
              <div class="info-item"><label>Attempts Allowed</label><span>1 (One)</span></div>
            `;
          }

          const attemptRes = await API.getAttempt(Auth.userId, course.id);
          const startBtn = document.getElementById('student-start-btn');
          const resumeBtn = document.getElementById('student-resume-btn');
          const completedNotice = document.getElementById('student-completed-notice');

          if (attemptRes.success && attemptRes.data) {
            const attempt = attemptRes.data;
            if (attempt.status === 'active') {
              if (resumeBtn) {
                resumeBtn.classList.remove('hidden');
                resumeBtn.onclick = () => ExamPage.resume(course, attempt);
              }
            } else if (attempt.status === 'completed') {
              if (completedNotice) completedNotice.classList.remove('hidden');
              if (startBtn) startBtn.classList.add('hidden');
              if (resumeBtn) resumeBtn.classList.add('hidden');
            }
          }

          if (startBtn) {
            startBtn.onclick = () => { App.showPage('course-selection'); CourseSelection.init(); };
          }
        }
      }
    } catch(e) { console.warn('Could not load attempt status:', e); }
  },
};

// ── TEACHER DASHBOARD ───────────────────────────────────────
const TeacherDash = {
  async init() {
    if (!Auth.requireRole('teacher', 'admin')) return;
    document.querySelectorAll('.sidebar-user-name').forEach(el => el.textContent = Auth.name);
    document.querySelectorAll('.sidebar-user-role').forEach(el => el.textContent = Auth.role === 'admin' ? 'Administrator' : 'Teacher');
    document.querySelectorAll('.sidebar-user-avatar').forEach(el => el.textContent = Auth.name[0].toUpperCase());
    initSidebar();
    await this.loadResults();
  },

  async loadResults() {
    Loading.show('Loading results…');
    try {
      const [resultsRes, analyticsRes] = await Promise.all([API.getResults(), API.getAnalytics()]);
      if (analyticsRes.success) {
        const a = analyticsRes.data;
        const avgLabel = a.averageScore + '/' + a.maxScore;
        ['t-stat-completed','ar-stat-completed'].forEach(id => this._setText(id, a.completedAttempts));
        ['t-stat-active','ar-stat-active'].forEach(id => this._setText(id, a.activeAttempts));
        ['t-stat-students','ar-stat-students'].forEach(id => this._setText(id, a.totalStudents));
        ['t-stat-avg','ar-stat-avg'].forEach(id => this._setText(id, avgLabel));
      }
      if (resultsRes.success) this.renderResultsTable(resultsRes.data);
    } catch(e) { Toast.error('Failed to load results.'); }
    finally { Loading.hide(); }
  },

  _setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  },

  renderResultsTable(results) {
    const rowsHTML = (() => {
      if (!results.length) {
        return `<tr><td colspan="7"><div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2z"/></svg><h3>No submissions yet</h3><p>Student results will appear here after they complete the test.</p></div></td></tr>`;
      }
      return results.map(r => `
        <tr>
          <td><strong>${r.studentName}</strong><br><small style="color:var(--text-muted)">${r.username}</small></td>
          <td>${r.courseName}</td>
          <td>${r.mcqScore ?? '—'}</td>
          <td>${r.tfScore ?? '—'}</td>
          <td><strong>${r.score ?? '—'}</strong></td>
          <td>${formatDate(r.endTime)}</td>
          <td><button class="btn btn-sm btn-ghost" onclick="TeacherDash.viewDetail('${r.attemptId}')">View Answers</button></td>
        </tr>`).join('');
    })();

    const teacherTbody = document.getElementById('results-tbody');
    const adminTbody   = document.getElementById('ar-results-tbody');
    if (teacherTbody) teacherTbody.innerHTML = rowsHTML;
    if (adminTbody)   adminTbody.innerHTML   = rowsHTML;
  },

  async viewDetail(attemptId) {
    const results = await API.getResults();
    if (!results.success) return;
    const result = results.data.find(r => r.attemptId === attemptId);
    if (!result) return;

    const questions = await API.getQuestions(result.courseId);
    if (!questions.success) return;

    const descQs = questions.data.filter(q => q.type === 'descriptive');
    document.getElementById('detail-student-name').textContent = result.studentName;

    const descBody = document.getElementById('descriptive-answers-body');
    if (!descQs.length) {
      descBody.innerHTML = '<p style="color:var(--text-muted)">No descriptive questions in this exam.</p>';
    } else {
      descBody.innerHTML = descQs.map(q => {
        const ans = result.answers?.find(a => a.questionId === q.id);
        return `<div style="margin-bottom:1.5rem;padding:1rem;background:var(--off-white);border-radius:var(--radius-md);border:1px solid var(--border)">
          <p style="font-weight:600;margin-bottom:0.5rem;color:var(--navy)">Q${q.order}. ${q.text}</p>
          <p style="color:var(--text-secondary);font-size:0.9rem;white-space:pre-wrap">${ans?.answer || '<em style="color:var(--text-muted)">No response provided.</em>'}</p>
        </div>`;
      }).join('');
    }
    Modal.open('detail-modal');
  },
};

// ── ADMIN DASHBOARD ──────────────────────────────────────────
const AdminDash = {
  currentView: 'overview',

  async init() {
    if (!Auth.requireRole('admin')) return;
    document.querySelectorAll('.sidebar-user-name').forEach(el => el.textContent = Auth.name);
    document.querySelectorAll('.sidebar-user-role').forEach(el => el.textContent = 'Administrator');
    document.querySelectorAll('.sidebar-user-avatar').forEach(el => el.textContent = Auth.name[0].toUpperCase());
    initSidebar();
    this.initNavigation();
    await this.loadOverview();
  },

  initNavigation() {
    document.querySelectorAll('[data-admin-view]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        this.switchView(link.dataset.adminView);
      });
    });
  },

  async switchView(view) {
    this.currentView = view;
    document.querySelectorAll('[data-admin-view]').forEach(l => l.classList.remove('active'));
    document.querySelectorAll(`[data-admin-view="${view}"]`).forEach(l => l.classList.add('active'));
    document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
    const section = document.getElementById(`admin-${view}`);
    if (section) section.classList.remove('hidden');

    const titles = { overview:'Dashboard Overview', users:'User Overview', 'course-mgmt':'Course Test Management', questions:'Question Bank', results:'Results & Reports', analytics:'Analytics', sync:'SkillTrack Sync' };
    document.getElementById('admin-topbar-title').textContent = titles[view] || 'Dashboard';

    switch(view) {
      case 'overview':    await this.loadOverview(); break;
      case 'users':       await this.loadUsers(); break;
      case 'course-mgmt': await CourseMgr.init(); break;
      case 'questions':   await QuestionMgr.init(); break;
      case 'results':     await TeacherDash.loadResults(); break;
      case 'analytics':   await this.loadAnalytics(); break;
      case 'sync':        await this.loadSyncPanel(); break;
    }
  },

  async loadOverview() {
    try {
      const [analyticsRes, usersRes] = await Promise.all([API.getAnalytics(), API.getUsers()]);
      if (analyticsRes.success) {
        const a = analyticsRes.data;
        this._setVal('a-stat-students',  a.totalStudents);
        this._setVal('a-stat-completed', a.completedAttempts);
        this._setVal('a-stat-active',    a.activeAttempts);
        this._setVal('a-stat-avg',       a.averageScore);
        document.querySelectorAll('[data-val]').forEach(el => animateCounter(el, parseInt(el.getAttribute('data-val'))||0));
      }
      if (usersRes.success) {
        const teachers = usersRes.data.filter(u => u.role === 'teacher').length;
        this._setVal('a-stat-teachers', teachers);
        document.querySelectorAll('[data-val]').forEach(el => animateCounter(el, parseInt(el.getAttribute('data-val'))||0));
      }
    } catch(e) { console.warn('Overview load error', e); }
  },

  _setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.setAttribute('data-val', val);
  },

  _userTab: 'student',
  _cachedUsers: [],

  switchUserTab(tab, btn) {
    this._userTab = tab;
    document.querySelectorAll('.user-tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this._renderUsersTable(this._cachedUsers);
  },

  async loadUsers() {
    Loading.show('Loading users…');
    try {
      const res = await API.getUsers();
      if (res.success) {
        this._cachedUsers = res.data;
        // Make sure default tab button is visually active on first load
        const defaultBtn = document.querySelector(`.user-tab-btn[data-user-tab="${this._userTab}"]`);
        if (defaultBtn) {
          document.querySelectorAll('.user-tab-btn').forEach(b => b.classList.remove('active'));
          defaultBtn.classList.add('active');
        }
        this._renderUsersTable(res.data);
      }
    } catch(e) { Toast.error('Failed to load users.'); }
    finally { Loading.hide(); }
  },

  _renderUsersTable(allUsers) {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;

    // Filter strictly by current tab role
    const role = this._userTab; // 'student' or 'teacher'
    const filtered = allUsers.filter(u => u.role === role);

    if (!filtered.length) {
      const label = role === 'student' ? 'students' : 'teachers';
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <h3>No ${label} found</h3>
        <p>Add ${label} in <strong>SkillTrack Pro</strong>, then use <strong>Sync Now</strong> in the SkillTrack Sync panel.</p>
        <button class="btn btn-gold btn-sm" style="margin-top:.75rem" onclick="AdminDash.switchView('sync')">Go to Sync Panel →</button>
      </div></td></tr>`;
      return;
    }

    const roleBadge = { admin:'badge-navy', teacher:'badge-info', student:'badge-gold' };
    tbody.innerHTML = filtered.map(u => {
      const avatarBg = u.role === 'student'
        ? 'background:linear-gradient(135deg,var(--royal),#3b6fd4);color:white'
        : 'background:linear-gradient(135deg,var(--gold-dark),var(--gold));color:var(--navy)';
      const safeName = (u.name || 'Unknown').replace(/'/g, "\\'");
      return `<tr>
        <td>
          <div style="display:flex;align-items:center;gap:.6rem">
            <div style="width:32px;height:32px;border-radius:50%;${avatarBg};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.8rem;flex-shrink:0">
              ${(u.name || u.username || '?')[0].toUpperCase()}
            </div>
            <div>
              <div style="font-weight:600">${u.name || '—'}</div>
              <div style="font-size:.72rem;color:var(--text-muted)">${u.email || '—'}</div>
            </div>
          </div>
        </td>
        <td><code style="font-size:.82rem;background:var(--off-white);padding:.2rem .5rem;border-radius:4px">${u.username || '—'}</code></td>
        <td><span class="badge ${roleBadge[u.role] || 'badge-navy'}">${u.role}</span></td>
        <td><span class="badge ${u.active ? 'badge-success' : 'badge-danger'}">${u.active ? 'Active' : 'Disabled'}</span></td>
        <td>
          <div style="display:flex;gap:.4rem;flex-wrap:wrap">
            <button class="btn btn-sm btn-${u.active ? 'warning' : 'success'}"
              onclick="AdminDash.toggleStatus('${u.id}', ${!u.active})">
              ${u.active ? 'Disable' : 'Enable'}
            </button>
            ${u.role === 'student'
              ? `<button class="btn btn-sm btn-ghost" onclick="AdminDash.resetAttemptPrompt('${u.id}','${safeName}')">Reset Attempt</button>`
              : ''}
          </div>
        </td>
      </tr>`;
    }).join('');
  },

  async toggleStatus(userId, makeActive) {
    if (!confirm(`${makeActive?'Enable':'Disable'} this user?`)) return;
    try {
      const result = await API.toggleUserStatus(userId, makeActive);
      if (result.success) { Toast.success(`User ${makeActive?'enabled':'disabled'}.`); await this.loadUsers(); }
      else Toast.error(result.message || 'Failed.');
    } catch(e) { Toast.error('Connection error.'); }
  },

  async resetAttemptPrompt(userId, name) {
    if (!confirm(`Reset all exam attempts for "${name}"? They will be able to retake the exam.`)) return;
    try {
      const coursesRes = await API.getCourses();
      if (!coursesRes.success || !coursesRes.data.length) { Toast.error('No courses found.'); return; }

      let resetCount = 0;
      for (const course of coursesRes.data) {
        const result = await API.resetAttempt(userId, course.id);
        if (result.success) resetCount++;
      }
      Toast.success(`Attempt reset. ${name} can now retake the exam.`);
    } catch(e) { Toast.error('Reset failed.'); }
  },

  async loadSyncPanel() {
    try {
      const statusRes = await API.getSyncStatus();
      const el = document.getElementById('sync-status-info');
      if (el && statusRes.success) {
        const d = statusRes.data;
        el.innerHTML = `
          <div class="info-row"><label>Last Sync</label><span>${d.lastSync ? new Date(d.lastSync).toLocaleString('en-IN') : 'Never'}</span></div>
          <div class="info-row"><label>Status</label><span>${d.lastMessage}</span></div>
          <div class="info-row"><label>Users in Everium</label><span>${d.usersTotal}</span></div>
          <div class="info-row"><label>Courses in Everium</label><span>${d.coursesTotal}</span></div>
        `;
      }
    } catch(e) { console.warn('Sync status error', e); }
  },

  async runSync() {
    const url = CONFIG.SKILLTRACK_API_URL;
    if (!url || url.includes('YOUR_SKILLTRACK')) {
      Toast.error('SKILLTRACK_API_URL not set. Open js/config.js, paste your SkillTrack Apps Script URL, re-upload the file.');
      return;
    }
    Loading.show('Syncing from SkillTrack Pro…');
    try {
      const res = await API.syncFromSkillTrack(url);
      Loading.hide();
      if (res.success) {
        const msg = `Sync complete! ${res.usersAdded || 0} users added, ${res.usersUpdated || 0} updated, ${res.coursesAdded || 0} courses added.`;
        Toast.success(msg);
        // Always reload users + courses + overview after sync so UI immediately reflects changes
        await Promise.all([this.loadSyncPanel(), this.loadUsers(), this.loadOverview()]);
        if (this.currentView === 'course-mgmt') await CourseMgr.init();
      } else {
        Toast.error('Sync error: ' + (res.message || 'Unknown. Ensure SKILLTRACK_API_URL is set in Everium Code.gs and redeployed.'));
      }
    } catch(e) {
      Loading.hide();
      Toast.error('Sync failed: ' + e.message + '. Check both Apps Script deployments are set to "Anyone" access.');
    }
  },

  async loadAnalytics() {
    try {
      const res = await API.getAnalytics();
      if (res.success) {
        const a = res.data;
        const total = a.totalStudents;
        const bars  = [
          { label:'Completed',   value:a.completedAttempts, max:total, color:'var(--emerald)' },
          { label:'In Progress', value:a.activeAttempts,    max:total, color:'var(--gold)' },
          { label:'Not Started', value:a.notStarted,        max:total, color:'var(--silver)' },
        ];
        const container = document.getElementById('analytics-bars');
        if (container) {
          container.innerHTML = bars.map(b => {
            const pct = total > 0 ? Math.round((b.value / total) * 100) : 0;
            return `<div style="margin-bottom:1.25rem">
              <div style="display:flex;justify-content:space-between;margin-bottom:.4rem">
                <span style="font-size:.875rem;font-weight:600;color:var(--text-primary)">${b.label}</span>
                <span style="font-size:.875rem;color:var(--text-muted)">${b.value} (${pct}%)</span>
              </div>
              <div class="progress-bar-track" style="height:10px">
                <div class="progress-bar-fill" style="width:0%;background:${b.color}" data-target="${pct}"></div>
              </div>
            </div>`;
          }).join('');
          setTimeout(() => {
            container.querySelectorAll('.progress-bar-fill[data-target]').forEach(bar => { bar.style.width = bar.dataset.target + '%'; });
          }, 100);
        }
      }
    } catch(e) { console.warn('Analytics error', e); }
  },
};

// ── COURSE TEST MANAGEMENT ───────────────────────────────────
const CourseMgr = {
  courses: [],
  selectedCourse: null,
  testConfig: null,

  async init() {
    Loading.show('Loading courses…');
    try {
      const res = await API.getCourses('admin');
      if (res.success) {
        this.courses = res.data;
        this.renderCourseList();
      }
    } catch(e) { Toast.error('Failed to load courses.'); }
    finally { Loading.hide(); }
  },

  renderCourseList() {
    const container = document.getElementById('course-mgmt-list');
    if (!container) return;

    if (!this.courses.length) {
      container.innerHTML = `<div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5"/></svg>
        <h3>No courses available</h3>
        <p>Courses are managed in SkillTrack Pro. Use the Sync panel to pull them here.</p>
      </div>`;
      return;
    }

    container.innerHTML = this.courses.map(c => `
      <div class="course-mgmt-item ${this.selectedCourse?.id === c.id ? 'selected' : ''}"
           onclick="CourseMgr.selectCourse('${c.id}')">
        <div class="course-mgmt-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
        </div>
        <div class="course-mgmt-info">
          <div class="course-mgmt-name">${c.name}</div>
          <div class="course-mgmt-meta">
            <span>⏱ ${c.duration} min</span>
            <span>📋 ${c.totalQuestions} questions</span>
            <span class="badge ${c.active ? 'badge-success' : 'badge-danger'}" style="font-size:.65rem">${c.active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </div>`).join('');
  },

  async selectCourse(courseId) {
    this.selectedCourse = this.courses.find(c => c.id === courseId);
    this.renderCourseList(); // re-render to show selected state

    const dashboard = document.getElementById('course-test-dashboard');
    if (dashboard) dashboard.classList.remove('hidden');

    // Load test config
    try {
      const cfgRes = await API.getTestConfig(courseId);
      this.testConfig = cfgRes.success ? cfgRes.data : {};
    } catch(e) { this.testConfig = {}; }

    this.renderTestDashboard();
  },

  renderTestDashboard() {
    const c   = this.selectedCourse;
    const cfg = this.testConfig || {};

    // Course name
    const nameEl = document.getElementById('ctd-course-name');
    if (nameEl) nameEl.textContent = c.name;

    // Test config fields
    const testName = document.getElementById('ctd-test-name');
    const duration = document.getElementById('ctd-duration');
    const active   = document.getElementById('ctd-active');
    const custom   = document.getElementById('ctd-custom-duration');

    if (testName) testName.value = cfg.testName || c.name + ' Assessment';
    if (active)   active.checked = cfg.active !== false;

    const dur = Number(cfg.duration || c.duration || 45);
    const presetVals = [15, 20, 30, 45, 60, 90, 120];
    if (duration) {
      duration.value = presetVals.includes(dur) ? String(dur) : 'custom';
    }
    if (custom) {
      custom.value = dur;
      custom.classList.toggle('hidden', presetVals.includes(dur));
    }

    // Reload question counts
    this.refreshQuestionCounts();
  },

  async refreshQuestionCounts() {
    if (!this.selectedCourse) return;
    try {
      const qRes = await API.getQuestions(this.selectedCourse.id);
      if (qRes.success) {
        const qs = qRes.data;
        const mcqCount  = qs.filter(q => q.type === 'mcq').length;
        const tfCount   = qs.filter(q => q.type === 'tf').length;
        const descCount = qs.filter(q => q.type === 'descriptive').length;
        const total     = qs.length;

        const el = document.getElementById('ctd-q-summary');
        if (el) {
          el.innerHTML = `
            <div class="q-count-card"><div class="q-count-val">${mcqCount}</div><div class="q-count-label">MCQ</div></div>
            <div class="q-count-card"><div class="q-count-val">${tfCount}</div><div class="q-count-label">True/False</div></div>
            <div class="q-count-card"><div class="q-count-val">${descCount}</div><div class="q-count-label">Descriptive</div></div>
            <div class="q-count-card gold"><div class="q-count-val">${total}</div><div class="q-count-label">Total</div></div>
          `;
        }
      }
    } catch(e) {}
  },

  handleDurationChange(val) {
    const custom = document.getElementById('ctd-custom-duration');
    if (custom) custom.classList.toggle('hidden', val !== 'custom');
  },

  async saveTestConfig() {
    if (!this.selectedCourse) return;
    const testName = document.getElementById('ctd-test-name')?.value.trim();
    const durSel   = document.getElementById('ctd-duration')?.value;
    const durCustom= document.getElementById('ctd-custom-duration')?.value;
    const active   = document.getElementById('ctd-active')?.checked;

    const duration = durSel === 'custom' ? (parseInt(durCustom) || 45) : (parseInt(durSel) || 45);
    if (!duration || duration < 1) { Toast.error('Duration must be at least 1 minute.'); return; }

    const config = {
      courseId:   this.selectedCourse.id,
      testName:   testName || this.selectedCourse.name + ' Assessment',
      duration,
      active:     active !== false,
      randomize:  false,
      showTimer:  true,
      autoSubmit: true,
      updatedAt:  new Date().toISOString(),
    };

    const btn = document.getElementById('ctd-save-btn');
    if (btn) btn.classList.add('loading');

    try {
      const res = await API.saveTestConfig(config);
      if (res.success) {
        this.testConfig = config;
        Toast.success('Test configuration saved!');
      } else {
        Toast.error(res.message || 'Failed to save configuration.');
      }
    } catch(e) { Toast.error('Connection error.'); }
    finally { if (btn) btn.classList.remove('loading'); }
  },

  manageQuestions() {
    if (!this.selectedCourse) return;
    // Pass courseId to QuestionMgr and switch to questions view
    QuestionMgr.filterCourseId = this.selectedCourse.id;
    QuestionMgr.filterCourseName = this.selectedCourse.name;
    AdminDash.switchView('questions');
  },
};

// ── COUNTER ANIMATION ────────────────────────────────────────
function animateCounter(el, target, duration = 800) {
  const start   = performance.now();
  const initial = parseInt(el.textContent) || 0;
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease     = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(initial + (target - initial) * ease);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── COURSE SELECTION PAGE ────────────────────────────────────
const CourseSelection = {
  courses: [],
  selectedCourse: null,

  async init() {
    if (!Auth.requireRole('student')) return;
    Loading.show('Loading courses…');
    try {
      const coursesRes = await API.getCourses();
      if (coursesRes.success) {
        // Filter by student's assigned course if available
        const userCourseId = Auth.session?.courseId;
        this.courses = userCourseId
          ? coursesRes.data.filter(c => c.id === userCourseId || !userCourseId)
          : coursesRes.data;
        this.renderCourses();
      }
    } catch(e) { Toast.error('Failed to load courses.'); }
    finally { Loading.hide(); }
  },

  renderCourses() {
    const container = document.getElementById('courses-container');
    if (!container) return;
    if (!this.courses.length) {
      container.innerHTML = '<div class="empty-state"><h3>No Courses Available</h3><p>Please contact your administrator.</p></div>';
      return;
    }
    container.innerHTML = this.courses.map(course => `
      <div class="course-card" data-course-id="${course.id}" onclick="CourseSelection.selectCourse('${course.id}')">
        <div class="course-icon"><svg viewBox="0 0 24 24"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg></div>
        <div class="course-info">
          <h3>${course.name}</h3>
          <p>${course.description || ''}</p>
          <div class="course-meta">
            <span>⏱ ${course.duration} Minutes</span>
            <span>📋 ${course.totalQuestions || 'Varies'} Questions</span>
            <span>📝 MCQ + T/F + Descriptive</span>
          </div>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--silver)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </div>`).join('');
  },

  selectCourse(courseId) {
    this.selectedCourse = this.courses.find(c => c.id === courseId);
    document.querySelectorAll('.course-card').forEach(c => c.classList.remove('selected'));
    document.querySelector(`[data-course-id="${courseId}"]`)?.classList.add('selected');
    const btn = document.getElementById('start-test-btn');
    if (btn) { btn.disabled = false; btn.classList.remove('hidden'); }
  },

  async startTest() {
    if (!this.selectedCourse) { Toast.warning('Please select a course first.'); return; }
    Loading.show('Preparing your exam…');
    try {
      const existingRes = await API.getAttempt(Auth.userId, this.selectedCourse.id);
      if (existingRes.success && existingRes.data) {
        const attempt = existingRes.data;
        if (attempt.status === 'completed') { Toast.error('You have already completed this assessment.'); Loading.hide(); return; }
        if (attempt.status === 'active')    { Loading.hide(); ExamPage.resume(this.selectedCourse, attempt); return; }
      }

      const startRes = await API.startAttempt(Auth.userId, this.selectedCourse.id);
      if (!startRes.success) { Toast.error(startRes.message || 'Failed to start test.'); Loading.hide(); return; }

      const qRes = await API.getQuestions(this.selectedCourse.id);
      if (!qRes.success || !qRes.data.length) { Toast.error('No questions found for this course. Please contact your administrator.'); Loading.hide(); return; }

      Loading.hide();
      ExamPage.start(this.selectedCourse, startRes.data, qRes.data);
    } catch(e) {
      Toast.error('An error occurred. Please try again.');
      Loading.hide();
    }
  },
};
