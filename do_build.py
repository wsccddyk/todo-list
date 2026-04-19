import subprocess, os, sys

os.environ['CSC_IDENTITY_AUTO_DISCOVERY'] = 'false'
os.environ['ELECTRON_SKIP_SIGNING'] = 'true'

log_path = r'C:\Users\Admin\WorkBuddy\20260416094716\calendar-app\build_out.txt'
result = subprocess.run(
    [r'F:\nodejs\npx.cmd', 'electron-builder', '--win', '--x64', '--publish=never'],
    cwd=r'C:\Users\Admin\WorkBuddy\20260416094716\calendar-app',
    capture_output=True, text=True, encoding='utf-8', errors='replace'
)

with open(log_path, 'w', encoding='utf-8') as f:
    f.write('=== STDOUT ===\n')
    f.write(result.stdout)
    f.write('\n=== STDERR ===\n')
    f.write(result.stderr)
    f.write(f'\n=== EXIT CODE: {result.returncode} ===\n')

print(f'Done! Exit code: {result.returncode}')
sys.exit(result.returncode)
