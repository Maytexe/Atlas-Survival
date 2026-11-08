default:
    @Write-Host "ATLAS: use 'just backend-check', 'just frontend-check', 'just e2e' or 'just all'"

backend-check:
    powershell -NoLogo -NoProfile -Command "Set-Location backend; uv run ruff check .; uv run mypy .; uv run pytest"

frontend-check:
    powershell -NoLogo -NoProfile -Command "Set-Location frontend; npm run lint; npm run typecheck; npm run test; npm run build"

e2e:
    powershell -NoLogo -NoProfile -Command "Set-Location frontend; npm run e2e"

all: backend-check frontend-check e2e
