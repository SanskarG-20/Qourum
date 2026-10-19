const fs = require('fs');
const path = require('path');
const babel = require('/usr/share/nodejs/@babel/core');
const presetReact = require('/usr/share/nodejs/@babel/preset-react');

// Ordered module list (dependency order)
const moduleFiles = [
  'src/assets/mediaAssets.js',
  'src/config/siteConfig.js',
  'src/data/clubsDataset.js',
  'src/utils/recommenderEngine.js',
  'src/hooks/useCustomCursor.js',
  'src/hooks/useLiveClock.js',
  'src/hooks/useScrollReveal.js',
  'src/components/ui/SelectionBox.jsx',
  'src/components/ui/StickyNote.jsx',
  'src/components/ui/CursorBadge.jsx',
  'src/components/ui/PolaroidFrame.jsx',
  'src/components/ui/PixelDisplayHeading.jsx',
  'src/components/ui/GeometricIcons.jsx',
  'src/components/layout/RulerBar.jsx',
  'src/components/layout/CustomCursorLayer.jsx',
  'src/components/layout/TopNavbar.jsx',
  'src/components/sections/IntroSplashBubble.jsx',
  'src/components/sections/HeroSection.jsx',
  'src/components/sections/ProblemSection.jsx',
  'src/components/sections/PipelineFolderStack.jsx',
  'src/components/sections/DemoLabSection.jsx',
  'src/components/sections/EvaluationSection.jsx',
  'src/components/sections/PlaygroundSurveySection.jsx',
  'src/components/sections/LetsTalkFooter.jsx',
  'src/App.jsx',
];

let combinedSource = '';

for (const relPath of moduleFiles) {
  const fullPath = path.join('/working_dir/c_de7c884d0727772d', relPath);
  let code = fs.readFileSync(fullPath, 'utf8');

  // Strip ES module import lines and convert export keywords to global/scope declarations
  code = code
    .replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*import\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/export\s+default\s+function\s+/g, 'function ')
    .replace(/export\s+function\s+/g, 'function ')
    .replace(/export\s+const\s+/g, 'const ');

  const transformed = babel.transformSync(code, {
    filename: relPath,
    presets: [[presetReact, { runtime: 'classic', pragma: 'React.createElement', pragmaFrag: 'React.Fragment' }]],
    ast: false,
    sourceMaps: false,
  });

  combinedSource += `\n// === MODULE: ${relPath} ===\n` + transformed.code + '\n';
}

fs.writeFileSync('/tmp/compiled_app.js', combinedSource, 'utf8');
console.log('Successfully compiled all', moduleFiles.length, 'modules with @babel/core + @babel/preset-react! Size:', combinedSource.length);
