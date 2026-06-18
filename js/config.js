/**
 * EVERIUM TEST PLATFORM — CONFIGURATION v2.0
 * ============================================
 * After deploying Google Apps Script:
 *  1. Replace API_URL with your Everium Web App URL
 *  2. Replace SKILLTRACK_API_URL with your SkillTrack Pro Web App URL
 *  3. Set DEMO_MODE to false
 */

const CONFIG = {
  // ── Your Everium Apps Script Web App URL ──
  API_URL: 'https://script.google.com/macros/s/AKfycbwKUSLLip4iZqgf4i9mtHvguv4gcaCtewtV7Y5jsuzIs5J2HxS0_N7JOHM7itTlANIk-A/exec',

  // ── Your SkillTrack Pro Apps Script Web App URL ──
  SKILLTRACK_API_URL: 'https://script.google.com/macros/s/AKfycbwdJsGxnvU-T69v2WHecctvcIk4fdUSZn6IqWLXg6GIbq3RF5HcuEZvuStDK7xorAWMug/exec',

  // Platform Settings
  PLATFORM_NAME:    'Everium Test Platform',
  PLATFORM_TAGLINE: 'Excellence in Assessment',

  // These are now per-course, stored in TestConfig sheet.
  // These values are used only as fallbacks in DEMO_MODE.
  EXAM_DURATION_MINUTES: 45,
  TOTAL_QUESTIONS:       30,
  MCQ_COUNT:             15,
  TF_COUNT:              10,
  DESC_COUNT:             5,

  // Session
  SESSION_KEY: 'everium_session',
  ANSWERS_KEY: 'everium_answers',
  TIMER_KEY:   'everium_timer',

  // Demo mode — set false after Google Sheets setup
  DEMO_MODE: false,
};

// ── SHA-256 hash (client-side, for demo mode only) ──
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data    = encoder.encode(password);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// ── Demo data ─────────────────────────────────────────────
const DEMO_USERS = [
  { id:'u001', username:'admin01',    role:'admin',   name:'Administrator', password:'Admin@123',   active:true, email:'admin@everium.edu', courseId:'' },
  { id:'u002', username:'teacher01',  role:'teacher', name:'Teacher One',   password:'Teacher@123', active:true, email:'teacher1@everium.edu', courseId:'' },
  { id:'u003', username:'teacher02',  role:'teacher', name:'Teacher Two',   password:'Teacher@123', active:true, email:'teacher2@everium.edu', courseId:'' },
  { id:'u004', username:'stu.priya001',role:'student', name:'Priya Sharma', password:'Ev@xPriya1', active:true, email:'', courseId:'c001' },
  { id:'u005', username:'stu.rahul002',role:'student', name:'Rahul Verma',  password:'Ev@xRahul2', active:true, email:'', courseId:'c001' },
  { id:'u006', username:'stu.anita003',role:'student', name:'Anita Singh',  password:'Ev@xAnita3', active:true, email:'', courseId:'c002' },
];

const DEMO_COURSES = [
  {
    id:'c001', skilltrackCourseId:'c001', code:'DMF101',
    name:'Digital Marketing Fundamentals',
    description:'A comprehensive assessment covering SEO, SEM, Social Media, Content Marketing, and Analytics.',
    duration:45, totalQuestions:30, active:true
  },
  {
    id:'c002', skilltrackCourseId:'c002', code:'WDA201',
    name:'Web Development Basics',
    description:'Assessment covering HTML, CSS, JavaScript fundamentals and web design principles.',
    duration:60, totalQuestions:20, active:true
  },
];

const DEMO_TEST_CONFIGS = [
  { courseId:'c001', testName:'Digital Marketing Assessment', duration:45, active:true, randomize:false, showTimer:true, autoSubmit:true },
  { courseId:'c002', testName:'Web Development Assessment',   duration:60, active:true, randomize:false, showTimer:true, autoSubmit:true },
];

