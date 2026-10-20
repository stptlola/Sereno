"""Crée les étiquettes, les jalons (MVP, V2, V3, V4) et une issue GitHub par ticket.

Usage : GITHUB_TOKEN=xxx python3 scripts/creer-issues.py
Le jeton doit avoir le droit « Issues : lecture et écriture » sur ce dépôt.
Le script peut être relancé : il saute les issues dont le titre existe déjà.
"""
import json, os, time, urllib.request, urllib.error

REPO = "stptlola/Sereno"
API = f"https://api.github.com/repos/{REPO}"
TOKEN = os.environ["GITHUB_TOKEN"]
COLORS = {"MVP": "2e7d32", "V2": "1565c0", "V3": "6a1b9a", "V4": "616161"}

def call(method, url, data=None):
    req = urllib.request.Request(API + url, method=method,
        data=json.dumps(data).encode() if data else None,
        headers={"Authorization": f"Bearer {TOKEN}", "Accept": "application/vnd.github+json"})
    for _ in range(5):
        try:
            return json.load(urllib.request.urlopen(req))
        except urllib.error.HTTPError as e:
            if e.code == 422:  # existe déjà
                return None
            if e.code in (403, 429) and "rate" in e.read().decode().lower():
                time.sleep(60); continue
            raise

tickets = json.load(open(os.path.join(os.path.dirname(__file__), "issues.json"), encoding="utf-8"))
for v, c in COLORS.items():
    call("POST", "/labels", {"name": v, "color": c, "description": f"Version {v}"})
for m in sorted({t["module"] for t in tickets}):
    call("POST", "/labels", {"name": m, "color": "c9a45c"})
milestones = {}
for v in COLORS:
    r = call("POST", "/milestones", {"title": v})
    if r is None:
        r = next(m for m in call("GET", "/milestones?state=all&per_page=100") if m["title"] == v)
    milestones[v] = r["number"]
existing, page = set(), 1
while True:
    batch = call("GET", f"/issues?state=all&per_page=100&page={page}")
    if not batch: break
    existing |= {i["title"] for i in batch}; page += 1
for i, t in enumerate(tickets, 1):
    if t["title"] in existing: continue
    call("POST", "/issues", {"title": t["title"], "body": t["body"],
        "labels": [t["version"], t["module"]], "milestone": milestones[t["version"]]})
    print(f"{i}/{len(tickets)} {t['title']}")
    time.sleep(1.2)
print("Terminé.")
