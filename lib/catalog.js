const SB_KIT_SKILLS = [
  "sk-excute",
  "sk-excute-explorer",
  "sk-excute-researcher",
  "sk-excute-implementer",
  "sk-visualizer",
  "sk-create-slide",
  "sk-release",
  "sk-doc",
  "sk-start-next-hono",
  "sk-explain",
  "sk-verify-code-ui-only",
  "sk-review-diff",
  "sk-idea-to-docs",
];
const ASSET_SKILLS = [
  "frontend-design",
  "vercel-react-best-practices",
  "vercel-react-native-skills",
];
const REPORT_SKILLS = [
  "sk-create-slide",
  "sk-visualizer",
  "sk-doc",
  "sk-explain",
];
const REQUIRED_COMPANIONS = {};
const AUTO_INCLUDED_COMPANIONS = {
  "sk-excute": [
    "sk-excute-explorer",
    "sk-excute-researcher",
    "sk-excute-implementer",
  ],
};

module.exports = {
  SB_KIT_SKILLS,
  ASSET_SKILLS,
  REPORT_SKILLS,
  REQUIRED_COMPANIONS,
  AUTO_INCLUDED_COMPANIONS,
};
