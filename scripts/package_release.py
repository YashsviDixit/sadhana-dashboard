"""Package only an explicit public-file allowlist. No private reports or real data."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    'START-HERE.md',
    'examples/roster.csv', 'examples/responses.csv',
    'dist/index.html', 'dist/style.css', 'dist/help.css', 'dist/help-short.css',
    'dist/distribution.css', 'dist/app.js', 'dist/engine.js', 'dist/help.js',
    'dist/mentor-tools.js', 'dist/mentor-tools.css',
    'dist/session.js', 'dist/vendor/xlsx.full.min.js', 'dist/vendor/LICENSE',
]

def main():
    for name in FILES:
        if not (ROOT / name).is_file():
            raise SystemExit('Missing release file: ' + name)
    destination = ROOT.parent / 'releases'
    destination.mkdir(exist_ok=True)
    archive = destination / 'sadhana-mentor-dashboard-0.1.0.zip'
    with ZipFile(str(archive), 'w', ZIP_DEFLATED) as output:
        for name in FILES:
            output.write(str(ROOT / name), 'sadhana-mentor-dashboard-0.1.0/' + name)
    print(str(archive))

if __name__ == '__main__':
    main()
