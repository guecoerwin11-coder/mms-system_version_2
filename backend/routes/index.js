// ── AUTH ROUTES ──────────────────────────────────────────────────────────────
const express = require('express');
const authRouter = express.Router();
const authCtrl = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {checkBruteForce} = require('../middleware/bruteforce')

authRouter.post('/register',        authCtrl.register)
authRouter.post('/login',           checkBruteForce,authCtrl.login);
authRouter.post('/forgot-password', authCtrl.forgotPassword);
authRouter.post('/reset-password',  authCtrl.resetPassword);
authRouter.put( '/change-password', protect, authCtrl.changePassword);
authRouter.get( '/me',              protect, authCtrl.getMe);



// ── USER ROUTES ───────────────────────────────────────────────────────────────
const userRouter = express.Router();
const userCtrl  = require('../controllers/userController');
const { instructorOnly } = require('../middleware/auth');
const { uploadAvatar, uploadExcel } = require('../config/cloudinary');

userRouter.get(  '/',            protect, instructorOnly, userCtrl.getStudents);
userRouter.put(  '/profile',     protect, userCtrl.updateProfile);
userRouter.put(  '/avatar',      protect, uploadAvatar.single('avatar'), userCtrl.uploadAvatar);
userRouter.put(  '/:id/score',   protect, instructorOnly, userCtrl.updateStudentScore);
userRouter.post( '/import',      protect, instructorOnly, uploadExcel.single('file'), userCtrl.importStudents);
userRouter.delete('/:id',        protect, userCtrl.delStudent)

// ── CHAPTER ROUTES ────────────────────────────────────────────────────────────
const chapterRouter = express.Router();
const chCtrl = require('../controllers/chapterController');
const { uploadVideo, uploadFile } = require('../config/cloudinary');

chapterRouter.get( '/',                     protect, chCtrl.getChapters);

chapterRouter.get( '/assessment-videos',    protect, chCtrl.getAssessmentVideos);
chapterRouter.get( '/progress/:studentId',  protect, chCtrl.getProgress);

chapterRouter.get( '/:id',                 protect, chCtrl.getChapter);

chapterRouter.put( '/:id',                 protect, instructorOnly, chCtrl.updateChapter);

chapterRouter.post('/video', protect, instructorOnly, uploadFile.single('video'), chCtrl.uploadVideo);

chapterRouter.delete('/video/:id',         protect, instructorOnly, chCtrl.deleteVideo);

chapterRouter.post('/slide',               protect, instructorOnly, uploadFile.single('file'), chCtrl.uploadSlide);

chapterRouter.post('/progress',            protect, chCtrl.markProgress);

chapterRouter.delete('/slide/:id',         protect, instructorOnly, chCtrl.deleteSlide);

// ── QUIZ ROUTES ───────────────────────────────────────────────────────────────
const quizRouter = express.Router();
const quizCtrl = require('../controllers/quizController');

quizRouter.get(  '/',               protect, quizCtrl.getQuestions);
quizRouter.post( '/',               protect, instructorOnly, quizCtrl.createQuestion);
quizRouter.put(  '/:id',            protect, instructorOnly, quizCtrl.updateQuestion);
quizRouter.delete('/:id',           protect, instructorOnly, quizCtrl.deleteQuestion);
quizRouter.post( '/attempt/start',  protect, quizCtrl.startAttempt);
quizRouter.post( '/attempt/submit', protect, quizCtrl.submitAttempt);
quizRouter.get(  '/attempts/:studentId', protect, quizCtrl.getAttempts);

// ── ACTIVITY ROUTES ───────────────────────────────────────────────────────────
const activityRouter = express.Router();
const actCtrl = require('../controllers/activityController');

activityRouter.get(  '/',          protect, actCtrl.getActivities);
activityRouter.post( '/upload',    protect, instructorOnly, uploadFile.single('file'), actCtrl.uploadActivity);
activityRouter.delete('/:id',      protect, instructorOnly, actCtrl.deleteActivity);
activityRouter.get(  '/submissions',       protect, actCtrl.getSubmissions);
activityRouter.post( '/submit',    protect, uploadFile.single('file'), actCtrl.submitActivity);
activityRouter.put(  '/submissions/:id/grade', protect, instructorOnly, actCtrl.gradeSubmission);

// ── PEER EVALUATION ROUTES ────────────────────────────────────────────────────
const peerRouter = express.Router();
const peerCtrl = require('../controllers/peerController');

peerRouter.get(  '/',          protect, peerCtrl.getGroups);
peerRouter.get(  '/my-group',  protect, peerCtrl.getMyGroup);
peerRouter.post( '/',          protect, instructorOnly, peerCtrl.createGroup);
peerRouter.put(  '/:id',       protect, instructorOnly, peerCtrl.updateGroup);
peerRouter.delete('/:id',      protect, instructorOnly, peerCtrl.deleteGroup);
peerRouter.post( '/evaluate',  protect, peerCtrl.submitEvaluation);
peerRouter.get(  '/results',   protect, instructorOnly, peerCtrl.getResults);

// ── AI ROUTES ─────────────────────────────────────────────────────────────────
const aiRouter = express.Router();
const aiCtrl = require('../controllers/aiController');

aiRouter.post('/chat',              protect, aiCtrl.chat);
aiRouter.get( '/history',           protect, aiCtrl.getHistory);
aiRouter.post('/video-question',    protect, aiCtrl.generateVideoQuestion);
aiRouter.delete('/history',         protect, aiCtrl.clearHistory);

module.exports = { authRouter, userRouter, chapterRouter, quizRouter, activityRouter, peerRouter, aiRouter };
