// src/email.js
// Email utility — template definitions and subject line builders
// Actual send logic lives in candidate.js / api/email.js

const EMAIL_TEMPLATES = {
  aptitude: {
    label: 'Aptitude Round',
    description: 'Aptitude test scores + initial candidate brief',
  },
  assessment: {
    label: 'Assessment Round',
    description: 'Assessment scores and creative/technical evaluation',
  },
  ai_interview: {
    label: 'AI Interview Round',
    description: 'AI interview feedback and scores',
  },
  manager_round: {
    label: 'Manager Round',
    description: 'Manager round feedback, scores, and recommendation',
  },
  kaveri_round: {
    label: 'Kaveri Round',
    description: 'All rounds summary for Kaveri review — scores and feedback',
  },
  vijay_round: {
    label: 'Vijay Round',
    description: 'All rounds summary for final round — complete candidate history',
  },
};

function getTemplateLabel(stageKey) {
  return EMAIL_TEMPLATES[stageKey]?.label || stageKey;
}

function getTemplateDescription(stageKey) {
  return EMAIL_TEMPLATES[stageKey]?.description || '';
}

// Expose
window.EMAIL_TEMPLATES        = EMAIL_TEMPLATES;
window.getTemplateLabel       = getTemplateLabel;
window.getTemplateDescription = getTemplateDescription;