const DEMO_QUESTIONS = [
  // DMF101 — MCQ
  { id:'q001', courseId:'c001', type:'mcq', order:1,  text:'What does SEO stand for?', optionA:'Search Engine Optimization', optionB:'Social Engine Output', optionC:'Search Engine Operation', optionD:'Site Engagement Optimization', correct:'A', marks:1 },
  { id:'q002', courseId:'c001', type:'mcq', order:2,  text:'Which of the following is a key metric used in email marketing?', optionA:'Bounce Rate only', optionB:'Open Rate and Click-Through Rate', optionC:'Page Views', optionD:'Domain Authority', correct:'B', marks:1 },
  { id:'q003', courseId:'c001', type:'mcq', order:3,  text:'What is a "conversion" in digital marketing?', optionA:'Changing your website design', optionB:'A visitor completing a desired action', optionC:'Converting currency for ad spend', optionD:'Switching social media platforms', correct:'B', marks:1 },
  { id:'q004', courseId:'c001', type:'mcq', order:4,  text:'Which social media platform is best suited for B2B marketing?', optionA:'TikTok', optionB:'Instagram', optionC:'LinkedIn', optionD:'Pinterest', correct:'C', marks:1 },
  { id:'q005', courseId:'c001', type:'mcq', order:5,  text:'What does CPC stand for in digital advertising?', optionA:'Cost Per Customer', optionB:'Content Per Click', optionC:'Cost Per Click', optionD:'Conversion Per Campaign', correct:'C', marks:1 },
  { id:'q006', courseId:'c001', type:'mcq', order:6,  text:'Which of the following best describes a "landing page"?', optionA:'The homepage of a website', optionB:'A dedicated page designed to capture leads or drive conversions', optionC:'The footer page of a website', optionD:'An error page', correct:'B', marks:1 },
  { id:'q007', courseId:'c001', type:'mcq', order:7,  text:'What is the primary purpose of Google Analytics?', optionA:'To run paid advertising campaigns', optionB:'To track and analyze website traffic and user behavior', optionC:'To design website layouts', optionD:'To manage social media posts', correct:'B', marks:1 },
  { id:'q008', courseId:'c001', type:'mcq', order:8,  text:'What is "content marketing"?', optionA:'Paying for advertisements', optionB:'Creating and distributing valuable content to attract and retain an audience', optionC:'Managing website server content', optionD:'Editing product descriptions', correct:'B', marks:1 },
  { id:'q009', courseId:'c001', type:'mcq', order:9,  text:'Which element is most important for on-page SEO?', optionA:'Number of social media followers', optionB:'Website color scheme', optionC:'Title tags and meta descriptions', optionD:'Website hosting provider', correct:'C', marks:1 },
  { id:'q010', courseId:'c001', type:'mcq', order:10, text:'What does ROI stand for in marketing?', optionA:'Rate of Influence', optionB:'Return on Investment', optionC:'Revenue of Interest', optionD:'Reach of Impact', correct:'B', marks:1 },
  { id:'q011', courseId:'c001', type:'mcq', order:11, text:'Which of the following is an example of paid digital marketing?', optionA:'Organic social media posts', optionB:'Blog articles', optionC:'Google Ads (PPC)', optionD:'Email newsletters to existing subscribers', correct:'C', marks:1 },
  { id:'q012', courseId:'c001', type:'mcq', order:12, text:'What is a "buyer persona" in marketing?', optionA:'A real customer who makes a purchase', optionB:'A fictional representation of your ideal customer', optionC:'An animated character for ads', optionD:'A legal customer profile document', correct:'B', marks:1 },
  { id:'q013', courseId:'c001', type:'mcq', order:13, text:'What does CTR mean in digital advertising?', optionA:'Customer Transaction Rate', optionB:'Content Tracking Ratio', optionC:'Click-Through Rate', optionD:'Campaign Traffic Result', correct:'C', marks:1 },
  { id:'q014', courseId:'c001', type:'mcq', order:14, text:'Which type of marketing involves influencers promoting products?', optionA:'Email Marketing', optionB:'Influencer Marketing', optionC:'Search Marketing', optionD:'Display Advertising', correct:'B', marks:1 },
  { id:'q015', courseId:'c001', type:'mcq', order:15, text:'What is "remarketing" in digital advertising?', optionA:'Launching a new marketing campaign', optionB:'Marketing to people who have previously visited your website', optionC:'Editing previous advertisements', optionD:'Marketing to new audiences only', correct:'B', marks:1 },
  // DMF101 — T/F
  { id:'q016', courseId:'c001', type:'tf', order:16, text:'Social media marketing can help improve a website\'s organic search rankings.', correct:'True',  marks:1 },
  { id:'q017', courseId:'c001', type:'tf', order:17, text:'A high bounce rate always indicates poor website performance.', correct:'False', marks:1 },
  { id:'q018', courseId:'c001', type:'tf', order:18, text:'Email marketing has one of the highest ROIs among digital marketing channels.', correct:'True',  marks:1 },
  { id:'q019', courseId:'c001', type:'tf', order:19, text:'PPC advertising guarantees the first position in search engine results.', correct:'False', marks:1 },
  { id:'q020', courseId:'c001', type:'tf', order:20, text:'Mobile optimization is important for digital marketing success.', correct:'True',  marks:1 },
  { id:'q021', courseId:'c001', type:'tf', order:21, text:'Keyword stuffing is a recommended SEO practice.', correct:'False', marks:1 },
  { id:'q022', courseId:'c001', type:'tf', order:22, text:'A call-to-action (CTA) encourages the user to take a specific step.', correct:'True',  marks:1 },
  { id:'q023', courseId:'c001', type:'tf', order:23, text:'All digital marketing channels require paid advertising budgets.', correct:'False', marks:1 },
  { id:'q024', courseId:'c001', type:'tf', order:24, text:'A/B testing is a method used to compare two versions of a marketing asset.', correct:'True',  marks:1 },
  { id:'q025', courseId:'c001', type:'tf', order:25, text:'Instagram Stories disappear after 48 hours by default.', correct:'False', marks:1 },
  // DMF101 — Descriptive
  { id:'q026', courseId:'c001', type:'descriptive', order:26, text:'Explain the difference between organic and paid digital marketing with at least two examples of each.', marks:5 },
  { id:'q027', courseId:'c001', type:'descriptive', order:27, text:'Describe the concept of the marketing funnel and how digital marketing applies at each stage.', marks:5 },
  { id:'q028', courseId:'c001', type:'descriptive', order:28, text:'What is SEO? Explain at least four key on-page SEO factors that improve a website\'s ranking.', marks:5 },
  { id:'q029', courseId:'c001', type:'descriptive', order:29, text:'Outline a social media strategy for a new local bakery, including platform selection, content types, and success metrics.', marks:5 },
  { id:'q030', courseId:'c001', type:'descriptive', order:30, text:'What is email marketing and why is it effective? Describe three best practices for a successful campaign.', marks:5 },
  // WDA201 — MCQ
  { id:'q031', courseId:'c002', type:'mcq', order:1,  text:'What does HTML stand for?', optionA:'Hyper Text Markup Language', optionB:'High Transfer Markup Language', optionC:'Hyper Transfer Meta Language', optionD:'Hyper Text Meta Link', correct:'A', marks:1 },
  { id:'q032', courseId:'c002', type:'mcq', order:2,  text:'Which CSS property is used to change text colour?', optionA:'font-color', optionB:'text-color', optionC:'color', optionD:'foreground-color', correct:'C', marks:1 },
  { id:'q033', courseId:'c002', type:'mcq', order:3,  text:'Which HTML tag is used for the largest heading?', optionA:'<h6>', optionB:'<h1>', optionC:'<heading>', optionD:'<head>', correct:'B', marks:1 },
  { id:'q034', courseId:'c002', type:'mcq', order:4,  text:'What does CSS stand for?', optionA:'Computer Style Sheets', optionB:'Cascading Style Sheets', optionC:'Creative Style Sheets', optionD:'Colorful Style Sheets', correct:'B', marks:1 },
  { id:'q035', courseId:'c002', type:'mcq', order:5,  text:'Which JavaScript keyword declares a variable?', optionA:'int', optionB:'dim', optionC:'var', optionD:'string', correct:'C', marks:1 },
  { id:'q036', courseId:'c002', type:'mcq', order:6,  text:'What is the correct way to comment in JavaScript?', optionA:'<!-- comment -->', optionB:'# comment', optionC:'// comment', optionD:'** comment', correct:'C', marks:1 },
  { id:'q037', courseId:'c002', type:'mcq', order:7,  text:'Which HTML element is used to define internal styles?', optionA:'<css>', optionB:'<style>', optionC:'<script>', optionD:'<link>', correct:'B', marks:1 },
  { id:'q038', courseId:'c002', type:'mcq', order:8,  text:'Which CSS display value makes an element a flex container?', optionA:'display:block', optionB:'display:grid', optionC:'display:flex', optionD:'display:inline', correct:'C', marks:1 },
  { id:'q039', courseId:'c002', type:'mcq', order:9,  text:'What does DOM stand for?', optionA:'Data Object Model', optionB:'Document Object Model', optionC:'Dynamic Object Model', optionD:'Display Object Module', correct:'B', marks:1 },
  { id:'q040', courseId:'c002', type:'mcq', order:10, text:'Which tag creates a hyperlink in HTML?', optionA:'<link>', optionB:'<a>', optionC:'<href>', optionD:'<url>', correct:'B', marks:1 },
  // WDA201 — T/F
  { id:'q041', courseId:'c002', type:'tf', order:11, text:'JavaScript is a server-side only programming language.', correct:'False', marks:1 },
  { id:'q042', courseId:'c002', type:'tf', order:12, text:'CSS Grid is a two-dimensional layout system.', correct:'True',  marks:1 },
  { id:'q043', courseId:'c002', type:'tf', order:13, text:'The <br> tag in HTML requires a closing tag.', correct:'False', marks:1 },
  { id:'q044', courseId:'c002', type:'tf', order:14, text:'Responsive design means a website adapts to different screen sizes.', correct:'True',  marks:1 },
  { id:'q045', courseId:'c002', type:'tf', order:15, text:'innerHTML is a CSS property.', correct:'False', marks:1 },
  // WDA201 — Descriptive
  { id:'q046', courseId:'c002', type:'descriptive', order:16, text:'Explain the difference between inline, internal and external CSS with examples.', marks:5 },
  { id:'q047', courseId:'c002', type:'descriptive', order:17, text:'What is responsive web design? Describe three techniques used to make a website responsive.', marks:5 },
  { id:'q048', courseId:'c002', type:'descriptive', order:18, text:'Explain the JavaScript event loop and how asynchronous code is handled.', marks:5 },
  { id:'q049', courseId:'c002', type:'descriptive', order:19, text:'What is the box model in CSS? Describe each component and how they affect element sizing.', marks:5 },
  { id:'q050', courseId:'c002', type:'descriptive', order:20, text:'Describe the process of building a basic webpage from scratch — structure, styling, and interactivity.', marks:5 },
];
