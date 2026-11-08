import json
from pathlib import Path

from app.main import app

output_path = Path(__file__).resolve().parents[2] / "shared" / "openapi.json"
output_path.write_text(
    json.dumps(app.openapi(), ensure_ascii=False, indent=2, sort_keys=True) + "\n",
    encoding="utf-8",
)
