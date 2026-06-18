/**
 * EVERIUM TEST PLATFORM — API LAYER v2.0
 * Handles all communication with Google Apps Script backend.
 * Falls back to DEMO_MODE when API_URL is not configured.
 * 
 * All requests are GET to avoid CORS preflight issues with Apps Script.
 */

const API = {

  async request(action, data = {}) {
    if (CONFIG.DEMO_MODE || CONFIG.API_URL.includes('YOUR_EVERIUM_SCRIPT_ID')) {
      return this._demoHandler(action, data);
    }
    try {
      const payload = { action, ...data };
      const url = new URL(CONFIG.API_URL);
      Object.keys(payload).forEach(k => {
        if (payload[k] !== undefined) {
          url.searchParams.append(k, JSON.stringify(payload[k]));
        }
      });
      const response = await fetch(url.toString(), { method:'GET', mode:'cors', redirect:'follow' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  },

  async post(action, data = {}) { return this.request(action, data); },

  // ─────────────────────────────────────────────
  //  AUTH
  // ─────────────────────────────────────────────
  async login(username, password) { return this.request('login', { username, password }); },
  async logout(userId, token)     { return this.request('logout', { userId, sessionToken: token }); },

  // ─────────────────────────────────────────────
  //  SYNC FROM SKILLTRACK
  // ─────────────────────────────────────────────
  async syncFromSkillTrack(skilltrackUrl) {
    return this.post('syncFromSkillTrack', { skilltrackUrl });
  },
  async getSyncStatus() { return this.request('getSyncStatus'); },

  // ─────────────────────────────────────────────
  //  USERS (read only — no create/delete)
  // ─────────────────────────────────────────────
  async getUsers()                         { return this.request('getUsers', {}); },
  async toggleUserStatus(userId, active)   { return this.post('toggleUserStatus', { userId, active }); },

  // ─────────────────────────────────────────────
  //  COURSES
  // ─────────────────────────────────────────────
  async getCourses(role = null) { return this.request('getCourses', { role }); },
  async updateCourse(courseId, updates) { return this.post('updateCourse', { courseId, updates }); },

  // ─────────────────────────────────────────────
  //  TEST CONFIG (per-course exam settings)
  // ─────────────────────────────────────────────
  async getTestConfig(courseId = null) { return this.request('getTestConfig', { courseId }); },
  async saveTestConfig(config)         { return this.post('saveTestConfig', { config }); },

  // ─────────────────────────────────────────────
  //  QUESTIONS (unlimited, per-course)
  // ─────────────────────────────────────────────
  async getQuestions(courseId, type = null) { return this.request('getQuestions', { courseId, type }); },
  async createQuestion(questionData)         { return this.post('createQuestion', { questionData }); },
  async updateQuestion(questionId, updates)  { return this.post('updateQuestion', { questionId, updates }); },
  async deleteQuestion(questionId)           { return this.post('deleteQuestion', { questionId }); },
  async bulkDeleteQuestions(courseId, type)  { return this.post('bulkDeleteQuestions', { courseId, type }); },

  // ─────────────────────────────────────────────
  //  ATTEMPTS
  // ─────────────────────────────────────────────
  async getAttempt(userId, courseId)           { return this.request('getAttempt', { userId, courseId }); },
  async startAttempt(userId, courseId)         { return this.post('startAttempt', { userId, courseId }); },
  async saveAnswer(attemptId, questionId, ans) { return this.post('saveAnswer', { attemptId, questionId, answer: ans }); },
  async submitAttempt(attemptId, answers)      { return this.post('submitAttempt', { attemptId, answers }); },
  async resetAttempt(userId, courseId)         { return this.post('resetAttempt', { userId, courseId }); },
  async syncTimer(attemptId, remaining)        { return this.post('syncTimer', { attemptId, remainingSeconds: remaining }); },

  // ─────────────────────────────────────────────
  //  RESULTS / ANALYTICS
  // ─────────────────────────────────────────────
  async getResults(courseId = null)  { return this.request('getResults', { courseId }); },
  async getAnalytics(courseId = null){ return this.request('getAnalytics', { courseId }); },

  // ─────────────────────────────────────────────
  //  DEMO HANDLER
  // ─────────────────────────────────────────────
  _demoHandler(action, data) {
    return new Promise(resolve => setTimeout(() => resolve(this._processDemo(action, data)), 150));
  },

  _processDemo(action, data) {
    const store = DemoStore;

    switch (action) {

      case 'login': {
        const user = store.users.find(u => u.username === data.username && u.password === data.password && u.active);
        if (!user) return { success: false, message: 'Invalid username or password.' };
        return { success: true, user: { ...user, password: undefined }, session: { token: 'demo_' + Date.now() } };
      }

      case 'logout': return { success: true };

      case 'syncFromSkillTrack':
        return { success: true, message: 'Demo mode — sync simulated', usersAdded: 0, coursesAdded: 0 };

      case 'getSyncStatus':
        return { success: true, data: { lastSync: new Date().toISOString(), lastMessage: 'Demo mode', usersTotal: store.users.length, coursesTotal: store.courses.length } };

      case 'getUsers': {
        // Return all users (admin filters client-side by tab)
        const users = store.users.map(u => ({ ...u, password: undefined, passwordHash: undefined }));
        return { success: true, data: users };
      }

      case 'toggleUserStatus': {
        const user = store.users.find(u => u.id === data.userId);
        if (!user) return { success: false, message: 'User not found.' };
        if (!data.active && user.role === 'admin') {
          const otherAdmins = store.users.filter(u => u.role === 'admin' && u.active && u.id !== data.userId);
          if (!otherAdmins.length) return { success: false, message: 'Operation not permitted. The system must always have at least one active Admin account.' };
        }
        user.active = data.active;
        return { success: true };
      }

      case 'getCourses': {
        let courses = [...store.courses];
        if (data.role !== 'admin' && data.role !== 'teacher') courses = courses.filter(c => c.active);
        return { success: true, data: courses.map(c => ({ ...c, totalQuestions: store.questions.filter(q => q.courseId === c.id).length })) };
      }

      case 'updateCourse': {
        const idx = store.courses.findIndex(c => c.id === data.courseId);
        if (idx < 0) return { success: false, message: 'Course not found.' };
        store.courses[idx] = { ...store.courses[idx], ...data.updates };
        return { success: true };
      }

      case 'getTestConfig': {
        if (data.courseId) {
          const cfg = store.testConfigs.find(c => c.courseId === data.courseId);
          if (cfg) return { success: true, data: cfg };
          const course = store.courses.find(c => c.id === data.courseId);
          return { success: true, data: { courseId: data.courseId, testName: course ? course.name + ' Assessment' : 'Assessment', duration: course ? course.duration : 45, active: true, randomize: false, showTimer: true, autoSubmit: true } };
        }
        return { success: true, data: store.testConfigs };
      }

      case 'saveTestConfig': {
        const idx = store.testConfigs.findIndex(c => c.courseId === data.config.courseId);
        if (idx >= 0) store.testConfigs[idx] = data.config;
        else store.testConfigs.push(data.config);
        return { success: true };
      }

      case 'getQuestions': {
        let qs = data.courseId ? store.questions.filter(q => q.courseId === data.courseId) : [...store.questions];
        if (data.type) qs = qs.filter(q => q.type === data.type);
        return { success: true, data: qs.sort((a,b) => (a.order||0) - (b.order||0)) };
      }

      case 'createQuestion': {
        const q = { ...data.questionData, id: 'q' + Date.now() };
        if (!q.order) q.order = store.questions.filter(x => x.courseId === q.courseId && x.type === q.type).length + 1;
        store.questions.push(q);
        return { success: true, data: q };
      }

      case 'updateQuestion': {
        const idx = store.questions.findIndex(q => q.id === data.questionId);
        if (idx < 0) return { success: false, message: 'Question not found.' };
        store.questions[idx] = { ...store.questions[idx], ...data.updates };
        return { success: true, data: store.questions[idx] };
      }

      case 'deleteQuestion': {
        const idx = store.questions.findIndex(q => q.id === data.questionId);
        if (idx >= 0) store.questions.splice(idx, 1);
        return { success: true };
      }

      case 'bulkDeleteQuestions':
        store.questions = store.questions.filter(q => {
          if (q.courseId !== data.courseId) return true;
          if (data.type && q.type !== data.type) return true;
          return false;
        });
        return { success: true };

      case 'getAttempt': {
        const attempt = store.attempts.find(a => a.userId === data.userId && a.courseId === data.courseId);
        if (!attempt) return { success: true, data: null };
        const cfg = store.testConfigs.find(c => c.courseId === data.courseId);
        const dur = cfg ? cfg.duration : CONFIG.EXAM_DURATION_MINUTES;
        let remaining = attempt.remainingSeconds ?? dur * 60;
        if (attempt.status === 'active' && attempt.startTime) {
          const elapsed = Math.floor((Date.now() - new Date(attempt.startTime).getTime()) / 1000);
          remaining = Math.max(0, dur * 60 - elapsed);
        }
        const answers = store.answers.filter(a => a.attemptId === attempt.id);
        return { success: true, data: { ...attempt, remainingSeconds: remaining, answers } };
      }

      case 'startAttempt': {
        const existing = store.attempts.find(a => a.userId === data.userId && a.courseId === data.courseId);
        if (existing) return { success: false, message: 'An attempt already exists.' };
        const cfg = store.testConfigs.find(c => c.courseId === data.courseId);
        const dur = cfg ? cfg.duration : CONFIG.EXAM_DURATION_MINUTES;
        const attempt = { id:'att'+Date.now(), userId:data.userId, courseId:data.courseId, status:'active', startTime:new Date().toISOString(), endTime:null, remainingSeconds:dur*60, score:null, mcqScore:null, tfScore:null };
        store.attempts.push(attempt);
        return { success: true, data: attempt };
      }

      case 'saveAnswer': {
        const existing = store.answers.find(a => a.attemptId === data.attemptId && a.questionId === data.questionId);
        if (existing) { existing.answer = data.answer; existing.savedAt = new Date().toISOString(); }
        else store.answers.push({ id:'ans'+Date.now(), attemptId:data.attemptId, questionId:data.questionId, answer:data.answer, savedAt:new Date().toISOString() });
        return { success: true };
      }

      case 'submitAttempt': {
        const attempt = store.attempts.find(a => a.id === data.attemptId);
        if (!attempt) return { success: false, message: 'Attempt not found.' };
        if (attempt.status === 'completed') return { success: false, message: 'Already submitted.' };
        const questions = store.questions.filter(q => q.courseId === attempt.courseId);
        let mcqScore = 0, tfScore = 0;
        for (const [qId, ans] of Object.entries(data.answers || {})) {
          const question = questions.find(q => q.id === qId);
          if (!question) continue;
          if (question.type === 'mcq' && ans === question.correct) mcqScore++;
          if (question.type === 'tf'  && ans === question.correct) tfScore++;
          const existing = store.answers.find(a => a.attemptId === data.attemptId && a.questionId === qId);
          if (existing) existing.answer = ans;
          else store.answers.push({ id:'ans'+Date.now()+Math.random(), attemptId:data.attemptId, questionId:qId, answer:ans, savedAt:new Date().toISOString() });
        }
        attempt.status = 'completed'; attempt.endTime = new Date().toISOString();
        attempt.mcqScore = mcqScore; attempt.tfScore = tfScore; attempt.score = mcqScore + tfScore;
        return { success: true, data: { score:attempt.score, mcqScore, tfScore } };
      }

      case 'resetAttempt': {
        const aIdx = store.attempts.findIndex(a => a.userId === data.userId && a.courseId === data.courseId);
        if (aIdx >= 0) {
          const attId = store.attempts[aIdx].id;
          store.attempts.splice(aIdx, 1);
          store.answers = store.answers.filter(a => a.attemptId !== attId);
        }
        return { success: true };
      }

      case 'syncTimer': {
        const attempt = store.attempts.find(a => a.id === data.attemptId);
        if (attempt) attempt.remainingSeconds = data.remainingSeconds;
        return { success: true };
      }

      case 'getResults': {
        let results = store.attempts.filter(a => a.status === 'completed').map(a => {
          const user    = store.users.find(u => u.id === a.userId);
          const course  = store.courses.find(c => c.id === a.courseId);
          const answers = store.answers.filter(x => x.attemptId === a.id);
          return { attemptId:a.id, userId:a.userId, studentName:user?user.name:'Unknown', username:user?user.username:'Unknown', courseId:a.courseId, courseName:course?course.name:'Unknown', startTime:a.startTime, endTime:a.endTime, score:a.score, mcqScore:a.mcqScore, tfScore:a.tfScore, answers };
        });
        if (data.courseId) results = results.filter(r => r.courseId === data.courseId);
        return { success: true, data: results };
      }

      case 'getAnalytics': {
        let attempts = [...store.attempts];
        if (data.courseId) attempts = attempts.filter(a => a.courseId === data.courseId);
        const completed = attempts.filter(a => a.status === 'completed');
        const active    = attempts.filter(a => a.status === 'active');
        const total     = store.users.filter(u => u.role === 'student' && u.active).length;
        const avgScore  = completed.length ? Math.round(completed.reduce((s,a) => s + (a.score||0), 0) / completed.length) : 0;
        const qs        = data.courseId ? store.questions.filter(q => q.courseId === data.courseId) : store.questions;
        return { success: true, data: { totalStudents:total, completedAttempts:completed.length, activeAttempts:active.length, notStarted:total-completed.length-active.length, averageScore:avgScore, maxScore:qs.filter(q=>q.type==='mcq').length+qs.filter(q=>q.type==='tf').length } };
      }

      default:
        return { success: false, message: `Unknown action: ${action}` };
    }
  },
};

// ── In-memory store for demo mode ──
const DemoStore = {
  users:       [...DEMO_USERS],
  courses:     [...DEMO_COURSES],
  questions:   [...DEMO_QUESTIONS],
  testConfigs: [...DEMO_TEST_CONFIGS],
  attempts:    [],
  answers:     [],
};
