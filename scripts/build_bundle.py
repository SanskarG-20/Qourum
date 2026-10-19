import os
import subprocess
import zipfile

root_dir = '/working_dir/c_de7c884d0727772d'

# 1. Compile all JSX/JS modules via Babel
subprocess.run(['node', os.path.join(root_dir, 'scripts/compile_jsx.cjs')], check=True)

tokens_css = open(os.path.join(root_dir, 'src/styles/tokens.css')).read()
global_css = open(os.path.join(root_dir, 'src/styles/global.css')).read()
react_runtime = open(os.path.join(root_dir, 'scripts/react_runtime.js')).read()
compiled_app = open('/tmp/compiled_app.js').read()

html_bundle = f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Quorum — Group-Aware Event Recommendation for College Clubs</title>
    <link
      href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Silkscreen:wght@400;700&display=swap"
      rel="stylesheet"
      media="print"
      onload="this.media='all'"
    />
    <style>
{tokens_css}
{global_css}
    </style>
  </head>
  <body class="canvas-grid-bg">
    <div id="root"></div>
    <script>
{react_runtime}
{compiled_app}
(function mountApp() {{
  const rootEl = document.getElementById('root');
  if (rootEl) {{
    createRoot(rootEl).render(React.createElement(App, null));
  }}
}})();
    </script>
  </body>
</html>
"""

dist_path = os.path.join(root_dir, 'dist/index.html')
canvas_out = os.path.join(root_dir, 'artifacts/file_generation/ttl=63d/output/quorum-landing-page.html')
intermediate_out = os.path.join(root_dir, 'artifacts/file_generation/ttl=63d/intermediate/quorum-landing-page.html')

for p in [dist_path, canvas_out, intermediate_out]:
    with open(p, 'w', encoding='utf-8') as f:
        f.write(html_bundle)

zip_path = os.path.join(root_dir, 'artifacts/file_generation/ttl=63d/output/quorum-javascript-project.zip')
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for include_item in ['package.json', 'vite.config.js', 'index.html', 'prd.md', 'design.md']:
        full_p = os.path.join(root_dir, include_item)
        if os.path.exists(full_p):
            zf.write(full_p, arcname=include_item)
    for folder in ['src', 'scripts']:
        folder_p = os.path.join(root_dir, folder)
        for dirpath, _, filenames in os.walk(folder_p):
            for fn in filenames:
                fp = os.path.join(dirpath, fn)
                rel = os.path.relpath(fp, root_dir)
                zf.write(fp, arcname=rel)

print("Rebuilt dist/index.html successfully!")
